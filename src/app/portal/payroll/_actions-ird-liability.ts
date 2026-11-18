'use server'

import { assertAdminAction } from '@/lib/require-admin'

// Record IRD payments + adjustments against a liability period. Admin-only,
// service-role, audited. A liability clears ONLY through recorded payments —
// marking an employee paid never touches it. Partial payments are supported
// (the period status derives from paid-vs-payable, never falsely "paid").
// Corrections are separate adjustment lines — the original liability line is
// never rewritten.

import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { isAdminUser } from '@/lib/is-admin'
import { backfillMissingLiabilityLines } from '@/lib/payroll/ird-liability-ledger'
import { applyIrdBankPayments } from '@/lib/payroll/ird-bank-payment-runner'
import { revalidatePath } from 'next/cache'

type Result = { ok?: true; error?: string }

async function adminGate(): Promise<{ error?: string; userId?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  return { userId: user.id }
}

export async function recordIrdPayment(input: {
  liabilityId: string
  paymentDate: string
  amount: number
  irdReference?: string
  notes?: string
}): Promise<Result> {
  await assertAdminAction()
  const g = await adminGate()
  if (g.error) return { error: g.error }
  if (!input.paymentDate) return { error: 'Payment date is required.' }
  if (!(input.amount > 0)) return { error: 'Payment amount must be greater than zero.' }

  const svc = getServiceSupabase()
  const { error } = await svc.from('ird_liability_payments').insert({
    ird_liability_id: input.liabilityId,
    payment_date: input.paymentDate,
    amount: input.amount,
    ird_reference: input.irdReference?.trim() || null,
    notes: input.notes?.trim() || null,
    recorded_by: g.userId,
  })
  if (error) return { error: error.message }
  try {
    await svc.from('audit_log').insert({ entity_table: 'ird_liabilities', entity_id: input.liabilityId, action: 'ird_payment_recorded', detail: `Recorded IRD payment $${input.amount.toFixed(2)} on ${input.paymentDate}${input.irdReference ? ` (ref ${input.irdReference})` : ''}.`, performed_by: g.userId })
  } catch { /* audit shape varies */ }
  revalidatePath('/portal/payroll/ird')
  return { ok: true }
}

/** Create liability lines for approved/paid runs the ledger missed. */
export async function syncIrdLiabilityLines(): Promise<Result & { created?: number; skipped?: number; paymentsRecorded?: number; paymentsAmount?: number; note?: string }> {
  await assertAdminAction()
  const g = await adminGate()
  if (g.error) return { error: g.error }
  const svc = getServiceSupabase()
  const res = await backfillMissingLiabilityLines(svc)
  if (res.skipped.length) console.error('[payroll] IRD backfill skipped:', res.skipped)
  // Then pick up PAYE payments already on the bank feed.
  let pay = null
  try { pay = await applyIrdBankPayments(svc) } catch (e) { console.error('[payroll] IRD bank payments:', e instanceof Error ? e.message : e) }
  revalidatePath('/portal/payroll/ird')
  return {
    ok: true, created: res.created, skipped: res.skipped.length,
    paymentsRecorded: (pay?.recorded ?? 0) + (pay?.linkedManual ?? 0), paymentsAmount: pay?.recordedAmount ?? 0,
    note: pay?.setupNeeded ?? (pay?.failures.length ? pay.failures.join('; ') : undefined),
  }
}

export async function addIrdAdjustment(input: {
  liabilityId: string
  payRunId?: string | null
  kind: string
  amount: number
  reason: string
}): Promise<Result> {
  await assertAdminAction()
  const g = await adminGate()
  if (g.error) return { error: g.error }
  if (!input.reason?.trim()) return { error: 'A reason is required for an adjustment.' }
  if (!input.amount || input.amount === 0) return { error: 'Adjustment amount cannot be zero.' }

  const svc = getServiceSupabase()
  const { error } = await svc.from('ird_liability_adjustments').insert({
    ird_liability_id: input.liabilityId,
    pay_run_id: input.payRunId || null,
    kind: input.kind,
    amount: input.amount,
    reason: input.reason.trim(),
    created_by: g.userId,
  })
  if (error) return { error: error.message }
  try {
    await svc.from('audit_log').insert({ entity_table: 'ird_liabilities', entity_id: input.liabilityId, action: 'ird_adjustment_added', detail: `${input.kind} adjustment $${input.amount.toFixed(2)}: ${input.reason.trim()}`, performed_by: g.userId })
  } catch { /* audit shape varies */ }
  revalidatePath('/portal/payroll/ird')
  return { ok: true }
}
