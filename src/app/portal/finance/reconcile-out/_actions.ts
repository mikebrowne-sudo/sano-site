'use server'

// Outgoing bank reconciliation actions — the money-out mirror of
// finance/reconcile/_actions.ts. Durably links an outgoing bank debit to one or
// more contractor remittances (remittance_payment_allocations), supports
// partial/split, prevents double-allocation, clears the bank line once fully
// allocated, and — the point of this feature — sets each remittance's
// payment_confirmed flag ONLY when it becomes fully matched to real bank money.
//
// payment_confirmed is additive: paid_at (and its statement/payable effects via
// the existing mark-paid RPC) is untouched. A remittance can be paid_at-stamped
// (manual) yet payment_confirmed=false = "paid, unconfirmed" until reconciled.
//
// Admin-gated, audited. No payment is ever initiated — this records an outgoing
// transfer that already happened.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { isDebitFullyAllocated, round2 } from '@/lib/remittance-reconcile'
import { applyRemittanceAllocation, refreshConfirmed } from './_apply-remit'

export interface RemitAllocationInput {
  remittanceId: string
  amount: number
}

function revalidate() {
  revalidatePath('/portal/finance/reconcile-out')
  revalidatePath('/portal/contractor-invoices/remittances')
  revalidatePath('/portal/contractor-invoices')
}


/**
 * Reconcile one outgoing bank debit to one or more remittances by recording
 * allocations. Re-validates against current live allocations (no double-alloc,
 * no over-allocating a remittance or the debit), clears the bank line once fully
 * allocated, refreshes payment_confirmed on each touched remittance, and audits.
 */
export async function reconcileRemittancePayment(
  bankTxnId: string,
  allocations: RemitAllocationInput[],
): Promise<{ ok: boolean; error?: string; allocated?: number; confirmed?: number; cleared?: boolean }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!isAdminUser(user)) return { ok: false, error: 'Not authorised.' }
    if (!allocations.length) return { ok: false, error: 'Select at least one remittance to allocate to.' }

    const res = await applyRemittanceAllocation(supabase, {
      bankTxnId,
      allocations,
      method: 'manual',
      matchReason: null,
      userId: user?.id ?? null,
    })
    if (!res.ok) return res

    revalidate()
    return res
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unexpected error.' }
  }
}

/**
 * Reverse a single live remittance allocation (soft). If reversing drops the
 * bank line below fully-allocated, the cleared flag is lifted. The remittance's
 * payment_confirmed is refreshed (may drop to false). paid_at is left untouched
 * — reversing a bank match is a reconciliation correction, not an un-payment.
 */
export async function reverseRemittanceAllocation(
  allocationId: string,
  reason: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!isAdminUser(user)) return { ok: false, error: 'Not authorised.' }

    const { data: alloc, error: aErr } = await supabase
      .from('remittance_payment_allocations')
      .select('id, bank_transaction_id, remittance_id, amount_allocated, reversed_at')
      .eq('id', allocationId)
      .single()
    if (aErr || !alloc) return { ok: false, error: `Allocation not found: ${aErr?.message ?? 'missing'}` }
    if (alloc.reversed_at) return { ok: false, error: 'This allocation has already been reversed.' }

    const nowIso = new Date().toISOString()
    const { error: revErr } = await supabase
      .from('remittance_payment_allocations')
      .update({ reversed_at: nowIso, reversed_by: user?.id ?? null, reversal_reason: reason || null })
      .eq('id', allocationId)
      .is('reversed_at', null)
    if (revErr) return { ok: false, error: revErr.message }

    const lineId = alloc.bank_transaction_id as string
    const { data: line } = await supabase.from('bank_transactions').select('amount').eq('id', lineId).single()
    const { data: remainingAllocs } = await supabase
      .from('remittance_payment_allocations')
      .select('amount_allocated')
      .eq('bank_transaction_id', lineId)
      .is('reversed_at', null)
    const txnAmount = round2(Math.abs(Number(line?.amount ?? 0)))
    const stillAllocated = round2(
      ((remainingAllocs ?? []) as Array<{ amount_allocated: number }>).reduce((s, r) => s + Number(r.amount_allocated ?? 0), 0),
    )
    if (!isDebitFullyAllocated(txnAmount, stillAllocated)) {
      await supabase.from('bank_transactions').update({ cleared: false, cleared_at: null, cleared_by: null }).eq('id', lineId)
    }

    await refreshConfirmed(supabase, alloc.remittance_id as string)

    try {
      await supabase.from('audit_log').insert({
        actor_id: user?.id ?? null,
        actor_role: 'admin',
        action: 'remittance.allocation_reversed',
        entity_table: 'remittance_payment_allocations',
        entity_id: allocationId,
        before: { amount: Number(alloc.amount_allocated ?? 0), remittance_id: alloc.remittance_id, bank_transaction_id: lineId },
        after: { reversal_reason: reason || null },
      })
    } catch (err) {
      console.warn('[reconcile-out] reversal audit insert failed:', err)
    }

    revalidate()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unexpected error.' }
  }
}
