// What a customer owes / has paid on an invoice, consistently across the app.
//
//   total       — GST-inclusive (a GST-exclusive invoice adds 15%), the same
//                 maths as the invoice PDF (computeDocumentTotals)
//   balanceDue  — total minus payments already matched to it, so a part
//                 payment (e.g. half of INV-0308) shows only what's left
//
// Used by the dashboard money figures and the income projection.

import type { SupabaseClient } from '@supabase/supabase-js'
import { computeDocumentTotals } from './doc-totals'

export interface InvoiceAmountFields {
  base_price?: number | null
  discount?: number | null
  gst_included?: boolean | null
  invoice_items?: Array<{ price: number | null }> | null
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** GST-inclusive invoice total. */
export function invoiceTotalInclGst(i: InvoiceAmountFields): number {
  const items = (i.invoice_items ?? []).reduce((s, it) => s + Number(it.price ?? 0), 0)
  const lineTotal = Number(i.base_price ?? 0) + items - Number(i.discount ?? 0)
  return round2(computeDocumentTotals(lineTotal, !!i.gst_included).total)
}

/** Total minus what's already been paid against it (never below zero). */
export function invoiceBalanceDue(i: InvoiceAmountFields, allocated: number): number {
  return Math.max(0, round2(invoiceTotalInclGst(i) - allocated))
}

/** Live (un-reversed) payment allocations per invoice id. */
export async function loadAllocatedByInvoice(supabase: SupabaseClient, invoiceIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (invoiceIds.length === 0) return map
  const { data } = await supabase
    .from('invoice_payment_allocations')
    .select('invoice_id, amount_allocated')
    .in('invoice_id', invoiceIds)
    .is('reversed_at', null)
  for (const r of (data ?? []) as Array<{ invoice_id: string; amount_allocated: number | null }>) {
    map.set(r.invoice_id, round2((map.get(r.invoice_id) ?? 0) + Number(r.amount_allocated ?? 0)))
  }
  return map
}

/**
 * What the customer has paid, for showing on the invoice itself. A PAID
 * invoice counts as paid in full (card, manual "Mark as paid", or matched
 * bank payments); otherwise it's the matched bank payments so far.
 */
export function invoicePaymentSummary(
  i: InvoiceAmountFields & { status?: string | null; date_paid?: string | null },
  allocated: number,
  /** Latest bank line matched to it (loadBankPaidDateByInvoice) — preferred. */
  bankDate: string | null = null,
): { paid: number; datePaid: string | null } {
  const total = invoiceTotalInclGst(i)
  // Received date = when the money hit the bank. Card / manual payments with
  // no bank match fall back to the recorded paid date.
  if (i.status === 'paid') return { paid: total, datePaid: bankDate ?? i.date_paid ?? null }
  return { paid: Math.min(round2(allocated), total), datePaid: allocated > 0 ? bankDate : null }
}

/**
 * The day the money actually reached the bank, per invoice: the latest bank
 * line matched to it in reconciliation. This — not the send date or when
 * someone clicked "Mark as paid" — is the "received on" date we show.
 */
export async function loadBankPaidDateByInvoice(supabase: SupabaseClient, invoiceIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (invoiceIds.length === 0) return map
  const { data } = await supabase
    .from('invoice_payment_allocations')
    .select('invoice_id, bank_transactions ( txn_date )')
    .in('invoice_id', invoiceIds)
    .is('reversed_at', null)
  for (const r of (data ?? []) as Array<{ invoice_id: string; bank_transactions: { txn_date: string | null } | Array<{ txn_date: string | null }> | null }>) {
    const bt = Array.isArray(r.bank_transactions) ? r.bank_transactions[0] : r.bank_transactions
    const d = bt?.txn_date?.slice(0, 10)
    if (d && (!map.has(r.invoice_id) || d > (map.get(r.invoice_id) as string))) map.set(r.invoice_id, d)
  }
  return map
}
