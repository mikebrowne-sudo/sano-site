import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { getStripe } from '@/lib/stripe'
import { computeDocumentTotals } from '@/lib/doc-totals'
import { invoiceBalanceDue, loadAllocatedByInvoice } from '@/lib/invoice-balance'
import { CARD_FEE_LABEL, cardFee, cardFeeItemPrice, clientCardSetting, invoiceCardPayable, quoteCardPayable } from '@/lib/card-payments'

// Service-role client, scoped by the unguessable share_token — the same
// pattern as the share pages. This used the anon key, which only worked
// because anon could read EVERY invoice (RLS `using (true)`); that policy is
// being dropped. It also means the stripe_checkout_session_id write below now
// actually lands (anon never had UPDATE, so it silently no-op'd).
//
// `kind: 'quote'` takes payment for an accepted one-off cash-sale quote; the
// default is an invoice. Who may pay by card is decided in lib/card-payments —
// re-checked here so hiding the button is never the only guard.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { share_token } = body
    const kind: 'invoice' | 'quote' = body?.kind === 'quote' ? 'quote' : 'invoice'

    if (!share_token) {
      return NextResponse.json({ error: 'Missing share token' }, { status: 400 })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    const supabase = getServiceSupabase()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

    let amount: number
    let gstIncluded = true
    let name: string
    let email: string | undefined
    let metadata: Record<string, string>
    let path: string
    let table: 'invoices' | 'quotes'
    let rowId: string

    if (kind === 'quote') {
      const { data: quote, error } = await supabase
        .from('quotes')
        .select('id, quote_number, status, payment_type, frequency, service_category, is_latest_version, base_price, discount, gst_included, card_paid_at, contact_email, clients ( email ), quote_items ( price )')
        .eq('share_token', share_token)
        .is('deleted_at', null)
        .single()
      if (error || !quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
      if (quote.card_paid_at) return NextResponse.json({ error: 'This quote has already been paid' }, { status: 400 })
      if (quote.is_latest_version === false || !quoteCardPayable(quote)) {
        return NextResponse.json({ error: 'Card payment is not available for this quote' }, { status: 400 })
      }
      const items = (quote.quote_items ?? []) as { price: number | null }[]
      const lineTotal = (quote.base_price ?? 0) + items.reduce((s, i) => s + Math.max(0, i.price ?? 0), 0) - (quote.discount ?? 0)
      amount = computeDocumentTotals(lineTotal, !!quote.gst_included).total
      gstIncluded = !!quote.gst_included
      name = `Quote ${quote.quote_number}`
      email = quote.contact_email || (quote.clients as unknown as { email: string | null } | null)?.email || undefined
      metadata = { kind: 'quote', quote_id: quote.id, quote_number: quote.quote_number, share_token }
      path = `/share/quote/${share_token}`
      table = 'quotes'
      rowId = quote.id
    } else {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, payment_type, allow_card_payment, base_price, discount, gst_included, share_token, clients ( name, email, allow_card_payment ), invoice_items ( price )')
        .eq('share_token', share_token)
        .is('deleted_at', null)
        .single()
      if (error || !invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
      if (invoice.status === 'paid') return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })
      if (!invoiceCardPayable({ ...invoice, client_allow_card_payment: clientCardSetting(invoice.clients) })) {
        return NextResponse.json({ error: 'Card payment is not available for this invoice' }, { status: 400 })
      }
      // Charge what is still owed — the grand total incl. GST (the same maths
      // InvoiceDocument renders, via computeDocumentTotals) less any part
      // payment already matched to it.
      const allocated = (await loadAllocatedByInvoice(supabase, [invoice.id])).get(invoice.id) ?? 0
      amount = invoiceBalanceDue(invoice as Parameters<typeof invoiceBalanceDue>[0], allocated)
      gstIncluded = !!invoice.gst_included
      name = `Invoice ${invoice.invoice_number}`
      email = (invoice.clients as unknown as { email: string | null } | null)?.email || undefined
      metadata = { kind: 'invoice', invoice_id: invoice.id, invoice_number: invoice.invoice_number, share_token }
      path = `/share/invoice/${share_token}`
      table = 'invoices'
      rowId = invoice.id
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount due must be greater than zero' }, { status: 400 })
    }

    // 2.5% card fee on what's being paid — shown on the pay card first, and as
    // its own line on Stripe's page. Recorded in metadata so the webhook can
    // add it to the invoice as a line once paid (lib/card-payments).
    amount = Math.round(amount * 100) / 100
    const fee = cardFee(amount)
    metadata = { ...metadata, amount_ex_fee: amount.toFixed(2), card_fee: fee.toFixed(2), card_fee_item_price: cardFeeItemPrice(fee, gstIncluded).toFixed(2) }

    const stripe = getStripe()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'nzd',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'nzd',
            unit_amount: Math.round(amount * 100),
            product_data: {
              name,
              description: 'Sano cleaning services (incl. GST)',
            },
          },
          quantity: 1,
        },
        ...(fee > 0
          ? [{
              price_data: {
                currency: 'nzd',
                unit_amount: Math.round(fee * 100),
                product_data: {
                  name: CARD_FEE_LABEL,
                  description: 'Applies to card payments only. Bank transfer has no fee.',
                },
              },
              quantity: 1,
            }]
          : []),
      ],
      metadata,
      payment_intent_data: { metadata },
      success_url: `${siteUrl}${path}?payment=success`,
      cancel_url: `${siteUrl}${path}?payment=cancelled`,
    })

    await supabase.from(table).update({ stripe_checkout_session_id: session.id }).eq('id', rowId)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[create-checkout] Error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
