// Auto-approve contractor pay for RECURRING occurrences.
//
// A job generated from a recurring schedule (jobs.recurring_job_id) is routine,
// agreed work at an agreed rate, so when it is marked complete its contractor
// payable is approved automatically — no Pending-approvals click. Anything that
// needs a human decision is left alone and stays in Pending approvals exactly
// as before:
//
//   • the schedule pays its contractor MONTHLY (contractor_monthly_pay, raised
//     by ensureContractorPayable) — approving each visit as well would
//     double-pay. Per-visit contractor mode is NOT monthly: each completed
//     visit is approved here at its set amount.
//   • a retainer worker row (not payable per occurrence)
//   • a pending extra-hours claim (staff must accept or decline it first)
//   • no usable rate or hours
//
// Every write goes through approveContractorPayCore, so the same guards apply
// as the manual button (including one payable per job + contractor). Safe to
// re-run: an already-approved job is reported as skipped, never duplicated.

import type { SupabaseClient } from '@supabase/supabase-js'
import { approveContractorPayCore } from '@/lib/approve-contractor-pay-core'
import { isPayablePerOccurrence, isSetAmountPerVisit } from '@/lib/job-worker-pay-basis'
import { getWorkerPayableHours } from '@/lib/job-cost'

export interface ScheduleContractorPay {
  contractor_pay_mode: string | null
  contractor_monthly_pay: number | string | null
  contractor_per_visit_rate: number | string | null
}

/** True when the schedule raises its own (monthly) contractor payable. */
export function scheduleHasMonthlyContractorPayable(rec: ScheduleContractorPay): boolean {
  // Per-visit mode is paid per completed visit (approved here), never monthly.
  if (rec.contractor_pay_mode === 'per_visit') return false
  return Number(rec.contractor_monthly_pay) > 0
}

export interface AutoApproveWorker {
  pay_type: string | null
  pay_rate: number | null
  hours_allocated: number | null
  extra_hours: number | null
  extra_hours_status: string | null
}

/** Why this worker row can't be auto-approved, or null when it can. */
export function autoApproveBlocker(jw: AutoApproveWorker, profileRate: number | null): string | null {
  if (!isPayablePerOccurrence(jw.pay_type)) return 'retainer'
  if (jw.extra_hours_status === 'pending') return 'extra hours awaiting review'
  if (isSetAmountPerVisit(jw.pay_type)) {
    return Number(jw.pay_rate) > 0 ? null : 'no per-visit amount'
  }
  const rate = jw.pay_rate ?? profileRate
  if (!(Number(rate) > 0)) return 'no pay rate'
  const hours = getWorkerPayableHours({ ...jw, approved_hours: null, actual_hours: null })
  if (!(Number(hours) > 0)) return 'no hours'
  return null
}

export interface AutoApproveResult {
  approved: number
  skipped: string[]
  errors: string[]
}

export async function autoApproveRecurringJobPay(
  svc: SupabaseClient,
  jobId: string,
): Promise<AutoApproveResult> {
  const out: AutoApproveResult = { approved: 0, skipped: [], errors: [] }

  const { data: job } = await svc
    .from('jobs')
    .select('id, job_number, status, deleted_at, recurring_job_id')
    .eq('id', jobId)
    .maybeSingle()
  if (!job?.recurring_job_id) { out.skipped.push('not a recurring occurrence'); return out }
  if (job.deleted_at) { out.skipped.push('archived'); return out }
  if (job.status !== 'completed' && job.status !== 'invoiced') { out.skipped.push('not completed'); return out }

  const { data: rec } = await svc
    .from('recurring_jobs')
    .select('contractor_pay_mode, contractor_monthly_pay, contractor_per_visit_rate')
    .eq('id', job.recurring_job_id)
    .maybeSingle()
  if (!rec) { out.skipped.push('schedule not found'); return out }
  if (scheduleHasMonthlyContractorPayable(rec as ScheduleContractorPay)) {
    out.skipped.push('schedule pays contractor monthly')
    return out
  }

  const { data: workers } = await svc
    .from('job_workers')
    .select('contractor_id, pay_type, pay_rate, hours_allocated, extra_hours, extra_hours_status, contractors ( hourly_rate )')
    .eq('job_id', jobId)

  type WorkerRow = AutoApproveWorker & {
    contractor_id: string
    contractors: { hourly_rate: number | null } | Array<{ hourly_rate: number | null }> | null
  }
  for (const w of (workers ?? []) as unknown as WorkerRow[]) {
    const label = `${job.job_number ?? jobId}/${w.contractor_id}`
    const profile = Array.isArray(w.contractors) ? w.contractors[0] : w.contractors
    const blocker = autoApproveBlocker(w, profile?.hourly_rate ?? null)
    if (blocker) { out.skipped.push(`${label}: ${blocker}`); continue }

    const res = await approveContractorPayCore(svc, jobId, w.contractor_id, {}, { id: null, source: 'recurring_auto_approve' })
    if (res.ok) out.approved++
    else if (res.alreadyApprovedId || /already approved/i.test(res.error ?? '')) out.skipped.push(`${label}: already approved`)
    else out.errors.push(`${label}: ${res.error}`)
  }
  return out
}

/**
 * Cron backstop. Approves every completed recurring occurrence (last `days`
 * days) that still has no contractor payable — catches completions whose
 * inline auto-approve failed, and jobs completed by any other path.
 */
export async function autoApproveCompletedRecurringJobs(
  svc: SupabaseClient,
  sinceIso: string,
): Promise<AutoApproveResult & { scanned: number }> {
  const total = { approved: 0, skipped: [] as string[], errors: [] as string[], scanned: 0 }

  const { data: jobs, error } = await svc
    .from('jobs')
    .select('id')
    .not('recurring_job_id', 'is', null)
    .in('status', ['completed', 'invoiced'])
    .is('deleted_at', null)
    .gte('completed_at', sinceIso)
  if (error) { total.errors.push(`query: ${error.message}`); return total }

  const ids = (jobs ?? []).map((j) => j.id as string)
  if (ids.length === 0) return total

  // Only jobs with NO job-level payable yet (extras don't count).
  const { data: existing } = await svc
    .from('contractor_invoices')
    .select('job_id')
    .in('job_id', ids)
    .is('job_item_id', null)
    .neq('status', 'void')
  const paid = new Set((existing ?? []).map((r) => r.job_id as string))

  for (const id of ids) {
    if (paid.has(id)) continue
    total.scanned++
    const r = await autoApproveRecurringJobPay(svc, id)
    total.approved += r.approved
    total.errors.push(...r.errors)
  }
  return total
}
