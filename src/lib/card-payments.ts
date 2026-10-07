// Who gets offered card payment (Stripe "Pay now"), and how a card payment
// taken on a quote carries across to the invoice made from it.
//
//   • On-account customers are invoiced and pay on terms — never offered a card.
//   • Invoices: any other (cash-sale) invoice that is issued and not yet paid.
//   • Quotes: only a residential-style, ONE-OFF, cash-sale quote the customer
//     has accepted. Recurring quotes are priced per visit, so one payment would
//     only cover the first visit; commercial work is sold as a proposal on terms.
//
// Server routes re-check these rules — the page hiding the button is not the
// only guard.

import type { SupabaseClient } from '@supabase/supabase-js'
import { invoiceTotalInclGst } from './invoice-balance'

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function isOnAccount(paymentType: string | null | undefined): boolean {
  return (paymentType ?? '').trim().toLowerCase() === 'on_account'
}

export function isOneOff(frequency: string | null | undefined): boolean {
  const f = (frequency ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  return f === '' || f === 'one_off'
}

export function invoiceCardPayable(i: { payment_type?: string | null; status?: string | null }): boolean {
  if (isOnAccount(i.payment_type)) return false
  return !['draft', 'cancelled', 'paid'].includes(i.status ?? '')
}

export function quoteCardPayable(q: {
  payment_type?: string | null
  status?: string | null
  frequency?: string | null
  service_category?: string | null
}): boolean {
  if (isOnAccount(q.payment_type)) return false
  if (q.service_category === 'commercial') return false
  if (!isOneOff(q.frequency)) return false
  return q.status === 'accepted' || q.status === 'converted'
}

/**
 * After an invoice is created from a quote the customer already paid by card,
 * mark the invoice paid — when the card payment covers its total. A smaller
 * card payment (e.g. extras were added after the quote) is left for staff, and
 * the result says so. Never throws: invoice creation must not fail on this.
 */
export async function applyQuoteCardPayment(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<{ applied: boolean; shortBy?: number }> {
  try {
    const { data: inv } = await supabase
      .from('invoices')
      .select('id, quote_id, status, base_price, discount, gst_included, invoice_items ( price )')
      .eq('id', invoiceId)
      .maybeSingle()
    if (!inv?.quote_id || inv.status === 'paid') return { applied: false }

    const { data: q, error } = await supabase
      .from('quotes')
      .select('card_paid_at, card_amount_paid, stripe_payment_intent_id')
      .eq('id', inv.quote_id)
      .maybeSingle()
    if (error || !q?.card_paid_at) return { applied: false }

    const paid = Number(q.card_amount_paid ?? 0)
    const total = invoiceTotalInclGst(inv as Parameters<typeof invoiceTotalInclGst>[0])
    if (paid + 0.01 < total) return { applied: false, shortBy: round2(total - paid) }

    const { error: uErr } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        date_paid: String(q.card_paid_at).slice(0, 10),
        stripe_payment_intent_id: q.stripe_payment_intent_id ?? null,
      })
      .eq('id', invoiceId)
      .neq('status', 'paid')
    return { applied: !uErr }
  } catch {
    return { applied: false }
  }
}
