import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

function getPublicSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { share_token } = body

    if (!share_token) {
      return NextResponse.json({ error: 'Missing share token' }, { status: 400 })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    const supabase = getPublicSupabase()

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, base_price, discount, gst_included, share_token, clients ( name, email ), invoice_items ( price )')
      .eq('share_token', share_token)
      .single()

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })
    }

    const items = (invoice.invoice_items ?? []) as { price: number }[]
    const addons = items.reduce((sum, i) => sum + (i.price ?? 0), 0)
    const total = (invoice.base_price ?? 0) + addons - (invoice.discount ?? 0)

    if (total <= 0) {
      return NextResponse.json({ error: 'Invoice total must be greater than zero' }, { status: 400 })
    }

    const client = invoice.clients as unknown as { name: string; email: string | null } | null
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

    const stripe = getStripe()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'nzd',
      customer_email: client?.email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'nzd',
            unit_amount: Math.round(total * 100),
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: 'Sano cleaning services',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        share_token,
      },
      success_url: `${siteUrl}/share/invoice/${share_token}?payment=success`,
      cancel_url: `${siteUrl}/share/invoice/${share_token}?payment=cancelled`,
    })

    await supabase
      .from('invoices')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', invoice.id)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[create-checkout] Error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
