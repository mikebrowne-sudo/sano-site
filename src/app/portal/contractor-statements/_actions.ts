'use server'

// Staff-only draft contractor statements — generation + refresh.
//
// Groups approved, unpaid, unremitted, un-statemented contractor_invoices for a
// selected CLOSED period into one draft statement per contractor. Manually
// triggered by staff (admin). NO cron, NO issuance, NO contractor visibility,
// NO remittance creation, NO notifications — this is the draft foundation only.
//
// Eligibility per CI:
//   1. resolved service date exists (job.completed_at | service_date | gst_supply_date)
//   2. service date ≤ period_end  (carried-forward = service date < period_start)
//   3. status='approved', not void, not paid
//   4. statement_id is null (not already on a statement)
//   5. not already in a remittance
// Idempotent: refreshing a draft ADDS newly-eligible lines, never removes them,
// and keeps the statement number. A statement past 'draft' is left untouched.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { resolveContractorServiceDate } from '@/lib/contractor-service-date'
import { toNzCalendarDate } from '@/lib/contractor-statement-period'
import { buildDraftGroups, type EligibleLine, GST_CONFIRMED_STATUS } from '@/lib/contractor-statement-build'

const round2 = (n: number) => Math.round(n * 100) / 100

export interface GeneratePeriodInput {
  period_start: string
  period_end: string
}

export interface GenerateResult {
  error?: string
  created?: number
  refreshed?: number
  skipped?: Array<{ statement_number: string; status: string }>
  drafts?: number
  linked_cis?: number
}

interface CiRow {
  id: string
  contractor_id: string
  invoice_number: string | null
  amount: number
  gst_status: string | null
  gst_amount: number | null
  job_id: string | null
  service_date: string | null
  gst_supply_date: string | null
  contractors: { full_name: string | null } | null
  jobs: { completed_at: string | null } | null
}

export async function generateDraftStatements(input: GeneratePeriodInput): Promise<GenerateResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { error: 'Admin only.' }

  const period = { period_start: input.period_start, period_end: input.period_end }
  if (!period.period_start || !period.period_end || period.period_start > period.period_end) {
    return { error: 'A valid period is required.' }
  }

  // Approved, unpaid, un-statemented CIs (the eligibility universe).
  const { data: ciRows, error: ciErr } = await supabase
    .from('contractor_invoices')
    .select('id, contractor_id, invoice_number, amount, gst_status, gst_amount, job_id, service_date, gst_supply_date, contractors(full_name), jobs(completed_at)')
    .eq('status', 'approved')
    .is('statement_id', null)
    .is('date_paid', null)
  if (ciErr) return { error: `Could not load payables: ${ciErr.message}` }

  // Exclude anything already snapshotted into a remittance.
  const { data: remittedRows } = await supabase
    .from('contractor_remittance_items')
    .select('contractor_invoice_id')
    .not('contractor_invoice_id', 'is', null)
  const remitted = new Set((remittedRows ?? []).map((r) => r.contractor_invoice_id as string))

  // Resolve each CI's service date; keep only those on/before period_end.
  const eligible: EligibleLine[] = []
  for (const row of (ciRows ?? []) as unknown as CiRow[]) {
    if (remitted.has(row.id)) continue
    const resolved = resolveContractorServiceDate({
      job_id: row.job_id,
      job_completed_at_nz: toNzCalendarDate(row.jobs?.completed_at ?? null),
      service_date: row.service_date,
      gst_supply_date: row.gst_supply_date,
    })
    if (!resolved.date) continue // missing service date → excluded (surfaced in the report)
    if (resolved.date > period.period_end) continue // future/open period
    eligible.push({
      id: row.id,
      contractor_id: row.contractor_id,
      contractor_name: row.contractors?.full_name ?? null,
      invoice_number: row.invoice_number,
      amount: Number(row.amount),
      gst_status: row.gst_status,
      gst_amount: row.gst_amount == null ? null : Number(row.gst_amount),
      service_date: resolved.date,
    })
  }

  const groups = buildDraftGroups(eligible, period)

  let created = 0
  let refreshed = 0
  let linkedCis = 0
  const skipped: Array<{ statement_number: string; status: string }> = []

  for (const group of groups) {
    // Find an existing ACTIVE (non-superseded) statement for this contractor+period.
    const { data: existing } = await supabase
      .from('contractor_statements')
      .select('id, status, statement_number, subtotal')
      .eq('contractor_id', group.contractor_id)
      .eq('period_start', period.period_start)
      .eq('period_end', period.period_end)
      .neq('status', 'superseded')
      .maybeSingle()

    if (existing && existing.status !== 'draft') {
      skipped.push({ statement_number: existing.statement_number as string, status: existing.status as string })
      continue
    }

    let statementId = existing?.id as string | undefined
    let statementNumber = existing?.statement_number as string | undefined
    let isNew = false

    if (!statementId) {
      const ins = await supabase
        .from('contractor_statements')
        .insert({
          contractor_id: group.contractor_id,
          period_start: period.period_start,
          period_end: period.period_end,
          status: 'draft',
          subtotal: 0,
          gst_total: 0,
          total_payable: 0,
          created_by: user.id,
        })
        .select('id, statement_number')
        .single()
      if (ins.error) {
        // Concurrent generation — the partial unique index rejected the race.
        // Re-fetch the winner and treat this as a refresh.
        const { data: raced } = await supabase
          .from('contractor_statements')
          .select('id, status, statement_number')
          .eq('contractor_id', group.contractor_id)
          .eq('period_start', period.period_start)
          .eq('period_end', period.period_end)
          .neq('status', 'superseded')
          .maybeSingle()
        if (!raced || raced.status !== 'draft') {
          if (raced) skipped.push({ statement_number: raced.statement_number as string, status: raced.status as string })
          continue
        }
        statementId = raced.id as string
        statementNumber = raced.statement_number as string
      } else {
        statementId = ins.data.id as string
        statementNumber = ins.data.statement_number as string
        isNew = true
      }
    }

    // Link this contractor's eligible lines that aren't already on a statement.
    const { data: linked } = await supabase
      .from('contractor_invoices')
      .update({ statement_id: statementId })
      .in('id', group.lines.map((l) => l.id))
      .eq('status', 'approved')
      .is('statement_id', null)
      .select('id')
    const addedIds = (linked ?? []).map((r) => r.id as string)
    linkedCis += addedIds.length

    // Recompute totals from ALL lines now on the statement (refresh-safe).
    const { data: allLines } = await supabase
      .from('contractor_invoices')
      .select('amount, gst_status, gst_amount')
      .eq('statement_id', statementId)
    const rows = allLines ?? []
    const subtotal = round2(rows.reduce((s, l) => s + Number(l.amount), 0))
    const gstTotal = round2(rows.reduce((s, l) => (l.gst_status === GST_CONFIRMED_STATUS ? s + Number(l.gst_amount ?? 0) : s), 0))

    const changed = isNew || addedIds.length > 0
    if (changed) {
      await supabase
        .from('contractor_statements')
        .update({ subtotal, gst_total: gstTotal, total_payable: subtotal, updated_at: new Date().toISOString() })
        .eq('id', statementId)
    }

    if (isNew) {
      created += 1
      await supabase.from('audit_log').insert({
        actor_id: user.id,
        actor_role: 'admin',
        action: 'contractor_statement.created',
        entity_table: 'contractor_statements',
        entity_id: statementId,
        before: null,
        after: {
          statement_number: statementNumber,
          contractor_id: group.contractor_id,
          period_start: period.period_start,
          period_end: period.period_end,
          ci_ids: addedIds,
          subtotal,
          gst_total: gstTotal,
          total_payable: subtotal,
        },
      })
    } else if (addedIds.length > 0) {
      refreshed += 1
      await supabase.from('audit_log').insert({
        actor_id: user.id,
        actor_role: 'admin',
        action: 'contractor_statement.refreshed',
        entity_table: 'contractor_statements',
        entity_id: statementId,
        before: { subtotal: existing?.subtotal ?? null },
        after: {
          statement_number: statementNumber,
          ci_ids_added: addedIds,
          subtotal,
          gst_total: gstTotal,
          total_payable: subtotal,
        },
      })
    }

    if (addedIds.length > 0) {
      await supabase.from('audit_log').insert({
        actor_id: user.id,
        actor_role: 'admin',
        action: 'contractor_invoice.linked_to_statement',
        entity_table: 'contractor_statements',
        entity_id: statementId,
        before: null,
        after: { statement_number: statementNumber, ci_ids: addedIds },
      })
    }
  }

  revalidatePath('/portal/contractor-statements')
  return {
    created,
    refreshed,
    skipped: skipped.length ? skipped : undefined,
    drafts: groups.length,
    linked_cis: linkedCis,
  }
}
