// Automatic payments by NZ direct debit (Stripe NZ BECS).
//
// 1. Setup  — staff create a link (Stripe Checkout in "setup" mode, NZ bank
//    account only). The client enters their account and accepts the direct
//    debit authority on Stripe's page. The webhook saves the payment method on
//    the client and marks autopay 'active'.
// 2. Collect — when one of their invoices is SENT (manually or by the weekly
//    run), we create a PaymentIntent for the balance owed against the saved
//    account. Bank debits take a few days; Stripe's webhook flips the invoice
//    to paid when the money clears, or flags it if it fails.
//
// No card fee: this is a bank debit. Our portal stays the only source of
// invoices — Stripe just stores the account and collects.

import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getStripe } from './stripe'
import { invoiceBalanceDue, loadAllocatedByInvoice, type InvoiceAmountFields } from './invoice-balance'

export type AutopayStatus = 'none' | 'active' | 'paused' | 'failed'

export const AUTOPAY_PAYMENT_METHOD = 'nz_bank_account' as const

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
      payment_method_types: [AUTOPAY_PAYMENT_METHOD],
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
    let intentId: string
    try {
      const intent = await stripe.paymentIntents.create({
        amount: cents,
        currency: 'nzd',
        customer: client.stripe_customer_id,
        payment_method: client.autopay_payment_method_id,
        payment_method_types: [AUTOPAY_PAYMENT_METHOD],
        off_session: true,
        confirm: true,
        description: `Sano invoice ${inv.invoice_number}`,
        metadata: { kind: 'autopay', invoice_id: invoiceId, invoice_number: inv.invoice_number as string, client_id: client.id },
      // Retrying after a failure must be a NEW debit: the key includes the failed
      // attempt's id, so a double-click can't debit twice but a retry can run.
      }, { idempotencyKey: `autopay-${invoiceId}-${cents}-${(inv.autopay_payment_intent_id as string | null) ?? 'first'}` })
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
      before: null, after: { payment_intent: intentId, amount: cents / 100 },
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
