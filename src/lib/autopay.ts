// Automatic payments — only for a customer who asks for them.
//
// 1. Setup  — staff email the customer a link (or copy it). The link never
//    expires: each visit makes a fresh Stripe Checkout page in "setup" mode,
//    where the customer chooses NZ bank account (direct debit, no fee) or card
//    (2.5% card fee), enters it themselves and accepts the authority. Sano
//    never sees or handles the numbers. The webhook saves the payment method on
//    the client and marks autopay 'active'.
// 2. Collect — when one of their invoices is SENT (manually or by the weekly
//    run), we create a PaymentIntent for the balance owed against the saved
//    account. Bank debits take a few days; Stripe's webhook flips the invoice
//    to paid when the money clears, or flags it if it fails.
//
// Bank debit: no fee. Card: the same 2.5% card fee as Pay now, added to the
// charge and as a line on the invoice once paid. Our portal stays the only
// source of invoices — Stripe just stores the method and collects.

import { createHmac, timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getStripe } from './stripe'
import { invoiceBalanceDue, loadAllocatedByInvoice, type InvoiceAmountFields } from './invoice-balance'
import { cardFee, cardFeeItemPrice } from './card-payments'

export type AutopayStatus = 'none' | 'active' | 'paused' | 'failed'

export const AUTOPAY_PAYMENT_METHOD = 'nz_bank_account' as const
/** What the customer can choose on the setup page. */
export const AUTOPAY_SETUP_METHODS = ['nz_bank_account', 'card'] as const

// ── Non-expiring setup link ─────────────────────────────────────────────────
// /api/autopay/<clientId>.<signature>. Signed with a server-only secret so the
// client id can't be guessed or swapped; opening it makes a fresh Stripe page.

function linkSecret(): string {
  const s = process.env.AUTOPAY_LINK_SECRET || process.env.STRIPE_SECRET_KEY || ''
  if (!s) throw new Error('No secret available to sign autopay links.')
  return s
}
function sign(clientId: string): string {
  return createHmac('sha256', linkSecret()).update(`autopay:${clientId}`).digest('base64url').slice(0, 32)
}
export function autopayLinkToken(clientId: string): string {
  return `${clientId}.${sign(clientId)}`
}
/** The client id the token was made for, or null if it's been tampered with. */
export function verifyAutopayLinkToken(token: string): string | null {
  const [clientId, sig] = token.split('.')
  if (!clientId || !sig) return null
  const want = Buffer.from(sign(clientId))
  const got = Buffer.from(sig)
  return want.length === got.length && timingSafeEqual(want, got) ? clientId : null
}
export function autopayLinkUrl(origin: string, clientId: string): string {
  return `${origin}/api/autopay/${autopayLinkToken(clientId)}`
}

/** Stripe Checkout "setup" link for a client to save their bank account. */
export async function createAutopaySetupLink(
  supabase: SupabaseClient,
  clientId: string,
  origin: string,
): Promise<{ url: string } | { error: string }> {
  if (!process.env.STRIPE_SECRET_KEY) return { error: 'Stripe is not configured.' }
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, email, accounts_email, stripe_customer_id')
    .eq('id', clientId)
    .maybeSingle()
  if (!client) return { error: 'Client not found.' }

  const stripe = getStripe()
  let customerId = (client.stripe_customer_id as string | null) ?? null
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: (client.name as string | null) ?? undefined,
      email: ((client.accounts_email || client.email) as string | null) ?? undefined,
      metadata: { client_id: clientId },
    })
    customerId = customer.id
    const { error } = await supabase.from('clients').update({ stripe_customer_id: customerId }).eq('id', clientId)
    if (error) return { error: `Could not save the Stripe customer: ${error.message}` }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      currency: 'nzd',
      customer: customerId,
      payment_method_types: [...AUTOPAY_SETUP_METHODS],
      metadata: { kind: 'autopay_setup', client_id: clientId },
      setup_intent_data: { metadata: { kind: 'autopay_setup', client_id: clientId } },
      success_url: `${origin}/share/direct-debit`,
      cancel_url: `${origin}/share/direct-debit?cancelled=1`,
    })
    if (!session.url) return { error: 'Stripe did not return a link.' }
    return { url: session.url }
  } catch (e) {
    return { error: `Stripe: ${e instanceof Error ? e.message : 'could not create the setup page.'}` }
  }
}

/**
 * Collect a sent invoice from the client's saved bank account. Safe to call on
 * any invoice: it does nothing unless the client has autopay active and the
 * invoice is sent, owing, and not already being collected. Never throws.
 */
export async function collectInvoiceByAutopay(
  svc: SupabaseClient,
  invoiceId: string,
): Promise<{ started: boolean; reason?: string; error?: string }> {
  try {
    const { data: inv } = await svc
      .from('invoices')
      .select('id, invoice_number, status, deleted_at, autopay_status, autopay_payment_intent_id, base_price, discount, gst_included, invoice_items ( price ), clients ( id, name, stripe_customer_id, autopay_payment_method_id, autopay_status )')
      .eq('id', invoiceId)
      .maybeSingle()
    if (!inv) return { started: false, reason: 'invoice not found' }
    const client = (Array.isArray(inv.clients) ? inv.clients[0] : inv.clients) as {
      id: string; name: string | null; stripe_customer_id: string | null; autopay_payment_method_id: string | null; autopay_status: string | null
    } | null
    if (!client || client.autopay_status !== 'active' || !client.stripe_customer_id || !client.autopay_payment_method_id) {
      return { started: false, reason: 'autopay not active for this client' }
    }
    if (inv.deleted_at || inv.status !== 'sent') return { started: false, reason: 'invoice is not sent / unpaid' }
    if (inv.autopay_status === 'processing' || inv.autopay_status === 'succeeded') return { started: false, reason: 'already being collected' }

    const allocated = (await loadAllocatedByInvoice(svc, [invoiceId])).get(invoiceId) ?? 0
    const due = invoiceBalanceDue(inv as unknown as InvoiceAmountFields, allocated)
    const cents = Math.round(due * 100)
    if (cents <= 0) return { started: false, reason: 'nothing owing' }

    const stripe = getStripe()
    // Bank account or card? A card charge carries the 2.5% card fee (added to
    // the invoice as a line when it's paid — same as Pay now).
    const pm = await stripe.paymentMethods.retrieve(client.autopay_payment_method_id)
    const isCard = pm.type === 'card'
    const fee = isCard ? cardFee(cents / 100) : 0
    const chargeCents = cents + Math.round(fee * 100)
    let intentId: string
    try {
      const intent = await stripe.paymentIntents.create({
        amount: chargeCents,
        currency: 'nzd',
        customer: client.stripe_customer_id,
        payment_method: client.autopay_payment_method_id,
        payment_method_types: [pm.type],
        off_session: true,
        confirm: true,
        description: `Sano invoice ${inv.invoice_number}${isCard ? ' (incl. 2.5% card fee)' : ''}`,
        metadata: {
          kind: 'autopay', invoice_id: invoiceId, invoice_number: inv.invoice_number as string, client_id: client.id,
          ...(isCard ? { card_fee: fee.toFixed(2), card_fee_item_price: cardFeeItemPrice(fee, !!inv.gst_included).toFixed(2) } : {}),
        },
      // Retrying after a failure must be a NEW debit: the key includes the failed
      // attempt's id, so a double-click can't debit twice but a retry can run.
      }, { idempotencyKey: `autopay-${invoiceId}-${chargeCents}-${(inv.autopay_payment_intent_id as string | null) ?? 'first'}` })
      intentId = intent.id
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Stripe refused the debit.'
      await svc.from('invoices').update({ autopay_status: 'failed', autopay_error: msg, autopay_requested_at: new Date().toISOString() }).eq('id', invoiceId)
      await notifyAutopayFailure(inv.invoice_number as string, client.name ?? 'Client', msg)
      return { started: false, error: msg }
    }

    await svc.from('invoices').update({
      autopay_status: 'processing',
      autopay_payment_intent_id: intentId,
      autopay_error: null,
      autopay_requested_at: new Date().toISOString(),
    }).eq('id', invoiceId)
    await svc.from('audit_log').insert({
      actor_id: null, actor_role: 'system', action: 'invoice.autopay_requested',
      entity_table: 'invoices', entity_id: invoiceId,
      before: null, after: { payment_intent: intentId, amount: chargeCents / 100, method: pm.type, card_fee: fee || null },
    })
    return { started: true }
  } catch (e) {
    console.error('[autopay] collect failed', e)
    return { started: false, error: e instanceof Error ? e.message : 'unexpected error' }
  }
}

export async function notifyAutopayFailure(invoiceNumber: string, clientName: string, reason: string): Promise<void> {
  const to = process.env.SANO_NOTIFY_EMAIL
  if (!to || !process.env.RESEND_API_KEY) return
  try {
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: 'Sano <noreply@sano.nz>',
      to,
      subject: `Direct debit failed: ${invoiceNumber} (${clientName})`,
      html: `<p>The automatic direct debit for <strong>${invoiceNumber}</strong> (${clientName}) did not go through.</p><p>Reason: ${reason.replace(/</g, '&lt;')}</p><p>The invoice is still unpaid and will show in overdue reminders. You can retry from the invoice page once it's sorted.</p>`,
    })
  } catch (e) {
    console.error('[autopay] failure email failed', e)
  }
}

// ── Setup email ───────────────────────────────────────────────────────────────

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function renderAutopaySetupEmail(i: { greeting: string; url: string }): { subject: string; html: string } {
  const SAGE = '#076653', INK = '#06231D', MUTED = '#5C6B64', LINE = '#E0EAE3', CREAM = '#FAF9F6'
  return {
    subject: 'Set up automatic payments with Sano',
    html: `
  <div style="font-family:Arial,Helvetica,sans-serif;color:${INK};font-size:15px;line-height:1.55;max-width:560px;">
    <p style="margin:0 0 14px;">${esc(i.greeting)}</p>
    <p style="margin:0 0 14px;">As requested, here's the secure link to set up automatic payments for your Sano invoices. Once it's set up, each invoice we send you is paid automatically, so there's nothing to remember.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:520px;background:${CREAM};border:1px solid ${LINE};border-radius:12px;">
      <tr><td style="padding:16px 20px;font-size:14px;">
        <p style="margin:0 0 8px;font-weight:700;color:${SAGE};">You can choose either:</p>
        <p style="margin:0 0 6px;"><strong>Bank account (direct debit)</strong>: no fee. Each payment takes a few working days to clear.</p>
        <p style="margin:0;"><strong>Card</strong>: a 2.5% card processing fee is added to each payment.</p>
      </td></tr>
    </table>
    <p style="margin:22px 0 6px;">
      <a href="${esc(i.url)}" style="display:inline-block;padding:12px 24px;background:${SAGE};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Set up automatic payments</a>
    </p>
    <p style="margin:12px 0 0;color:${MUTED};font-size:12px;">The page is run by Stripe, our payments provider. You enter your details there yourself and Sano never sees your full account or card number. We'll still email you every invoice, and you can ask us to stop automatic payments at any time.</p>
    <p style="margin:22px 0 0;">Kind regards,<br>The Sano team</p>
    <p style="margin:18px 0 0;color:#888888;font-size:12px;">Sano Property Services Limited</p>
  </div>`,
  }
}
