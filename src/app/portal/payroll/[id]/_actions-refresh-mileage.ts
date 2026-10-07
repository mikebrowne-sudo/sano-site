'use server'

// Pull newly-approved mileage into a DRAFT pay run.
//
// Mileage is captured when a run is created. Approve a log afterwards and the
// run doesn't know about it — the money is silently left out, which underpaid
// an employee twice before this existed.
//
// Rather than making the operator delete and recreate the run (or raise a
// separate mileage-only run), this re-sweeps outstanding approved mileage onto
// the existing draft and stamps the logs so they can't be paid twice.
//
// DRAFT ONLY. An approved or paid run is a frozen financial record; its figures
// must never change underneath a payslip that has already been issued.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export async function refreshPayRunMileage(
  payRunId: string,
): Promise<{ ok: true; added: number; total: number } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { error: 'Admin only.' }
  if (!payRunId) return { error: 'Pay run is required.' }

  const { data: run } = await supabase
    .from('pay_runs')
    .select('id, status, pay_period_end')
    .eq('id', payRunId)
    .maybeSingle()
  if (!run) return { error: 'Pay run not found.' }
  if (run.status !== 'draft') {
    return { error: `Only a draft pay run can pick up new mileage (this one is ${run.status}). Its figures are frozen.` }
  }

  const { data: lines } = await supabase
    .from('pay_run_lines')
    .select('id, contractor_id, mileage_reimbursement')
    .eq('pay_run_id', payRunId)
  const lineRows = (lines ?? []) as Array<{ id: string; contractor_id: string; mileage_reimbursement: number | null }>
  if (lineRows.length === 0) return { error: 'This pay run has no lines to update.' }

  // Everything outstanding up to the end of the run's period — the same rule
  // the creation path uses, so a refresh and a fresh run agree.
  const { data: mileage } = await supabase
    .from('mileage_logs')
    .select('id, contractor_id, reimbursement_amount')
    .in('contractor_id', lineRows.map((l) => l.contractor_id))
    .eq('status', 'approved')
    .is('pay_run_id', null)
    .lte('log_date', run.pay_period_end as string)

  const rows = (mileage ?? []) as Array<{ id: string; contractor_id: string; reimbursement_amount: number | null }>
  if (rows.length === 0) return { ok: true, added: 0, total: 0 }

  const addByContractor = new Map<string, number>()
  for (const m of rows) {
    const cid = m.contractor_id
    addByContractor.set(cid, round2((addByContractor.get(cid) ?? 0) + Number(m.reimbursement_amount ?? 0)))
  }

  let total = 0
  for (const line of lineRows) {
    const add = addByContractor.get(line.contractor_id) ?? 0
    if (add <= 0) continue
    const next = round2(Number(line.mileage_reimbursement ?? 0) + add)
    const { error } = await supabase
      .from('pay_run_lines')
      .update({ mileage_reimbursement: next })
      .eq('id', line.id)
    if (error) return { error: `Could not update the pay run: ${error.message}` }
    total = round2(total + add)
  }

  // Stamp the logs LAST, so a failure above leaves them unattached and
  // re-sweepable rather than marked paid against money that never moved.
  const { error: stampErr } = await supabase
    .from('mileage_logs')
    .update({ pay_run_id: payRunId })
    .in('id', rows.map((m) => m.id))
  if (stampErr) return { error: `Mileage added but not stamped: ${stampErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'pay_run.mileage_refreshed',
    entity_table: 'pay_runs',
    entity_id: payRunId,
    before: null,
    after: { logs_added: rows.length, mileage_total: total },
  })

  revalidatePath(`/portal/payroll/${payRunId}`)
  revalidatePath('/portal/payroll')
  revalidatePath('/portal/pay')
  return { ok: true, added: rows.length, total }
}
