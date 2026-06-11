'use server'

// Phase E.1 — contractor pay run lifecycle.
//
// Three actions: createContractorPayRun · approveContractorPayRun ·
// markContractorPayRunPaid. All admin-only.
//
// Eligibility window for inclusion (documented choice):
//   approved_at BETWEEN period_start AND period_end (inclusive)
//
// Rationale: approved_at is a timestamptz set by
// approveJobWorkerHours (the per-worker "Approve for pay" step), so it
// always exists for eligible rows. The payable amount is recomputed at
// run time as (allowed hours + admin-approved extra) × pay_rate — see
// the inline note on the eligibility query below.
//
// Concurrency note: the eligibility query + insert are not in a
// single transaction (Supabase JS doesn't expose explicit txns at
// this level). To prevent the same row landing in two pay runs we
// flip job_workers.pay_status='included_in_pay_run' immediately
// after inserting pay_run_items; subsequent eligibility queries
// only pick rows still on 'approved'. Race-condition risk is low
// because admin is a single user.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isAdminEmail } from '@/lib/is-admin'

// ─── Create ─────────────────────────────────────────────────────

export interface CreateContractorPayRunInput {
  period_start: string  // YYYY-MM-DD
  period_end: string    // YYYY-MM-DD
  notes?: string | null
}

export async function createContractorPayRun(
  input: CreateContractorPayRunInput,
): Promise<{ ok: true; payRunId: string } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminEmail(user.email)) return { error: 'Admin only.' }

  if (!input.period_start || !input.period_end) {
    return { error: 'Period start and end are required.' }
  }
  if (input.period_start > input.period_end) {
    return { error: 'Period end must be on or after period start.' }
  }

  // Eligibility — approved within the window, not yet in any pay run,
  // job not archived. Joining jobs lets us filter deleted_at + read
  // the job's allowed_hours fallback without a follow-up query.
  //
  // Allowed-hours model (2026-06): the payable figure is recomputed
  // here from source — (this worker's hours_allocated, falling back to
  // the job's allowed_hours) + any admin-APPROVED extra hours — rather
  // than trusting the approved_hours snapshot. This keeps the pay run
  // correct even when extra hours were signed off after pay approval.
  type Eligible = {
    contractor_id: string
    job_id: string
    pay_rate: number | null
    hours_allocated: number | null
    extra_hours: number | null
    extra_hours_status: string | null
    jobs: { id: string; deleted_at: string | null; allowed_hours: number | null } | null
  }

  // approved_at is a timestamptz; bound the window with the start
  // of the start day and the end of the end day so the inclusive
  // range matches what staff expect.
  const startOfPeriod = `${input.period_start}T00:00:00Z`
  const endOfPeriod   = `${input.period_end}T23:59:59Z`

  const { data: rowsRaw, error: readErr } = await supabase
    .from('job_workers')
    .select(`
      contractor_id, job_id, pay_rate, hours_allocated, extra_hours, extra_hours_status,
      jobs!inner ( id, deleted_at, allowed_hours )
    `)
    .eq('pay_status', 'approved')
    .gte('approved_at', startOfPeriod)
    .lte('approved_at', endOfPeriod)
  if (readErr) {
    return { error: `Could not load eligible rows: ${readErr.message}` }
  }

  // Payable hours = allowed (worker, then job) + approved extra.
  const payableHoursFor = (r: Eligible): number => {
    const allowed = r.hours_allocated ?? r.jobs?.allowed_hours ?? 0
    const approvedExtra = r.extra_hours_status === 'approved' ? (r.extra_hours ?? 0) : 0
    return Math.round((allowed + approvedExtra) * 100) / 100
  }

  const eligible = ((rowsRaw ?? []) as unknown as Eligible[])
    .filter((r) => r.jobs && !r.jobs.deleted_at)
    .filter((r) => r.pay_rate != null && payableHoursFor(r) > 0)

  if (eligible.length === 0) {
    return { error: 'No approved hours fall in this period. Approve hours from a completed job first.' }
  }

  // Pay run header.
  const today = new Date().toISOString().slice(0, 10)
  const { data: payRun, error: prErr } = await supabase
    .from('pay_runs')
    .insert({
      pay_period_start: input.period_start,
      pay_period_end: input.period_end,
      pay_date: today,
      status: 'draft',
      kind: 'contractor',
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single()
  if (prErr || !payRun) {
    return { error: `Failed to create pay run: ${prErr?.message ?? 'insert returned no row'}` }
  }

  // Items. approved_hours on the item records the payable hours that
  // were actually paid (allowed + approved extra) at run time.
  const items = eligible.map((r) => {
    const hours = payableHoursFor(r)
    const rate = r.pay_rate ?? 0
    return {
      pay_run_id: payRun.id,
      job_id: r.job_id,
      contractor_id: r.contractor_id,
      approved_hours: hours,
      pay_rate: rate,
      amount: Math.round(hours * rate * 100) / 100,
      status: 'pending',
    }
  })
  const { error: piErr } = await supabase.from('pay_run_items').insert(items)
  if (piErr) {
    // Roll back the empty header so we don't leave an orphan.
    await supabase.from('pay_runs').delete().eq('id', payRun.id)
    return { error: `Failed to insert pay run items: ${piErr.message}` }
  }

  // Flip job_workers in one go using OR of (job_id, contractor_id)
  // pairs. Supabase JS doesn't accept composite IN, so we do it
  // per-pair. Cheap — typical pay runs are <100 rows.
  for (const r of eligible) {
    await supabase
      .from('job_workers')
      .update({ pay_status: 'included_in_pay_run' })
      .eq('job_id', r.job_id)
      .eq('contractor_id', r.contractor_id)
      .eq('pay_status', 'approved') // race guard
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'pay_run.created',
    entity_table: 'pay_runs',
    entity_id: payRun.id,
    before: null,
    after: {
      kind: 'contractor',
      period_start: input.period_start,
      period_end: input.period_end,
      item_count: items.length,
      total_amount: items.reduce((s, i) => s + (i.amount ?? 0), 0),
    },
  })

  revalidatePath('/portal/payroll')
  revalidatePath('/portal/payroll/contractor-pending')
  revalidatePath('/portal/payroll/contractor-runs')
  return { ok: true, payRunId: payRun.id as string }
}

// ─── Approve ────────────────────────────────────────────────────

export async function approveContractorPayRun(payRunId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminEmail(user.email)) return { error: 'Admin only.' }
  if (!payRunId) return { error: 'Pay run id is required.' }

  const { data: prior, error: readErr } = await supabase
    .from('pay_runs')
    .select('id, status, kind')
    .eq('id', payRunId)
    .single()
  if (readErr || !prior) return { error: 'Pay run not found.' }
  if (prior.kind !== 'contractor') {
    return { error: 'Only contractor pay runs can be approved here.' }
  }
  if (prior.status !== 'draft') {
    return { error: `Only draft pay runs can be approved (current: ${prior.status}).` }
  }

  const now = new Date().toISOString()
  const { error: updErr } = await supabase
    .from('pay_runs')
    .update({ status: 'approved', approved_at: now, approved_by: user.id })
    .eq('id', payRunId)
    .eq('status', 'draft') // race guard
  if (updErr) return { error: `Failed to approve pay run: ${updErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'pay_run.approved',
    entity_table: 'pay_runs',
    entity_id: payRunId,
    before: { status: 'draft' },
    after: { status: 'approved', approved_at: now, approved_by: user.id },
  })

  revalidatePath('/portal/payroll')
  revalidatePath('/portal/payroll/contractor-runs')
  revalidatePath(`/portal/payroll/contractor-runs/${payRunId}`)
  return { ok: true as const }
}

// ─── Mark paid ──────────────────────────────────────────────────

export async function markContractorPayRunPaid(payRunId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminEmail(user.email)) return { error: 'Admin only.' }
  if (!payRunId) return { error: 'Pay run id is required.' }

  const { data: prior, error: readErr } = await supabase
    .from('pay_runs')
    .select('id, status, kind')
    .eq('id', payRunId)
    .single()
  if (readErr || !prior) return { error: 'Pay run not found.' }
  if (prior.kind !== 'contractor') {
    return { error: 'Only contractor pay runs can be marked paid here.' }
  }
  if (prior.status !== 'approved') {
    return { error: `Only approved pay runs can be marked paid (current: ${prior.status}).` }
  }

  // Need the items first so we can flip the linked job_workers.
  const { data: items } = await supabase
    .from('pay_run_items')
    .select('id, job_id, contractor_id')
    .eq('pay_run_id', payRunId)
  const itemList = items ?? []

  const now = new Date().toISOString()

  const { error: updRunErr } = await supabase
    .from('pay_runs')
    .update({ status: 'paid', paid_at: now, paid_by: user.id })
    .eq('id', payRunId)
    .eq('status', 'approved')
  if (updRunErr) return { error: `Failed to mark pay run paid: ${updRunErr.message}` }

  await supabase
    .from('pay_run_items')
    .update({ status: 'paid' })
    .eq('pay_run_id', payRunId)

  for (const it of itemList) {
    await supabase
      .from('job_workers')
      .update({ pay_status: 'paid' })
      .eq('job_id', it.job_id)
      .eq('contractor_id', it.contractor_id)
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'pay_run.paid',
    entity_table: 'pay_runs',
    entity_id: payRunId,
    before: { status: 'approved' },
    after: {
      status: 'paid',
      paid_at: now,
      paid_by: user.id,
      item_count: itemList.length,
    },
  })

  revalidatePath('/portal/payroll')
  revalidatePath('/portal/payroll/contractor-runs')
  revalidatePath(`/portal/payroll/contractor-runs/${payRunId}`)
  return { ok: true as const }
}

// ─── Form submission helper for the new-pay-run page ────────────

/**
 * Wraps createContractorPayRun and redirects to the detail page on
 * success, or returns the error so the form can render it. Used as
 * the `action` of the new-pay-run form.
 */
export async function submitNewContractorPayRun(formData: FormData): Promise<{ error: string } | void> {
  const result = await createContractorPayRun({
    period_start: String(formData.get('period_start') || ''),
    period_end:   String(formData.get('period_end')   || ''),
    notes:        String(formData.get('notes') || '') || null,
  })
  if ('error' in result) return { error: result.error }
  redirect(`/portal/payroll/contractor-runs/${result.payRunId}`)
}
