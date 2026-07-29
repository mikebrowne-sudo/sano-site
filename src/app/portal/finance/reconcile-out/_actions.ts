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
import {
  validateRemitAllocation,
  isDebitFullyAllocated,
  round2,
  type RemitAllocationContext,
  type ProposedRemitAllocation,
} from '@/lib/remittance-reconcile'

export interface RemitAllocationInput {
  remittanceId: string
  amount: number
}

function revalidate() {
  revalidatePath('/portal/finance/reconcile-out')
  revalidatePath('/portal/contractor-invoices/remittances')
  revalidatePath('/portal/contractor-invoices')
}

/** Sum live (un-reversed) allocations against a remittance and, if it now fully
 *  covers the remittance total, set payment_confirmed. Idempotent + safe to call
 *  after either an allocation or a reversal. */
async function refreshConfirmed(
  supabase: ReturnType<typeof createClient>,
  remittanceId: string,
): Promise<void> {
  const [{ data: items }, { data: allocs }, { data: remit }] = await Promise.all([
    supabase.from('contractor_remittance_items').select('amount').eq('remittance_id', remittanceId),
    supabase.from('remittance_payment_allocations').select('amount_allocated').eq('remittance_id', remittanceId).is('reversed_at', null),
    supabase.from('contractor_remittances').select('payment_confirmed').eq('id', remittanceId).single(),
  ])
  const total = round2(((items ?? []) as Array<{ amount: number | null }>).reduce((s, i) => s + Number(i.amount ?? 0), 0))
  const allocated = round2(((allocs ?? []) as Array<{ amount_allocated: number }>).reduce((s, a) => s + Number(a.amount_allocated ?? 0), 0))
  const confirmed = total > 0 && allocated >= total - 0.005
  const already = !!(remit as { payment_confirmed?: boolean } | null)?.payment_confirmed
  if (confirmed === already) return
  await supabase
    .from('contractor_remittances')
    .update({ payment_confirmed: confirmed, payment_confirmed_at: confirmed ? new Date().toISOString() : null })
    .eq('id', remittanceId)
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

    // Load the bank line — must be an outgoing debit.
    const { data: line, error: lineErr } = await supabase
      .from('bank_transactions')
      .select('id, amount, direction')
      .eq('id', bankTxnId)
      .single()
    if (lineErr || !line) return { ok: false, error: `Bank transaction not found: ${lineErr?.message ?? 'missing'}` }
    if ((line.direction as string) !== 'out') {
      return { ok: false, error: 'Only outgoing payments can be allocated to remittances.' }
    }
    const txnAmount = round2(Math.abs(Number(line.amount ?? 0)))

    const remitIds = allocations.map((a) => a.remittanceId)

    // Load target remittances' item totals + live allocations affecting the
    // balances we validate (this debit, and the target remittances).
    const [{ data: items }, { data: liveTxnAllocs }, { data: liveRemitAllocs }, { data: remitRows }] = await Promise.all([
      supabase.from('contractor_remittance_items').select('remittance_id, amount').in('remittance_id', remitIds),
      supabase.from('remittance_payment_allocations').select('amount_allocated').eq('bank_transaction_id', bankTxnId).is('reversed_at', null),
      supabase.from('remittance_payment_allocations').select('remittance_id, amount_allocated').in('remittance_id', remitIds).is('reversed_at', null),
      supabase.from('contractor_remittances').select('id, remittance_number').in('id', remitIds),
    ])
    if (!remitRows || remitRows.length !== new Set(remitIds).size) {
      return { ok: false, error: 'One or more selected remittances could not be found.' }
    }

    const totalByRemit = new Map<string, number>()
    for (const it of (items ?? []) as Array<{ remittance_id: string; amount: number | null }>) {
      totalByRemit.set(it.remittance_id, round2((totalByRemit.get(it.remittance_id) ?? 0) + Number(it.amount ?? 0)))
    }
    const numberByRemit = new Map<string, string>()
    for (const r of remitRows as Array<{ id: string; remittance_number: string | null }>) {
      numberByRemit.set(r.id, r.remittance_number ?? '')
    }

    const transactionAllocated = round2(
      ((liveTxnAllocs ?? []) as Array<{ amount_allocated: number }>).reduce((s, r) => s + Number(r.amount_allocated ?? 0), 0),
    )
    const allocatedByRemit = new Map<string, number>()
    for (const r of (liveRemitAllocs ?? []) as Array<{ remittance_id: string; amount_allocated: number }>) {
      allocatedByRemit.set(r.remittance_id, round2((allocatedByRemit.get(r.remittance_id) ?? 0) + Number(r.amount_allocated ?? 0)))
    }

    const uniqueRemitIds = Array.from(new Set(remitIds))
    const ctxRemits: RemitAllocationContext['remittances'] = {}
    for (const id of uniqueRemitIds) {
      ctxRemits[id] = { total: totalByRemit.get(id) ?? 0, allocated: allocatedByRemit.get(id) ?? 0 }
    }

    const proposed: ProposedRemitAllocation[] = allocations.map((a) => ({ remittanceId: a.remittanceId, amount: round2(a.amount) }))
    const ctx: RemitAllocationContext = { transactionAmount: txnAmount, transactionAllocated, remittances: ctxRemits }
    const check = validateRemitAllocation(ctx, proposed)
    if (!check.ok) return { ok: false, error: check.error }

    const nowIso = new Date().toISOString()
    const { error: insErr } = await supabase.from('remittance_payment_allocations').insert(
      proposed.map((p) => ({
        bank_transaction_id: bankTxnId,
        remittance_id: p.remittanceId,
        amount_allocated: p.amount,
        method: 'manual',
        reconciled_at: nowIso,
        reconciled_by: user?.id ?? null,
      })),
    )
    if (insErr) {
      if ((insErr as { code?: string }).code === '23505') {
        return { ok: false, error: 'One of these remittances is already allocated to this payment. Reverse it first to re-allocate.' }
      }
      return { ok: false, error: insErr.message }
    }

    // Refresh payment_confirmed on each touched remittance.
    let confirmed = 0
    for (const id of uniqueRemitIds) {
      await refreshConfirmed(supabase, id)
      const total = totalByRemit.get(id) ?? 0
      const nowAllocated = round2((allocatedByRemit.get(id) ?? 0) + proposed.filter((p) => p.remittanceId === id).reduce((s, p) => s + p.amount, 0))
      if (total > 0 && nowAllocated >= total - 0.005) confirmed++
    }

    // Clear the bank line once fully allocated.
    const proposedSum = round2(proposed.reduce((s, p) => s + p.amount, 0))
    const fully = isDebitFullyAllocated(txnAmount, round2(transactionAllocated + proposedSum))
    if (fully) {
      const { error: clrErr } = await supabase
        .from('bank_transactions')
        .update({ cleared: true, cleared_at: nowIso, cleared_by: user?.id ?? null })
        .eq('id', bankTxnId)
      if (clrErr) return { ok: false, error: `Allocations saved but clearing the line failed: ${clrErr.message}` }
    }

    try {
      await supabase.from('audit_log').insert({
        actor_id: user?.id ?? null,
        actor_role: 'admin',
        action: 'remittance.reconciled',
        entity_table: 'bank_transactions',
        entity_id: bankTxnId,
        before: {},
        after: {
          allocations: proposed.map((p) => ({ remittance: numberByRemit.get(p.remittanceId), amount: p.amount })),
          confirmed,
          cleared: fully,
        },
      })
    } catch (err) {
      console.warn('[reconcile-out] audit insert failed:', err)
    }

    revalidate()
    return { ok: true, allocated: proposed.length, confirmed, cleared: fully }
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
