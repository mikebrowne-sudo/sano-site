'use server'

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { getServiceSupabase } from '@/lib/supabase-service'

function getPublicSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function acceptQuote(shareToken: string) {
  const supabase = getPublicSupabase()

  // Load quote by share token
  const { data: quote, error: loadErr } = await supabase
    .from('quotes')
    .select('id, quote_number, status, accepted_at, clients ( name, email )')
    .eq('share_token', shareToken)
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

  // Update status + accepted_at. Never overwrite an existing accepted_at.
  const now = new Date().toISOString()
  const { error: updateErr } = await supabase
    .from('quotes')
    .update({ status: 'accepted', accepted_at: quote.accepted_at || now })
    .eq('id', quote.id)

  if (updateErr) {
    return { error: `Failed to accept: ${updateErr.message}` }
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
