// Pay a whole statement by card in ONE Stripe Checkout.
//
// The money is still recorded per invoice: each invoice is paid its own
// balance plus its share of the 2.5% card fee (added to it as a fee line, the
// same as paying it on its own). The split is decided when the checkout is
// created and travels in the Stripe metadata, so the webhook applies exactly
// what the customer was shown and Stripe payout matching can split the one
// charge back across the invoices to the cent.

import type { SupabaseClient } from '@supabase/supabase-js'
import { invoiceBalanceDue, loadAllocatedByInvoice, type InvoiceAmountFields } from './invoice-balance'
import { cardFee, cardFeeItemPrice, clientCardSetting, invoiceOffersCard } from './card-payments'

/** Stripe metadata allows 50 keys; leave room for the fixed ones. */
export const MAX_STATEMENT_CARD_INVOICES = 40

export interface StatementPayInvoice {
  id: string
  number: string
  status: string
  balance: number
  gstIncluded: boolean
  /** Card payment is offered on this invoice (lib/card-payments rules). */
  cardOk: boolean
}

export interface StatementCardPart {
  invoiceId: string
  number: string
  /** What the invoice owes (incl. GST). */
  balance: number
  /** Its share of the card fee (incl. GST). */
  fee: number
  /** The fee line price to add to the invoice once paid. */
  feeItemPrice: number
}

export interface StatementCardPlan {
  amount: number
  fee: number
  parts: StatementCardPart[]
}

const r2 = (n: number) => Math.round(n * 100) / 100

/** Split `fee` across balances in proportion, to the cent, summing exactly. */
export function splitCardFee(balances: number[], fee: number): number[] {
  const total = balances.reduce((s, b) => s + b, 0)
  if (total <= 0 || balances.length === 0) return balances.map(() => 0)
  const feeCents = Math.round(fee * 100)
  const raw = balances.map((b) => (feeCents * b) / total)
  const floors = raw.map(Math.floor)
  let left = feeCents - floors.reduce((s, x) => s + x, 0)
  // Largest remainders take the leftover cents (stable: earlier first on ties).
  const order = raw.map((x, i) => ({ i, rem: x - Math.floor(x) })).sort((a, b) => b.rem - a.rem || a.i - b.i)
  for (const o of order) {
    if (left <= 0) break
    floors[o.i] += 1
    left -= 1
  }
  return floors.map((c) => c / 100)
}

/** The card plan for these invoices, or null if card can't be offered for all of them. */
export function statementCardPlan(invoices: StatementPayInvoice[]): StatementCardPlan | null {
  const owing = invoices.filter((i) => i.balance > 0 && i.status === 'sent')
  if (owing.length === 0 || owing.length > MAX_STATEMENT_CARD_INVOICES) return null
  if (!owing.every((i) => i.cardOk)) return null
  const amount = r2(owing.reduce((s, i) => s + i.balance, 0))
  const fee = cardFee(amount)
  const shares = splitCardFee(owing.map((i) => i.balance), fee)
  return {
    amount,
    fee,
    parts: owing.map((i, k) => ({
      invoiceId: i.id,
      number: i.number,
      balance: i.balance,
      fee: shares[k],
      feeItemPrice: cardFeeItemPrice(shares[k], i.gstIncluded),
    })),
  }
}

// ── Stripe metadata ──────────────────────────────────────────────────────────
// p0..pN = "invoiceId|number|balance|fee|feeItemPrice" (well under 500 chars each).

export function encodePlanMetadata(plan: StatementCardPlan): Record<string, string> {
  const md: Record<string, string> = { parts: String(plan.parts.length) }
  plan.parts.forEach((p, i) => {
    md[`p${i}`] = [p.invoiceId, p.number, p.balance.toFixed(2), p.fee.toFixed(2), p.feeItemPrice.toFixed(2)].join('|')
  })
  return md
}

export function decodePlanMetadata(md: Record<string, string> | null | undefined): StatementCardPart[] {
  const n = Number(md?.parts ?? 0)
  const out: StatementCardPart[] = []
  for (let i = 0; i < n; i++) {
    const [invoiceId, number, balance, fee, feeItemPrice] = (md?.[`p${i}`] ?? '').split('|')
    if (!invoiceId) continue
    out.push({ invoiceId, number: number ?? '', balance: Number(balance) || 0, fee: Number(fee) || 0, feeItemPrice: Number(feeItemPrice) || 0 })
  }
  return out
}

// ── Loading ──────────────────────────────────────────────────────────────────

type Row = InvoiceAmountFields & {
  id: string
  invoice_number: string
  status: string
  payment_type: string | null
  allow_card_payment: boolean | null
  clients: unknown
}

/** The statement's invoices with live balances + whether card is offered on each. */
export async function loadStatementPayInvoices(supabase: SupabaseClient, invoiceIds: string[]): Promise<StatementPayInvoice[]> {
  if (invoiceIds.length === 0) return []
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, payment_type, allow_card_payment, base_price, discount, gst_included, invoice_items ( price ), clients ( allow_card_payment )')
    .in('id', invoiceIds)
    .is('deleted_at', null)
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as Row[]
  const allocated = await loadAllocatedByInvoice(supabase, rows.map((r) => r.id))
  return rows
    .map((r) => ({
      id: r.id,
      number: r.invoice_number,
      status: r.status,
      balance: r.status === 'paid' ? 0 : invoiceBalanceDue(r, allocated.get(r.id) ?? 0),
      gstIncluded: !!r.gst_included,
      cardOk: invoiceOffersCard({ ...r, client_allow_card_payment: clientCardSetting(r.clients) }),
    }))
    .sort((a, b) => a.number.localeCompare(b.number))
}
