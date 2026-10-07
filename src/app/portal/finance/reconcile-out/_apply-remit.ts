// Shared write path for allocating an outgoing bank debit to contractor
// remittances. Used by the manual reconcile-out action and by auto-reconcile,
// so both get the same validation, payment_confirmed refresh, line clearing and
// audit row. Server-only helper (NOT a server action): callers check
// isAdminUser first and pass their session client.

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  validateRemitAllocation,
  isDebitFullyAllocated,
  round2,
  type RemitAllocationContext,
  type ProposedRemitAllocation,
} from '@/lib/remittance-reconcile'

export interface ApplyRemitInput {
  bankTxnId: string
  allocations: Array<{ remittanceId: string; amount: number }>
  method: 'manual' | 'reference' | 'amount_match'
  /** "auto: …" for automatic allocations. */
  matchReason?: string | null
  userId: string | null
}

export interface ApplyRemitResult {
  ok: boolean
  error?: string
  allocated?: number
  confirmed?: number
  cleared?: boolean
}

/** Sum live allocations against a remittance and, if they now fully cover its
 *  total, set payment_confirmed (or clear it). Idempotent. */
export async function refreshConfirmed(supabase: SupabaseClient, remittanceId: string): Promise<void> {
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

export async function applyRemittanceAllocation(supabase: SupabaseClient, input: ApplyRemitInput): Promise<ApplyRemitResult> {
  const { bankTxnId, allocations, method, matchReason, userId } = input
  if (!allocations.length) return { ok: false, error: 'Select at least one remittance to allocate to.' }

  const { data: line, error: lineErr } = await supabase
    .from('bank_transactions')
    .select('id, amount, direction')
    .eq('id', bankTxnId)
    .single()
  if (lineErr || !line) return { ok: false, error: `Bank transaction not found: ${lineErr?.message ?? 'missing'}` }
  if ((line.direction as string) !== 'out') return { ok: false, error: 'Only outgoing payments can be allocated to remittances.' }
  const txnAmount = round2(Math.abs(Number(line.amount ?? 0)))
  const remitIds = allocations.map((a) => a.remittanceId)

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
  for (const r of remitRows as Array<{ id: string; remittance_number: string | null }>) numberByRemit.set(r.id, r.remittance_number ?? '')

  const transactionAllocated = round2(
    ((liveTxnAllocs ?? []) as Array<{ amount_allocated: number }>).reduce((s, r) => s + Number(r.amount_allocated ?? 0), 0),
  )
  const allocatedByRemit = new Map<string, number>()
  for (const r of (liveRemitAllocs ?? []) as Array<{ remittance_id: string; amount_allocated: number }>) {
    allocatedByRemit.set(r.remittance_id, round2((allocatedByRemit.get(r.remittance_id) ?? 0) + Number(r.amount_allocated ?? 0)))
  }

  const uniqueRemitIds = Array.from(new Set(remitIds))
  const ctxRemits: RemitAllocationContext['remittances'] = {}
  for (const id of uniqueRemitIds) ctxRemits[id] = { total: totalByRemit.get(id) ?? 0, allocated: allocatedByRemit.get(id) ?? 0 }

  const proposed: ProposedRemitAllocation[] = allocations.map((a) => ({ remittanceId: a.remittanceId, amount: round2(a.amount) }))
  const check = validateRemitAllocation({ transactionAmount: txnAmount, transactionAllocated, remittances: ctxRemits }, proposed)
  if (!check.ok) return { ok: false, error: check.error }

  const nowIso = new Date().toISOString()
  const { error: insErr } = await supabase.from('remittance_payment_allocations').insert(
    proposed.map((p) => ({
      bank_transaction_id: bankTxnId,
      remittance_id: p.remittanceId,
      amount_allocated: p.amount,
      method,
      match_reason: matchReason ?? null,
      reconciled_at: nowIso,
      reconciled_by: userId,
    })),
  )
  if (insErr) {
    if ((insErr as { code?: string }).code === '23505') {
      return { ok: false, error: 'One of these remittances is already allocated to this payment. Reverse it first to re-allocate.' }
    }
    return { ok: false, error: insErr.message }
  }

  let confirmed = 0
  for (const id of uniqueRemitIds) {
    await refreshConfirmed(supabase, id)
    const total = totalByRemit.get(id) ?? 0
    const nowAllocated = round2((allocatedByRemit.get(id) ?? 0) + proposed.filter((p) => p.remittanceId === id).reduce((s, p) => s + p.amount, 0))
    if (total > 0 && nowAllocated >= total - 0.005) confirmed++
  }

  const proposedSum = round2(proposed.reduce((s, p) => s + p.amount, 0))
  const fully = isDebitFullyAllocated(txnAmount, round2(transactionAllocated + proposedSum))
  if (fully) {
    const { error: clrErr } = await supabase
      .from('bank_transactions')
      .update({ cleared: true, cleared_at: nowIso, cleared_by: userId })
      .eq('id', bankTxnId)
    if (clrErr) return { ok: false, error: `Allocations saved but clearing the line failed: ${clrErr.message}` }
  }

  try {
    await supabase.from('audit_log').insert({
      actor_id: userId,
      actor_role: 'admin',
      action: matchReason?.startsWith('auto:') ? 'remittance.auto_reconciled' : 'remittance.reconciled',
      entity_table: 'bank_transactions',
      entity_id: bankTxnId,
      before: {},
      after: {
        allocations: proposed.map((p) => ({ remittance: numberByRemit.get(p.remittanceId), amount: p.amount })),
        confirmed,
        cleared: fully,
        match_reason: matchReason ?? null,
      },
    })
  } catch (err) {
    console.warn('[reconcile-out] audit insert failed:', err)
  }

  return { ok: true, allocated: proposed.length, confirmed, cleared: fully }
}
