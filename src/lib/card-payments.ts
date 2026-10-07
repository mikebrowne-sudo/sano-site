// Who gets offered card payment (Stripe "Pay now"), and how a card payment
// taken on a quote carries across to the invoice made from it.
//
//   • Invoices: cash-sale invoices offer a card by default; on-account ones
//     don't — unless staff tick "Show Pay now" on that invoice
//     (invoices.allow_card_payment: null = the default, true/false = override).
//     A customer can be set to always get it (clients.allow_card_payment), which
//     applies to every invoice that has no override of its own.
//     Only issued, unpaid invoices are payable.
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

type CardFields = {
  payment_type?: string | null
  allow_card_payment?: boolean | null
  /** The customer's standing setting (clients.allow_card_payment). */
  client_allow_card_payment?: boolean | null
}

/** Does this invoice offer card payment at all (ignoring its status)?
 *  Invoice override → customer "always show" → payment-type default. */
export function invoiceOffersCard(i: CardFields): boolean {
  if (i.allow_card_payment === true || i.allow_card_payment === false) return i.allow_card_payment
  if (i.client_allow_card_payment === true) return true
  return !isOnAccount(i.payment_type)
}

/** Reads the customer's setting off a joined `clients ( allow_card_payment )`. */
export function clientCardSetting(clients: unknown): boolean | null {
  const c = (Array.isArray(clients) ? clients[0] : clients) as { allow_card_payment?: boolean | null } | null | undefined
  return c?.allow_card_payment ?? null
}

export function invoiceCardPayable(i: CardFields & { status?: string | null }): boolean {
  if (!invoiceOffersCard(i)) return false
  return !['draft', 'cancelled', 'paid'].includes(i.status ?? '')
}

type QuoteCardFields = {
  payment_type?: string | null
  status?: string | null
  frequency?: string | null
  service_category?: string | null
}

/** The kind of quote that can be paid by card once accepted (status aside). */
export function quoteCardEligible(q: QuoteCardFields): boolean {
  if (isOnAccount(q.payment_type)) return false
  if (q.service_category === 'commercial') return false
  return isOneOff(q.frequency)
}

export function quoteCardPayable(q: QuoteCardFields): boolean {
  return quoteCardEligible(q) && (q.status === 'accepted' || q.status === 'converted')
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
