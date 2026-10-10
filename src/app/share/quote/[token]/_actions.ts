'use server'

import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { getServiceSupabase } from '@/lib/supabase-service'
import { getCustomerReplyToEmail } from '@/lib/email-reply-to'

// Phase 5.5.6 — uses service-role for the share-route flow. See the
// page.tsx comment for the rationale.

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function acceptQuote(shareToken: string) {
  const supabase = getServiceSupabase()

  // Load quote by share token
  const { data: quote, error: loadErr } = await supabase
    .from('quotes')
    .select('id, quote_number, status, accepted_at, is_latest_version, clients ( name, email )')
    .eq('share_token', shareToken)
    .is('deleted_at', null)
    .single()

  if (loadErr || !quote) {
    return { error: 'Quote not found.' }
  }

  // Idempotent — already accepted. Still revalidate portal paths in case a previous
  // acceptance request updated the DB without revalidating (older builds of this action).
  if (quote.status === 'accepted' && quote.accepted_at) {
    revalidatePath(`/share/quote/${shareToken}`)
    revalidatePath(`/portal/quotes/${quote.id}`)
    revalidatePath('/portal/quotes')
    return { success: true, alreadyAccepted: true }
  }

  // Already booked (converted to a job / invoice): nothing to do — and never
  // move it backwards to 'accepted'.
  if (quote.status === 'converted') {
    return { success: true, alreadyAccepted: true }
  }
  // Only a live, issued, current version can be accepted.
  if (quote.is_latest_version === false) {
    return { error: 'This quote has been updated. Please use the latest version we sent you, or give us a call.' }
  }
  if (!['sent', 'viewed'].includes(quote.status as string)) {
    return { error: 'This quote can no longer be accepted online. Please give us a call on 0800 726 686 and we’ll sort it out.' }
  }

  // Update status + accepted_at. Never overwrite an existing accepted_at.
  const now = new Date().toISOString()
  const { error: updateErr } = await supabase
    .from('quotes')
    .update({ status: 'accepted', accepted_at: quote.accepted_at || now })
    .eq('id', quote.id)
    .in('status', ['sent', 'viewed'])

  if (updateErr) {
    // Never show a customer raw database text.
    console.error('[accept-quote] update failed:', updateErr.message)
    return { error: 'Something went wrong accepting your quote. Please try again, or call us on 0800 726 686.' }
  }

  // Phase 6 — audit the public-share acceptance. actor_id is NULL because
  // there's no auth session on the share route; actor_role distinguishes
  // it from staff acceptance flows. Uses the service-role client because
  // audit_log INSERT is restricted to authenticated.
  const service = getServiceSupabase()
  await service.from('audit_log').insert({
    actor_id: null,
    actor_role: 'public_share',
    action: 'quote.status-changed',
    entity_table: 'quotes',
    entity_id: quote.id,
    before: { status: quote.status },
    after: { status: 'accepted', accepted_at: quote.accepted_at || now, source: 'share_page_accept' },
  })

  // Send confirmation email
  const client = quote.clients as unknown as { name: string; email: string | null } | null
  if (client?.email) {
    const firstName = client.name.split(/\s+/)[0]
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Sano <noreply@sano.nz>',
        replyTo: getCustomerReplyToEmail(),
        to: client.email,
        subject: `Quote ${quote.quote_number} accepted — Sano`,
        html: `
          <p>Hi ${esc(firstName)},</p>
          <p>Thanks for accepting quote <strong>${esc(quote.quote_number)}</strong>.</p>
          <p>We'll be in touch shortly to confirm next steps and schedule your service.</p>
          <p>If you have any questions in the meantime, just reply to this email.</p>
          <p>Kind regards,<br>The Sano team</p>
          <p style="color:#888;font-size:13px;margin-top:24px;">Sano Property Services Limited</p>
        `,
      })
    } catch (err) {
      console.error('[accept-quote] Email failed:', err)
    }
  }

  // Also notify admin
  const notifyEmail = process.env.SANO_NOTIFY_EMAIL
  if (notifyEmail) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Sano <noreply@sano.nz>',
        to: notifyEmail,
        subject: `Quote accepted: ${quote.quote_number} — ${client?.name ?? 'Unknown'}`,
        html: `
          <p><strong>${esc(quote.quote_number)}</strong> has been accepted by <strong>${esc(client?.name ?? 'the client')}</strong>.</p>
          <p>Accepted at: ${fmtDate(now)}</p>
        `,
      })
    } catch (err) {
      console.error('[accept-quote] Admin notify failed:', err)
    }
  }

  revalidatePath(`/share/quote/${shareToken}`)
  revalidatePath(`/portal/quotes/${quote.id}`)
  revalidatePath('/portal/quotes')
  return { success: true }
}

/**
 * Customer asks a question / requests changes from the quote page. Emails the
 * team (reply-to the customer) and logs it against the quote. Rate-limited by
 * length only — the share token is the credential, as for accepting.
 */
export async function requestQuoteChanges(shareToken: string, message: string, replyEmail: string) {
  const text = (message ?? '').trim()
  if (text.length < 3) return { error: 'Please add a short message.' }
  if (text.length > 2000) return { error: 'Please keep your message under 2,000 characters.' }
  const email = (replyEmail ?? '').trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Please check your email address.' }

  const supabase = getServiceSupabase()
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, quote_number, contact_email, clients ( name, email )')
    .eq('share_token', shareToken)
    .is('deleted_at', null)
    .maybeSingle()
  if (!quote) return { error: 'Quote not found.' }

  // At most 5 messages per quote per hour — stops a leaked link flooding the inbox.
  const { count: recent } = await supabase
    .from('audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('entity_id', quote.id)
    .eq('action', 'quote.change_requested')
    .gte('created_at', new Date(Date.now() - 60 * 60_000).toISOString())
  if ((recent ?? 0) >= 5) return { error: 'Thanks, we’ve got your messages. We’ll be in touch shortly, or call us on 0800 726 686.' }

  const client = quote.clients as unknown as { name: string | null; email: string | null } | null
  const replyTo = email || (quote.contact_email as string | null) || client?.email || undefined
  const notifyEmail = process.env.SANO_NOTIFY_EMAIL
  if (notifyEmail) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Sano <noreply@sano.nz>',
        to: notifyEmail,
        ...(replyTo ? { replyTo } : {}),
        subject: `Question / change request on ${quote.quote_number}${client?.name ? ` — ${client.name}` : ''}`,
        html: `<p><strong>${esc(client?.name ?? 'The customer')}</strong> sent a message from quote ${esc(quote.quote_number as string)}:</p>
<blockquote style="border-left:3px solid #076653;margin:12px 0;padding:4px 12px;color:#344C3D">${esc(text).replace(/\n/g, '<br>')}</blockquote>
<p>${replyTo ? `Reply to this email to answer them (${esc(replyTo)}).` : 'No email on file — please call them.'}</p>`,
      })
    } catch (e) {
      console.error('[quote-change-request] email failed:', e)
      return { error: 'Sorry, that didn’t send. Please call us on 0800 726 686.' }
    }
  }

  await supabase.from('audit_log').insert({
    actor_id: null,
    actor_role: 'public_share',
    action: 'quote.change_requested',
    entity_table: 'quotes',
    entity_id: quote.id,
    before: null,
    after: { message: text.slice(0, 500), reply_to: replyTo ?? null },
  })
  return { success: true }
}
