// Auto-reconcile runner: load → propose (pure engine) → apply each proposal
// through the same validated path as a manual reconcile. Server-only helper;
// the calling server action checks isAdminUser and passes its session client.

import type { SupabaseClient } from '@supabase/supabase-js'
import { payerKey, proposeAutoReconcile, type ArCredit, type ArHistory, type ArInvoice } from '@/lib/auto-reconcile'
import { round2 } from '@/lib/payment-allocation'
import { applyBankAllocation, invoicePayableTotal } from './_apply'

export interface AutoReconcileSummary {
  /** Uncleared payments now fully reconciled. */
  matched: number
  matchedAmount: number
  /** Invoices flipped to paid by those matches. */
  markedPaid: number
  /** Already-cleared lines that got their missing invoice link recorded. */
  backfilled: number
  /** Uncleared payments still needing a human. */
  needsReview: number
  failures: string[]
}

type Rec = Record<string, unknown>
const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? ((v[0] ?? null) as T | null) : ((v ?? null) as T | null))

export async function runAutoReconcile(supabase: SupabaseClient, userId: string | null): Promise<AutoReconcileSummary> {
  const [{ data: txns, error: tErr }, { data: invs, error: iErr }, { data: allocs, error: aErr }] = await Promise.all([
    supabase.from('bank_transactions').select('id, txn_date, amount, payee, memo, cleared').eq('direction', 'in'),
    supabase
      .from('invoices')
      .select('id, invoice_number, status, base_price, discount, gst_included, date_issued, date_paid, client_id, clients ( name, company_name, branch_name ), invoice_items ( price )')
      .is('deleted_at', null)
      .not('is_test', 'is', true)
      .neq('status', 'cancelled'),
    supabase
      .from('invoice_payment_allocations')
      .select('bank_transaction_id, invoice_id, amount_allocated, bank_transactions ( payee ), invoices ( client_id )')
      .is('reversed_at', null),
  ])
  const loadErr = tErr ?? iErr ?? aErr
  if (loadErr) throw new Error(`Auto-reconcile load failed: ${loadErr.message}`)

  const allocByTxn = new Map<string, number>()
  const allocByInv = new Map<string, number>()
  const history: ArHistory[] = []
  for (const a of (allocs ?? []) as Rec[]) {
    const amt = Number(a.amount_allocated ?? 0)
    allocByTxn.set(a.bank_transaction_id as string, (allocByTxn.get(a.bank_transaction_id as string) ?? 0) + amt)
    allocByInv.set(a.invoice_id as string, (allocByInv.get(a.invoice_id as string) ?? 0) + amt)
    const payee = one<{ payee: string | null }>(a.bank_transactions)?.payee
    const clientId = one<{ client_id: string | null }>(a.invoices)?.client_id
    if (payee && clientId) history.push({ payerKey: payerKey(payee), clientId })
  }

  const credits: ArCredit[] = ((txns ?? []) as Rec[])
    .filter((t) => Number(t.amount ?? 0) > 0 && t.txn_date)
    .map((t) => ({
      id: t.id as string,
      date: t.txn_date as string,
      amount: round2(Number(t.amount)),
      payee: (t.payee as string | null) ?? '',
      memo: (t.memo as string | null) ?? '',
      cleared: !!t.cleared,
      allocated: round2(allocByTxn.get(t.id as string) ?? 0),
    }))

  const invoices: ArInvoice[] = ((invs ?? []) as Rec[]).map((i) => {
    const c = one<{ name: string | null; company_name: string | null; branch_name: string | null }>(i.clients)
    return {
      id: i.id as string,
      number: (i.invoice_number as string | null) ?? '',
      status: (i.status as string | null) ?? 'draft',
      total: invoicePayableTotal(i),
      allocated: round2(allocByInv.get(i.id as string) ?? 0),
      dateIssued: (i.date_issued as string | null) ?? null,
      datePaid: (i.date_paid as string | null) ?? null,
      clientId: (i.client_id as string | null) ?? null,
      clientLabel: `${c?.company_name || c?.name || ''} ${c?.branch_name ?? ''}`.trim(),
    }
  })

  const { proposals, review } = proposeAutoReconcile({ credits, invoices, history })
  const creditById = new Map(credits.map((c) => [c.id, c]))

  const summary: AutoReconcileSummary = { matched: 0, matchedAmount: 0, markedPaid: 0, backfilled: 0, needsReview: 0, failures: [] }
  for (const p of proposals) {
    const credit = creditById.get(p.creditId)
    const res = await applyBankAllocation(supabase, {
      lineId: p.creditId,
      allocations: p.allocations,
      paidDate: credit?.date ?? null,
      method: p.method,
      matchReason: p.reason,
      userId,
    })
    if (!res.ok) {
      summary.failures.push(`${credit?.date ?? ''} ${credit?.amount ?? ''}: ${res.error}`)
      continue
    }
    if (p.backfill) {
      summary.backfilled += 1
    } else {
      summary.matched += 1
      summary.matchedAmount = round2(summary.matchedAmount + p.allocations.reduce((s, a) => s + a.amount, 0))
      summary.markedPaid += res.markedPaid ?? 0
    }
  }
  summary.needsReview = review.filter((r) => !creditById.get(r.creditId)?.cleared).length
  return summary
}
