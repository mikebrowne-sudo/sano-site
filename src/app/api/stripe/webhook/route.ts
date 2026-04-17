import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
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

    const invoiceId = session.metadata?.invoice_id
    if (!invoiceId) {
      console.error('[stripe-webhook] No invoice_id in metadata')
      return NextResponse.json({ received: true })
    }

    const supabase = getServerSupabase()
    const today = new Date().toISOString().slice(0, 10)

    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        date_paid: today,
        stripe_payment_intent_id: session.payment_intent as string || null,
      })
      .eq('id', invoiceId)

    if (error) {
      console.error('[stripe-webhook] Failed to update invoice:', error.message)
    } else {
      console.log(`[stripe-webhook] Invoice ${session.metadata?.invoice_number} marked as paid`)
    }
  }

  return NextResponse.json({ received: true })
}
