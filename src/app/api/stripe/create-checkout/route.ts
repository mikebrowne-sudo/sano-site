import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { getStripe } from '@/lib/stripe'
import { computeDocumentTotals } from '@/lib/doc-totals'

// Service-role client, scoped by the unguessable share_token — the same
// pattern as the share pages. This used the anon key, which only worked
// because anon could read EVERY invoice (RLS `using (true)`); that policy is
// being dropped. It also means the stripe_checkout_session_id write below now
// actually lands (anon never had UPDATE, so it silently no-op'd).

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

    const supabase = getServiceSupabase()

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, base_price, discount, gst_included, share_token, clients ( name, email ), invoice_items ( price )')
      .eq('share_token', share_token)
      .is('deleted_at', null)
      .single()

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })
    }

    // The charged amount MUST equal the invoice's own grand total, GST and all.
    //
    // This previously charged base + add-ons - discount, which silently omitted
    // GST on a GST-EXCLUSIVE invoice: the customer would see $920 on the document
    // and be charged $800 at the checkout. computeDocumentTotals is the same
    // function InvoiceDocument renders from, so the two cannot drift again.
    const items = (invoice.invoice_items ?? []) as { price: number }[]
    const addons = items.reduce((sum, i) => sum + (i.price ?? 0), 0)
    const lineTotal = (invoice.base_price ?? 0) + addons - (invoice.discount ?? 0)
    const { total } = computeDocumentTotals(lineTotal, !!invoice.gst_included)

    if (!Number.isFinite(total) || total <= 0) {
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
              // `total` is the grand total either way, so the charge always
              // includes GST regardless of how the invoice stores its prices.
              description: 'Sano cleaning services (incl. GST)',
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
