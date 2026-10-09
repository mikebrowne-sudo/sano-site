import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { stampJobCompleteOnPaidInvoice } from '@/lib/job-paid-complete'
import { addCardFeeLine, applyQuoteCardPayment } from '@/lib/card-payments'
import { nzToday } from '@/lib/nz-date'
import Stripe from 'stripe'

function getServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const stripe = getStripe()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // A completed session is not necessarily a PAID one — an async method (or a
    // session that expired unpaid) also fires this event. Only money actually
    // received may mark an invoice paid.
    if (session.payment_status !== 'paid') {
      console.log('[stripe-webhook] Session completed but not paid:', session.payment_status)
      return NextResponse.json({ received: true })
    }

    // A paid QUOTE (accepted one-off cash-sale job, paid upfront). Recorded on
    // the quote; the invoice later made from it is marked paid on creation
    // (lib/card-payments applyQuoteCardPayment). If an invoice already exists
    // for the quote, apply it to that now.
    if (session.metadata?.kind === 'quote') {
      const quoteId = session.metadata?.quote_id
      if (!quoteId) {
        console.error('[stripe-webhook] No quote_id in metadata')
        return NextResponse.json({ received: true })
      }
      const supabase = getServerSupabase()
      const { error } = await supabase
        .from('quotes')
        .update({
          card_paid_at: new Date().toISOString(),
          card_amount_paid: (session.amount_total ?? 0) / 100,
          // The 2.5% card fee inside that total — carried onto the invoice as a line.
          card_fee_amount: Number(session.metadata?.card_fee ?? 0) || 0,
          stripe_payment_intent_id: (session.payment_intent as string) || null,
        })
        .eq('id', quoteId)
        .is('card_paid_at', null)
      if (error) {
        console.error('[stripe-webhook] Failed to record quote payment:', error.message)
        // Non-2xx so Stripe retries — the payment must not be lost.
        return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
      }
      const { data: invs } = await supabase.from('invoices').select('id').eq('quote_id', quoteId).is('deleted_at', null)
      for (const inv of invs ?? []) await applyQuoteCardPayment(supabase, inv.id as string)
      console.log(`[stripe-webhook] Quote ${session.metadata?.quote_number} paid by card`)
      return NextResponse.json({ received: true })
    }

    const invoiceId = session.metadata?.invoice_id
    if (!invoiceId) {
      console.error('[stripe-webhook] No invoice_id in metadata')
      return NextResponse.json({ received: true })
    }

    const supabase = getServerSupabase()
    // NZ calendar date — the UTC date is still yesterday every NZ morning.
    const today = nzToday()

    // Only flip an invoice that is NOT already paid.
    //
    // Stripe retries a webhook until it gets a 2xx, and can deliver the same
    // event more than once. Without the status guard a retry would overwrite
    // date_paid with the retry's date, and would re-stamp the job complete —
    // moving a payment's recorded date for no reason. `.neq` makes the update
    // idempotent: the second delivery matches no row and changes nothing.
    const { data: flipped, error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        date_paid: today,
        stripe_payment_intent_id: session.payment_intent as string || null,
      })
      .eq('id', invoiceId)
      .neq('status', 'paid')
      .select('id')

    if (error) {
      console.error('[stripe-webhook] Failed to update invoice:', error.message)
    } else {
      // The 2.5% card fee becomes a line on the invoice (first delivery only —
      // a retry flips nothing, so it never adds the fee twice).
      if ((flipped ?? []).length > 0) {
        await addCardFeeLine(supabase, invoiceId, Number(session.metadata?.card_fee_item_price ?? 0))
      }
      console.log(`[stripe-webhook] Invoice ${session.metadata?.invoice_number} marked as paid`)
      // A paid invoice means the job is paid work — stamp it complete.
      await stampJobCompleteOnPaidInvoice(supabase, invoiceId)
    }
  }

  return NextResponse.json({ received: true })
}
