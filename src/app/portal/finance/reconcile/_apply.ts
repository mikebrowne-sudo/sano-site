// Shared write path for allocating a bank credit to invoices. Used by the
// manual reconcile action and by auto-reconcile, so both get the same
// validation, invoice status flip, line clearing and audit row.
//
// Server-only helper (NOT a server action): callers check isAdminUser first
// and pass their session client.

import type { SupabaseClient } from '@supabase/supabase-js'
import { computeDocumentTotals } from '@/lib/doc-totals'
import {
  validateAllocation,
  isFullyAllocated,
  round2,
  type AllocationContext,
  type ProposedAllocation,
} from '@/lib/payment-allocation'

export interface ApplyAllocationInput {
  lineId: string
  allocations: Array<{ invoiceId: string; amount: number }>
  /** Date to stamp on invoices that become paid (the bank line's date). */
  paidDate: string | null
  method: 'manual' | 'invoice_ref' | 'amount_match'
  /** Why it matched — "auto: …" for automatic allocations. */
  matchReason?: string | null
  userId: string | null
}

export interface ApplyAllocationResult {
  ok: boolean
  error?: string
  allocated?: number
  markedPaid?: number
  cleared?: boolean
}

/** GST-inclusive invoice total (what the client actually pays). */
export function invoicePayableTotal(i: { base_price?: unknown; discount?: unknown; gst_included?: unknown; invoice_items?: unknown }): number {
  const items = (i.invoice_items ?? []) as Array<{ price: number | null }>
  const lineTotal = Number(i.base_price ?? 0) + items.reduce((s, it) => s + Number(it.price ?? 0), 0) - Number(i.discount ?? 0)
  return round2(computeDocumentTotals(lineTotal, !!i.gst_included).total)
}

export async function applyBankAllocation(supabase: SupabaseClient, input: ApplyAllocationInput): Promise<ApplyAllocationResult> {
  const { lineId, allocations, paidDate, method, matchReason, userId } = input
  if (!allocations.length) return { ok: false, error: 'Select at least one invoice to allocate to.' }

  const { data: line, error: lineErr } = await supabase
    .from('bank_transactions')
    .select('id, amount, direction, txn_date, cleared')
    .eq('id', lineId)
    .single()
  if (lineErr || !line) return { ok: false, error: `Bank transaction not found: ${lineErr?.message ?? 'missing'}` }
  if ((line.direction as string) !== 'in') return { ok: false, error: 'Only incoming payments can be allocated to invoices.' }
  const txnAmount = round2(Math.abs(Number(line.amount ?? 0)))
  const invoiceIds = allocations.map((a) => a.invoiceId)

  const [{ data: invRows, error: invErr }, { data: liveTxnAllocs }, { data: liveInvAllocs }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, status, base_price, discount, gst_included, invoice_items ( price )')
      .in('id', invoiceIds)
      .is('deleted_at', null),
    supabase.from('invoice_payment_allocations').select('amount_allocated').eq('bank_transaction_id', lineId).is('reversed_at', null),
    supabase.from('invoice_payment_allocations').select('invoice_id, amount_allocated').in('invoice_id', invoiceIds).is('reversed_at', null),
  ])
  if (invErr) return { ok: false, error: invErr.message }
  if (!invRows || invRows.length !== new Set(invoiceIds).size) return { ok: false, error: 'One or more selected invoices could not be found.' }

  const transactionAllocated = round2(
    ((liveTxnAllocs ?? []) as Array<{ amount_allocated: number }>).reduce((s, r) => s + Number(r.amount_allocated ?? 0), 0),
  )
  const allocatedByInvoice = new Map<string, number>()
  for (const r of (liveInvAllocs ?? []) as Array<{ invoice_id: string; amount_allocated: number }>) {
    allocatedByInvoice.set(r.invoice_id, round2((allocatedByInvoice.get(r.invoice_id) ?? 0) + Number(r.amount_allocated ?? 0)))
  }

  const invoiceInfo = new Map<string, { status: string; number: string }>()
  const ctxInvoices: AllocationContext['invoices'] = {}
  for (const i of invRows as Array<Record<string, unknown>>) {
    const id = i.id as string
    invoiceInfo.set(id, { status: (i.status as string) ?? 'draft', number: (i.invoice_number as string) ?? '' })
    ctxInvoices[id] = { total: invoicePayableTotal(i), allocated: allocatedByInvoice.get(id) ?? 0 }
  }

  const proposed: ProposedAllocation[] = allocations.map((a) => ({ invoiceId: a.invoiceId, amount: round2(a.amount) }))
  const check = validateAllocation({ transactionAmount: txnAmount, transactionAllocated, invoices: ctxInvoices }, proposed)
  if (!check.ok) return { ok: false, error: check.error }

  const nowIso = new Date().toISOString()
  const { error: insErr } = await supabase.from('invoice_payment_allocations').insert(
    proposed.map((p) => ({
      bank_transaction_id: lineId,
      invoice_id: p.invoiceId,
      amount_allocated: p.amount,
      method,
      match_reason: matchReason ?? null,
      reconciled_at: nowIso,
      reconciled_by: userId,
    })),
  )
  if (insErr) {
    if ((insErr as { code?: string }).code === '23505') {
      return { ok: false, error: 'One of these invoices is already allocated to this payment. Reverse it first to re-allocate.' }
    }
    return { ok: false, error: insErr.message }
  }

  // Mark a not-yet-paid invoice paid ONLY once its payments cover the full
  // total. A part payment (e.g. half of INV-0308) is recorded against the
  // invoice but leaves it open with a balance. Already-paid invoices stay as-is.
  const date = paidDate || (line.txn_date as string | null) || nowIso.slice(0, 10)
  const unpaidIds = Array.from(invoiceInfo.entries())
    .filter(([id, v]) => {
      if (v.status === 'paid') return false
      const after = round2((ctxInvoices[id]?.allocated ?? 0) + proposed.filter((p) => p.invoiceId === id).reduce((s, p) => s + p.amount, 0))
      return after >= round2(ctxInvoices[id]?.total ?? 0) - 0.005
    })
    .map(([id]) => id)
  let markedPaid = 0
  if (unpaidIds.length > 0) {
    const { data: upd, error: updErr } = await supabase
      .from('invoices')
      .update({ status: 'paid', date_paid: date })
      .in('id', unpaidIds)
      .neq('status', 'paid')
      .select('id')
    if (updErr) return { ok: false, error: `Allocations saved but marking invoices paid failed: ${updErr.message}` }
    markedPaid = upd?.length ?? 0
  }

  const proposedSum = round2(proposed.reduce((s, p) => s + p.amount, 0))
  const fully = isFullyAllocated(txnAmount, round2(transactionAllocated + proposedSum))
  // Already-cleared lines (backfill) keep their original cleared stamp.
  if (fully && !line.cleared) {
    const { error: clrErr } = await supabase
      .from('bank_transactions')
      .update({ cleared: true, cleared_at: nowIso, cleared_by: userId })
      .eq('id', lineId)
    if (clrErr) return { ok: false, error: `Allocations saved but clearing the line failed: ${clrErr.message}` }
  }

  try {
    await supabase.from('audit_log').insert({
      actor_id: userId,
      actor_role: 'admin',
      action: matchReason?.startsWith('auto:') ? 'bank.auto_reconciled' : 'bank.reconciled',
      entity_table: 'bank_transactions',
      entity_id: lineId,
      before: {},
      after: {
        allocations: proposed.map((p) => ({ invoice: invoiceInfo.get(p.invoiceId)?.number, amount: p.amount })),
        marked_paid: markedPaid,
        cleared: fully,
        match_reason: matchReason ?? null,
      },
    })
  } catch (err) {
    console.warn('[reconcile] audit insert failed:', err)
  }

  return { ok: true, allocated: proposed.length, markedPaid, cleared: fully }
}
