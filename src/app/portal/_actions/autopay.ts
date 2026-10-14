'use server'

// Automatic payments — staff controls, used from the client page and the
// recurring job page. Only ever started when a customer asks for it: staff
// email them the setup link (or copy it); the customer enters their own bank
// account or card on Stripe's page. Sano never takes payment details by phone.

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { autopayLinkUrl, renderAutopaySetupEmail } from '@/lib/autopay'
import { resolveGreeting } from '@/lib/email-greeting'
import { getCustomerReplyToEmail } from '@/lib/email-reply-to'

function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? `https://${headers().get('host') ?? 'sano.nz'}`
}

/** The customer's non-expiring setup link (for copying into your own email). */
export async function getClientAutopayLink(clientId: string): Promise<{ url: string } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  return { url: autopayLinkUrl(siteOrigin(), clientId) }
}

/** Email the customer the setup link. */
export async function emailClientAutopaySetup(clientId: string): Promise<{ ok: true; to: string } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, email, accounts_email')
    .eq('id', clientId)
    .maybeSingle()
  if (!client) return { error: 'Customer not found.' }
  const to = ((client.accounts_email || client.email) as string | null)?.trim()
  if (!to) return { error: 'This customer has no email address on file.' }

  const { data: contact } = await supabase
    .from('contacts')
    .select('full_name')
    .eq('client_id', clientId)
    .eq('contact_type', 'primary')
    .maybeSingle()
  const greeting = resolveGreeting([(contact?.full_name as string | null) ?? null, client.name as string | null], null)

  const { subject, html } = renderAutopaySetupEmail({ greeting, url: autopayLinkUrl(siteOrigin(), clientId) })
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: 'Sano <noreply@sano.nz>',
    replyTo: getCustomerReplyToEmail(),
    to,
    subject,
    html,
  })
  if (error) return { error: `Could not send: ${error.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user?.id ?? null, actor_role: 'staff', action: 'client.autopay_setup_emailed',
    entity_table: 'clients', entity_id: clientId, before: null, after: { to },
  })
  revalidatePath(`/portal/clients/${clientId}`)
  return { ok: true, to }
}

export async function setClientAutopayPaused(clientId: string, paused: boolean): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  const { data: c } = await supabase.from('clients').select('autopay_status, autopay_payment_method_id').eq('id', clientId).maybeSingle()
  if (!c?.autopay_payment_method_id) return { error: 'This customer has not set up automatic payments yet.' }
  const next = paused ? 'paused' : 'active'
  const { error } = await supabase.from('clients').update({ autopay_status: next }).eq('id', clientId)
  if (error) return { error: error.message }
  await supabase.from('audit_log').insert({
    actor_id: user?.id ?? null, actor_role: 'staff', action: paused ? 'client.autopay_paused' : 'client.autopay_resumed',
    entity_table: 'clients', entity_id: clientId, before: { autopay_status: c.autopay_status }, after: { autopay_status: next },
  })
  revalidatePath(`/portal/clients/${clientId}`)
  return { ok: true }
}
