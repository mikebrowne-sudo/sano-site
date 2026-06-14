'use server'

// One-click "Pay contractor".
//
// Pays a contractor for all their completed, unpaid, priced jobs in a
// single action: creates a contractor pay run already in the PAID state,
// snapshots the items, flips the workers to paid, and sends the
// remittance. No separate approve-hours / approve-run / mark-paid steps
// — completed + has rate + has hours = payable. Jobs missing a rate or
// hours are skipped (surfaced as "needs pricing" on the screen).

import { createClient } from '@/lib/supabase-server'
import { isAdminEmail } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { sendRemittances } from './contractor-runs/[id]/_actions-remittance'

interface EligibleRow {
  job_id: string
  pay_rate: number | null
  hours_allocated: number | null
  extra_hours: number | null
  extra_hours_status: string | null
  contractors: { hourly_rate: number | null } | null
  jobs: { id: string; completed_at: string | null; scheduled_date: string | null; allowed_hours: number | null; deleted_at: string | null } | null
}

export async function payContractor(contractorId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminEmail(user.email)) return { error: 'Admin only.' }
  if (!contractorId) return { error: 'Contractor is required.' }

  const { data: rowsRaw } = await supabase
    .from('job_workers')
    .select(`
      job_id, pay_rate, hours_allocated, extra_hours, extra_hours_status,
      contractors ( hourly_rate ),
      jobs!inner ( id, completed_at, scheduled_date, allowed_hours, deleted_at )
    `)
    .eq('contractor_id', contractorId)
    .in('pay_status', ['pending', 'approved'])

  const rows = (rowsRaw ?? []) as unknown as EligibleRow[]
  const items: { job_id: string; hours: number; rate: number; amount: number; date: string }[] = []
  for (const r of rows) {
    const j = r.jobs
    if (!j || j.deleted_at || !j.completed_at) continue
    const rate = r.pay_rate ?? r.contractors?.hourly_rate ?? 0
    const allowed = r.hours_allocated ?? j.allowed_hours ?? 0
    const approvedExtra = r.extra_hours_status === 'approved' ? (r.extra_hours ?? 0) : 0
    const hours = Math.round((allowed + approvedExtra) * 100) / 100
    if (rate <= 0 || hours <= 0) continue // needs pricing — skip
    items.push({
      job_id: r.job_id,
      hours,
      rate,
      amount: Math.round(hours * rate * 100) / 100,
      date: (j.completed_at ?? j.scheduled_date) as string,
    })
  }
  if (items.length === 0) {
    return { error: 'No payable jobs for this contractor — check that completed jobs have a rate and hours.' }
  }

  const dates = items.map((i) => i.date.slice(0, 10)).sort()
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()

  const { data: run, error: runErr } = await supabase
    .from('pay_runs')
    .insert({
      pay_period_start: dates[0],
      pay_period_end: dates[dates.length - 1],
      pay_date: today,
      status: 'paid',
      kind: 'contractor',
      notes: 'Paid via Pay contractors',
      approved_at: now,
      approved_by: user.id,
      paid_at: now,
      paid_by: user.id,
    })
    .select('id')
    .single()
  if (runErr || !run) return { error: `Failed to create pay run: ${runErr?.message ?? 'no row'}` }

  const { error: piErr } = await supabase.from('pay_run_items').insert(
    items.map((i) => ({
      pay_run_id: run.id,
      job_id: i.job_id,
      contractor_id: contractorId,
      approved_hours: i.hours,
      pay_rate: i.rate,
      amount: i.amount,
      status: 'paid',
    })),
  )
  if (piErr) {
    await supabase.from('pay_runs').delete().eq('id', run.id)
    return { error: `Failed to record pay items: ${piErr.message}` }
  }

  for (const i of items) {
    await supabase
      .from('job_workers')
      .update({ pay_status: 'paid' })
      .eq('job_id', i.job_id)
      .eq('contractor_id', contractorId)
      .in('pay_status', ['pending', 'approved'])
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'contractor.paid',
    entity_table: 'pay_runs',
    entity_id: run.id,
    before: null,
    after: { contractor_id: contractorId, items: items.length, total: items.reduce((s, i) => s + i.amount, 0) },
  })

  // Send the remittance (PDF email). Payment already succeeded — a
  // remittance failure must not undo it.
  let remittanceSent = false
  try {
    const res = await sendRemittances(run.id as string)
    remittanceSent = 'ok' in res && (res.sent ?? 0) > 0
  } catch {
    /* swallow — surfaced as remittanceSent=false */
  }

  revalidatePath('/portal/payroll/contractors')
  revalidatePath('/portal/payroll')
  return {
    ok: true as const,
    items: items.length,
    total: Math.round(items.reduce((s, i) => s + i.amount, 0) * 100) / 100,
    remittanceSent,
  }
}
