// Resend webhook — keeps campaign recipient state accurate from real mail events,
// so the follow-up logic (delivered / bounced / replied) is driven by what
// actually happened, not just send-success.
//
// Handles two kinds of payload:
//   1. Resend EVENT webhooks (email.delivered / email.bounced / email.complained)
//      — matched to a recipient by the email's Message-ID (the id we stored).
//   2. INBOUND replies (an inbound-parse payload, or a forwarding rule that POSTs
//      the reply here) — matched to a recipient by:
//        a) the In-Reply-To / References header pointing at our stored message_id, or
//        b) the sender's email address matching a recipient's lead email.
//      A match sets responded_at (+ flips the lead to 'responded'), which STOPS
//      the auto follow-up. This is the reply detection that covers Carol's mailbox
//      once replies are routed here.
//
// Auth: Resend signs webhooks with Svix (svix-id / svix-timestamp /
// svix-signature headers) using a signing secret from the webhook's details
// page — set as RESEND_WEBHOOK_SECRET. We verify the RAW body against that
// signature. A forwarder without a Svix signature can instead present a shared
// bearer token in `x-forwarder-secret` (RESEND_FORWARDER_SECRET) for the inbound
// reply path. Idempotent: setting responded_at / bounced_at twice is harmless.

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getServiceSupabase } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'

function firstAddress(v: unknown): string | null {
  if (!v) return null
  const s = Array.isArray(v) ? String(v[0] ?? '') : String(v)
  const m = s.match(/<([^>]+)>/)
  return (m ? m[1] : s).trim().toLowerCase() || null
}

// Pull all <id> tokens out of an In-Reply-To / References header.
function refIds(v: unknown): string[] {
  if (!v) return []
  return String(v).match(/<([^>]+)>/g)?.map((x) => x.replace(/[<>]/g, '')) ?? []
}

export async function POST(request: NextRequest) {
  // Raw body is required for signature verification (any reserialisation breaks it).
  const raw = await request.text()

  const svixId = request.headers.get('svix-id')
  const forwarderSecret = process.env.RESEND_FORWARDER_SECRET
  let authed = false

  if (svixId) {
    // Resend/Svix-signed webhook (delivery/bounce/complaint events).
    const signingSecret = process.env.RESEND_WEBHOOK_SECRET
    if (!signingSecret) return NextResponse.json({ error: 'RESEND_WEBHOOK_SECRET not configured' }, { status: 500 })
    try {
      new Resend(process.env.RESEND_API_KEY).webhooks.verify({
        payload: raw,
        // The SDK's Headers type is { id, timestamp, signature } from the svix-* headers.
        headers: {
          id: svixId,
          timestamp: request.headers.get('svix-timestamp') ?? '',
          signature: request.headers.get('svix-signature') ?? '',
        } as unknown as Parameters<Resend['webhooks']['verify']>[0]['headers'],
        webhookSecret: signingSecret,
      })
      authed = true
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } else if (forwarderSecret && request.headers.get('x-forwarder-secret') === forwarderSecret) {
    // A mail-forwarding rule posting inbound replies (no Svix signature).
    authed = true
  }

  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  const supabase = getServiceSupabase()
  const type = String(body.type ?? '')
  const data = (body.data ?? body) as Record<string, unknown>
  const nowIso = new Date().toISOString()

  // ── 1. Delivery / bounce / complaint events, matched by Message-ID ──────────
  const eventMsgId = (data.email_id as string) || (data.message_id as string) || (data.id as string) || null
  if (type.startsWith('email.') && eventMsgId) {
    if (type === 'email.delivered') {
      await supabase.from('sales_campaign_recipients').update({ delivered_at: nowIso }).eq('message_id', eventMsgId)
    } else if (type === 'email.bounced') {
      await supabase.from('sales_campaign_recipients').update({ bounced_at: nowIso }).eq('message_id', eventMsgId)
    } else if (type === 'email.complained') {
      // A spam complaint = do not contact.
      const { data: rec } = await supabase.from('sales_campaign_recipients').select('lead_id').eq('message_id', eventMsgId).maybeSingle()
      if (rec?.lead_id) {
        await supabase.from('sales_leads').update({ status: 'do_not_contact', unsubscribed_at: nowIso }).eq('id', rec.lead_id)
      }
    }
    return NextResponse.json({ ok: true, handled: type })
  }

  // ── 2. Inbound reply → mark responded (stops the follow-up) ─────────────────
  // Match first on In-Reply-To/References (most reliable), then on sender email.
  const inReplyTo = [...refIds(data['in_reply_to'] ?? data['inReplyTo']), ...refIds(data['references'] ?? data['References'])]
  const fromEmail = firstAddress(data.from ?? data.sender ?? data['reply_to'])

  let recipientId: string | null = null
  let leadId: string | null = null

  if (inReplyTo.length) {
    const { data: rec } = await supabase
      .from('sales_campaign_recipients')
      .select('id, lead_id')
      .in('message_id', inReplyTo)
      .limit(1).maybeSingle()
    if (rec) { recipientId = rec.id as string; leadId = rec.lead_id as string }
  }
  if (!recipientId && fromEmail) {
    // Match the reply's sender to a lead we emailed, newest campaign first.
    const { data: lead } = await supabase.from('sales_leads').select('id').ilike('email', fromEmail).maybeSingle()
    if (lead) {
      leadId = lead.id as string
      const { data: rec } = await supabase
        .from('sales_campaign_recipients')
        .select('id').eq('lead_id', leadId).eq('status', 'sent').is('responded_at', null)
        .order('sent_at', { ascending: false }).limit(1).maybeSingle()
      if (rec) recipientId = rec.id as string
    }
  }

  if (recipientId) {
    await supabase.from('sales_campaign_recipients').update({ responded_at: nowIso }).eq('id', recipientId).is('responded_at', null)
  }
  if (leadId) {
    await supabase.from('sales_leads').update({ status: 'responded', updated_at: nowIso }).eq('id', leadId).in('status', ['new', 'contacted'])
    await supabase.from('sales_lead_activities').insert({ lead_id: leadId, kind: 'email', body: 'Reply received (auto-detected)' })
  }

  return NextResponse.json({ ok: true, matched: !!recipientId, byHeader: inReplyTo.length > 0 })
}
