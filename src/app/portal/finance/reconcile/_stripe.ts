// Stripe payout runner: for each un-cleared Stripe credit on the bank feed, ask
// Stripe which payout it is and which card payments made it up, then (via the
// pure engine in lib/stripe-payout-reconcile) allocate the invoices GROSS and
// record Stripe's fees as a "Bank fees" expense on the same line.
// Server-only helper; the calling server action checks isAdminUser.

import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getStripe, getStripeMode } from '@/lib/stripe'
import { round2 } from '@/lib/payment-allocation'
import { proposeStripePayout, type StripeInvoiceRef, type StripePayoutLine } from '@/lib/stripe-payout-reconcile'
import { applyBankAllocation, invoicePayableTotal } from './_apply'

export interface StripeCredit {
  id: string
  date: string
  amount: number
}

export interface StripeReconcileSummary {
  matched: number
  matchedAmount: number
  /** Stripe fees recorded as bank-fees expenses this run. */
  feesRecorded: number
  /** Lines that will resolve on their own (quote not yet invoiced). */
  waiting: string[]
  /** Lines that need a human, with the reason. */
  review: string[]
  failures: string[]
  /** Set when the migration or Stripe key isn't in place. */
  setupNeeded: string | null
}

type Rec = Record<string, unknown>
const DAY = 86400
const cents = (n: number) => Math.round(n * 100)
const dollars = (c: number) => round2(c / 100)

/** Postgres "column does not exist" / PostgREST unknown column. */
function isMissingColumn(err: { code?: string; message?: string } | null): boolean {
  return !!err && (err.code === '42703' || err.code === 'PGRST204' || /column .* does not exist|Could not find the .* column/i.test(err.message ?? ''))
}

/** The Stripe payout that landed as this bank credit: same amount (to the
 *  cent), arriving within a few days of the bank date. Null unless exactly one. */
async function findPayout(stripe: Stripe, credit: StripeCredit): Promise<Stripe.Payout | 'none' | 'many'> {
  const bankDay = Math.floor(Date.parse(`${credit.date}T00:00:00Z`) / 1000)
  const found: Stripe.Payout[] = []
  for await (const p of stripe.payouts.list({ arrival_date: { gte: bankDay - 5 * DAY, lte: bankDay + 2 * DAY }, limit: 100 })) {
    if (p.amount === cents(credit.amount) && p.currency === 'nzd' && p.status !== 'failed' && p.status !== 'canceled') found.push(p)
  }
  if (found.length === 0) return 'none'
  if (found.length > 1) return 'many'
  return found[0]
}

async function payoutLines(stripe: Stripe, payoutId: string): Promise<StripePayoutLine[]> {
  const lines: StripePayoutLine[] = []
  for await (const bt of stripe.balanceTransactions.list({ payout: payoutId, limit: 100, expand: ['data.source'] })) {
    const src = bt.source && typeof bt.source === 'object' ? (bt.source as unknown as { object?: string; payment_intent?: string | { id: string } | null }) : null
    const pi = src?.object === 'charge' ? src.payment_intent : null
    lines.push({
      id: bt.id,
      type: bt.type,
      gross: dollars(bt.amount),
      fee: dollars(bt.fee),
      net: dollars(bt.net),
      paymentIntentId: typeof pi === 'string' ? pi : pi?.id ?? null,
      feeIncludesGst: (bt.fee_details ?? []).some((f) => f.type === 'tax' && f.amount > 0),
    })
  }
  return lines
}

export async function runStripePayoutReconcile(supabase: SupabaseClient, userId: string | null, credits: StripeCredit[]): Promise<StripeReconcileSummary> {
  const summary: StripeReconcileSummary = { matched: 0, matchedAmount: 0, feesRecorded: 0, waiting: [], review: [], failures: [], setupNeeded: null }
  if (credits.length === 0) return summary

  if (getStripeMode() === 'unconfigured') {
    summary.setupNeeded = 'Stripe is not configured, so Stripe payouts can’t be matched automatically.'
    return summary
  }
  // Needs docs/db/2026-10-20-stripe-payout-reconcile.sql (fee columns on the line).
  const { data: lineRows, error: colErr } = await supabase
    .from('bank_transactions')
    .select('id, fee_expense_id, stripe_payout_id')
    .in('id', credits.map((c) => c.id))
  if (colErr) {
    if (isMissingColumn(colErr)) {
      summary.setupNeeded = 'Run docs/db/2026-10-20-stripe-payout-reconcile.sql to auto-match Stripe payouts (net of Stripe fees).'
      return summary
    }
    throw new Error(`Stripe payout load failed: ${colErr.message}`)
  }
  const lineById = new Map(((lineRows ?? []) as Rec[]).map((r) => [r.id as string, r]))

  const stripe = getStripe()
  for (const credit of credits) {
    const label = `${credit.date} ${credit.amount.toFixed(2)}`
    try {
      const payout = await findPayout(stripe, credit)
      if (payout === 'none') { summary.review.push(`${label}: no Stripe payout of that amount around that date.`); continue }
      if (payout === 'many') { summary.review.push(`${label}: more than one Stripe payout of that amount — match by hand.`); continue }

      const lines = await payoutLines(stripe, payout.id)
      const intents = Array.from(new Set(lines.map((l) => l.paymentIntentId).filter(Boolean) as string[]))

      const [invQ, quoteQ] = await Promise.all([
        intents.length
          ? supabase
              .from('invoices')
              .select('id, invoice_number, base_price, discount, gst_included, stripe_payment_intent_id, invoice_items ( price )')
              .in('stripe_payment_intent_id', intents)
              .is('deleted_at', null)
              .neq('status', 'cancelled')
          : Promise.resolve({ data: [], error: null }),
        intents.length
          ? supabase.from('quotes').select('quote_number, stripe_payment_intent_id').in('stripe_payment_intent_id', intents)
          : Promise.resolve({ data: [], error: null }),
      ])
      if (invQ.error || quoteQ.error) throw new Error((invQ.error ?? quoteQ.error)!.message)

      const invRows = (invQ.data ?? []) as Rec[]
      const { data: allocRows, error: aErr } = invRows.length
        ? await supabase.from('invoice_payment_allocations').select('invoice_id, amount_allocated').in('invoice_id', invRows.map((i) => i.id as string)).is('reversed_at', null)
        : { data: [], error: null }
      if (aErr) throw new Error(aErr.message)
      const allocated = new Map<string, number>()
      for (const a of (allocRows ?? []) as Rec[]) allocated.set(a.invoice_id as string, round2((allocated.get(a.invoice_id as string) ?? 0) + Number(a.amount_allocated ?? 0)))

      const invoiceByIntent = new Map<string, StripeInvoiceRef>()
      for (const i of invRows) {
        invoiceByIntent.set(i.stripe_payment_intent_id as string, {
          id: i.id as string,
          number: (i.invoice_number as string | null) ?? '',
          total: invoicePayableTotal(i),
          allocated: allocated.get(i.id as string) ?? 0,
        })
      }
      const quoteByIntent = new Map<string, string>()
      for (const q of (quoteQ.data ?? []) as Rec[]) quoteByIntent.set(q.stripe_payment_intent_id as string, (q.quote_number as string | null) ?? 'a quote')

      const p = proposeStripePayout({
        payoutId: payout.id,
        payoutAmount: dollars(payout.amount),
        bankAmount: credit.amount,
        lines,
        invoiceByIntent,
        quoteByIntent,
      })
      if (!p.ok) {
        ;(p.waiting ? summary.waiting : summary.review).push(`${label}: ${p.why}`)
        continue
      }

      // Record the fee expense first (re-using one from an earlier attempt).
      const existing = lineById.get(credit.id)
      let expenseId = (existing?.fee_expense_id as string | null) ?? null
      let createdExpense = false
      if (p.fee > 0 && !expenseId) {
        const { data: exp, error: eErr } = await supabase
          .from('expenses')
          .insert({
            expense_date: credit.date,
            amount: p.fee,
            category: 'bank_fees',
            vendor: 'Stripe',
            description: `Stripe card processing fees — payout ${payout.id} (${p.numbers.join(', ')})`,
            payment_reference: payout.id,
            // Only GST-inclusive when Stripe itself charged GST on the fee.
            gst_inclusive: p.feeIncludesGst,
            notes: 'Deducted by Stripe from the payout; recorded automatically by bank reconciliation.',
            created_by: userId,
          })
          .select('id')
          .single()
        if (eErr || !exp) throw new Error(`could not record the Stripe fee: ${eErr?.message ?? 'no row'}`)
        expenseId = exp.id as string
        createdExpense = true
      }
      const { error: lErr } = await supabase
        .from('bank_transactions')
        .update({ fee_amount: p.fee, fee_expense_id: expenseId, stripe_payout_id: payout.id })
        .eq('id', credit.id)
      if (lErr) {
        if (createdExpense && expenseId) await supabase.from('expenses').delete().eq('id', expenseId)
        throw new Error(`could not link the payout: ${lErr.message}`)
      }

      const res = await applyBankAllocation(supabase, {
        lineId: credit.id,
        allocations: p.allocations,
        paidDate: credit.date,
        method: 'stripe_payout',
        matchReason: p.reason,
        userId,
        feeAmount: p.fee,
      })
      if (!res.ok) {
        // Leave the line as it was so the next run (or a human) starts clean.
        await supabase.from('bank_transactions').update({ fee_amount: null, fee_expense_id: null, stripe_payout_id: null }).eq('id', credit.id)
        if (createdExpense && expenseId) await supabase.from('expenses').delete().eq('id', expenseId)
        summary.failures.push(`${label}: ${res.error}`)
        continue
      }
      summary.matched += 1
      summary.matchedAmount = round2(summary.matchedAmount + credit.amount)
      if (createdExpense) summary.feesRecorded = round2(summary.feesRecorded + p.fee)
    } catch (e) {
      summary.failures.push(`${label}: ${e instanceof Error ? e.message : 'Stripe lookup failed'}`)
    }
  }
  return summary
}
