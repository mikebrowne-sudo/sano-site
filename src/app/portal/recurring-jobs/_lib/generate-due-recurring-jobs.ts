// Rolling auto-generation of recurring job occurrences.
//
// Called once a day by the daily cron. Keeps every ACTIVE recurring contract
// topped up with a rolling window of future occurrences, so "set the contract
// active" is genuinely all a staff member has to do — no coming back every few
// weeks to click Generate.
//
// This is the JOB counterpart to generate-recurring-invoice.ts (which the same
// cron already runs for invoices).
//
// Design notes:
//
//   • HORIZON, not "next N". Each run tops the contract up to a fixed number of
//     days ahead. Re-running is idempotent: dates that already have an
//     occurrence are skipped, so a second run the same day creates nothing.
//
//   • Duplicate prevention matches on (recurring_job_id, scheduled_date), the
//     same key the manual generator uses. Occurrences created by hand BEFORE a
//     contract existed carry recurring_job_id = NULL and are invisible to this
//     check — which is why a contract's start_date must be set after any
//     manually-created jobs. Guarding that is the caller's job, not this one's.
//
//   • Never advances past end_date, and never touches a paused contract.
//
//   • A failure on one contract must not stop the others: every contract is
//     tried, and failures are collected into the result.

import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveAllowedHours } from '@/lib/allowed-hours'
import { buildRecurringWorkerRow, type RecurringPayType } from '@/lib/recurring-worker'
import { pickClientRate, type ClientRateRecord } from '@/lib/contractor-client-rate'

/** How far ahead to keep occurrences generated. */
export const AUTO_GENERATE_HORIZON_DAYS = 42 // six weeks

export interface GenerateDueJobsResult {
  contractsConsidered: number
  createdCount: number
  skippedCount: number
  errors: string[]
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function addMonthsIso(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

/** Occurrence dates for one contract, from `cursor` up to and including `stopAt`. */
export function occurrenceDates(
  frequency: string,
  cursor: string,
  stopAt: string,
  /** Hard cap so a bad frequency/date combination can never loop unbounded. */
  maxDates = 400,
): string[] {
  const stepDays = frequency === 'weekly' ? 7 : frequency === 'fortnightly' ? 14 : null
  const stepMonths = frequency === 'monthly' ? 1 : null
  if (!stepDays && !stepMonths) return []

  const dates: string[] = []
  let d = cursor
  while (d <= stopAt && dates.length < maxDates) {
    dates.push(d)
    d = stepDays ? addDaysIso(d, stepDays) : addMonthsIso(d, stepMonths!)
  }
  return dates
}

const RECURRING_SELECT =
  'id, client_id, title, description, address, scheduled_time, duration_estimate, ' +
  'contractor_id, contractor_pay_type, assigned_to, frequency, start_date, end_date, ' +
  'next_due_date, last_generated_date, status, scope_snapshot, contractor_rate_override, ' +
  'contractor_pay_mode, contractor_per_visit_rate'

export async function generateDueRecurringJobs(
  supabase: SupabaseClient,
  todayIso: string,
  horizonDays: number = AUTO_GENERATE_HORIZON_DAYS,
): Promise<GenerateDueJobsResult> {
  const result: GenerateDueJobsResult = {
    contractsConsidered: 0,
    createdCount: 0,
    skippedCount: 0,
    errors: [],
  }

  const { data: contractRows, error } = await supabase
    .from('recurring_jobs')
    .select(RECURRING_SELECT)
    .eq('status', 'active')

  if (error) {
    result.errors.push(`load contracts: ${error.message}`)
    return result
  }

  // The select string is built as a constant, so the client cannot infer row
  // shapes from it; read the rows as loose records.
  const contracts = (contractRows ?? []) as unknown as Record<string, unknown>[]

  const horizon = addDaysIso(todayIso, horizonDays)

  for (const rec of contracts) {
    result.contractsConsidered += 1
    const recId = rec.id as string
    const label = (rec.title as string | null) || recId

    try {
      const startDate = (rec.next_due_date as string | null) ?? (rec.start_date as string | null)
      if (!startDate) {
        result.errors.push(`${label}: no start_date or next_due_date`)
        continue
      }

      const endDate = rec.end_date as string | null
      const stopAt = endDate && endDate < horizon ? endDate : horizon

      // Never back-fill: start from the contract's own cursor, or today if that
      // cursor is in the past. A contract that has not been generated for weeks
      // should resume from now, not create a pile of overdue jobs.
      const cursor = startDate < todayIso ? todayIso : startDate
      const candidates = occurrenceDates(rec.frequency as string, cursor, stopAt)

      if (candidates.length === 0) {
        // Either an unsupported frequency or nothing due in the window.
        const supported = ['weekly', 'fortnightly', 'monthly'].includes(rec.frequency as string)
        if (!supported) {
          result.errors.push(`${label}: unsupported frequency "${rec.frequency}"`)
        }
        continue
      }

      const { data: existing } = await supabase
        .from('jobs')
        .select('scheduled_date')
        .eq('recurring_job_id', recId)
        .in('scheduled_date', candidates)
      const already = new Set((existing ?? []).map((r) => r.scheduled_date as string))

      const newDates = candidates.filter((d) => !already.has(d))
      result.skippedCount += candidates.length - newDates.length
      if (newDates.length === 0) continue

      // Contractor rate context, resolved once per contract.
      const allowedHours = resolveAllowedHours(null, rec.duration_estimate as string | null)
      const payType: RecurringPayType =
        (rec.contractor_pay_type as RecurringPayType) === 'fixed' ? 'fixed' : 'hourly'

      let contractorRate: number | null = null
      let clientRateHistory: ClientRateRecord[] = []
      if (rec.contractor_id) {
        const override = rec.contractor_rate_override as number | null
        if (override != null) {
          contractorRate = Number(override)
        } else {
          const { data: c } = await supabase
            .from('contractors')
            .select('hourly_rate')
            .eq('id', rec.contractor_id)
            .single()
          contractorRate = (c?.hourly_rate as number | null) ?? null

          if (rec.client_id) {
            try {
              const { data: rates } = await supabase
                .from('contractor_client_rates')
                .select('hourly_rate, effective_from, effective_to, status')
                .eq('contractor_id', rec.contractor_id)
                .eq('client_id', rec.client_id)
                .eq('status', 'active')
              clientRateHistory = (rates ?? []).map((r) => ({
                hourlyRate: r.hourly_rate as number | string | null,
                effectiveFrom: r.effective_from as string,
                effectiveTo: (r.effective_to as string | null) ?? null,
                status: (r.status as string | null) ?? null,
              }))
            } catch {
              clientRateHistory = []
            }
          }
        }
      }

      let lastCreated: string | null = null

      for (const date of newDates) {
        const { data: newJob, error: jErr } = await supabase
          .from('jobs')
          .insert({
            client_id: rec.client_id,
            recurring_job_id: recId,
            title: rec.title || null,
            description: rec.description || null,
            address: rec.address || null,
            scheduled_date: date,
            scheduled_time: rec.scheduled_time || null,
            duration_estimate: rec.duration_estimate || null,
            allowed_hours: allowedHours,
            contractor_id: rec.contractor_id || null,
            assigned_to: rec.assigned_to || null,
            scope_snapshot: rec.scope_snapshot ?? null,
            status: rec.contractor_id ? 'assigned' : 'draft',
            payment_status: 'on_account',
          })
          .select('id')
          .single()

        if (jErr || !newJob) {
          result.errors.push(`${label} ${date}: ${jErr?.message ?? 'insert returned no row'}`)
          continue
        }

        // A payable occurrence must have its job_workers row, or the job is
        // invisible to pay. If seeding fails, remove the job rather than leave
        // an occurrence that can never be paid.
        if (rec.contractor_id) {
          const workerRow = buildRecurringWorkerRow({
            jobId: newJob.id as string,
            contractorId: rec.contractor_id as string,
            contractorRate,
            clientRate: pickClientRate(clientRateHistory, date),
            // A per-visit contract pays a SET AMOUNT per occurrence, never
            // hours x rate (NZCL: $126 per clean).
            perVisitRate: rec.contractor_pay_mode === 'per_visit'
              ? (rec.contractor_per_visit_rate as number | null)
              : null,
            allowedHours,
            payType,
          })
          const { error: wErr } = await supabase.from('job_workers').insert(workerRow)
          if (wErr) {
            await supabase.from('jobs').delete().eq('id', newJob.id as string)
            result.errors.push(`${label} ${date}: worker seed failed (${wErr.message}); job rolled back`)
            continue
          }
        }

        result.createdCount += 1
        lastCreated = date
      }

      if (lastCreated) {
        // Advance the cursor to the occurrence AFTER the last one created, so
        // the next run resumes cleanly instead of re-walking the same dates.
        const next = occurrenceDates(rec.frequency as string, lastCreated, addDaysIso(lastCreated, 400), 2)[1] ?? null
        await supabase
          .from('recurring_jobs')
          .update({ last_generated_date: lastCreated, next_due_date: next })
          .eq('id', recId)
      }
    } catch (e) {
      result.errors.push(`${label}: ${(e as Error).message}`)
    }
  }

  return result
}
