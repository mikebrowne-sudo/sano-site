// Phase H.5 — Twilio inbound SMS webhook.
//
// Configured in the Twilio Messaging Service "Integration → Incoming
// Messages → Send a webhook" pointing at:
//
//   https://sano.nz/api/twilio/inbound-sms      (HTTP POST)
//
// The handler:
//   1. Validates the X-Twilio-Signature against TWILIO_AUTH_TOKEN.
//   2. Classifies the message body (STOP / HELP / other).
//   3. For STOP from a known client → sets clients.opted_out_sms=true
//      with the matched keyword and timestamp.
//   4. For HELP → replies with our canned support message.
//   5. Always persists a row in notification_inbound_messages with
//      the full Twilio payload (jsonb) for forensics.
//
// Twilio Messaging Services already auto-block sends to numbers that
// reply STOP — this handler adds defence in depth + UI visibility.

import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { validateTwilioSignature } from '@/lib/notifications/twilio-validate'
import {
  classifyInbound,
  helpReplyBody,
  twimlResponse,
} from '@/lib/notifications/inbound-handler'

export const dynamic = 'force-dynamic'

const TWIML_HEADERS = { 'Content-Type': 'text/xml; charset=utf-8' }

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) {
    return NextResponse.json(
      { error: 'TWILIO_AUTH_TOKEN not configured' },
      { status: 500 },
    )
  }

  // Twilio sends application/x-www-form-urlencoded.
  const formText = await request.text()
  const params: Record<string, string> = {}
  new URLSearchParams(formText).forEach((value, key) => {
    params[key] = value
  })

  // The URL Twilio used must match exactly what they signed.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin
  const fullUrl = `${siteUrl}/api/twilio/inbound-sms`

  const isValid = validateTwilioSignature({
    authToken,
    signatureHeader: request.headers.get('x-twilio-signature'),
    url: fullUrl,
    params,
  })
  if (!isValid) {
    return new Response('Forbidden', { status: 403 })
  }

  const fromPhone = params['From'] ?? ''
  const toPhone = params['To'] ?? ''
  const body = params['Body'] ?? ''
  const messageSid = params['MessageSid'] ?? ''

  if (!messageSid || !fromPhone) {
    return new Response('Bad request', { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Best-effort client lookup by phone.
  let matchedClientId: string | null = null
  {
    const { data } = await supabase
      .from('clients')
      .select('id')
      .eq('phone', fromPhone)
      .limit(1)
    matchedClientId = (data?.[0]?.id as string | undefined) ?? null
  }

  const classification = classifyInbound(body)
  let actionTaken: 'opted_out' | 'help_replied' | 'none' = 'none'
  let replyBody: string | null = null

  if (classification.kind === 'stop' && matchedClientId) {
    await supabase
      .from('clients')
      .update({
        opted_out_sms: true,
        opted_out_sms_at: new Date().toISOString(),
        opted_out_sms_keyword: classification.keyword,
      })
      .eq('id', matchedClientId)
    actionTaken = 'opted_out'
    // Twilio's Messaging Service auto-confirms unsubscribe — do not
    // double-reply from our side.
  } else if (classification.kind === 'help') {
    replyBody = helpReplyBody()
    actionTaken = 'help_replied'
  }

  // Persist the inbound row for forensics + portal display.
  await supabase.from('notification_inbound_messages').insert({
    message_sid: messageSid,
    from_phone: fromPhone,
    to_phone: toPhone || null,
    body: body || null,
    matched_client_id: matchedClientId,
    keyword: classification.kind === 'other' ? null : classification.keyword,
    action_taken: actionTaken,
    raw_payload: params as unknown as Record<string, unknown>,
    received_at: new Date().toISOString(),
  })

  return new Response(twimlResponse(replyBody), {
    status: 200,
    headers: TWIML_HEADERS,
  })
}

// Twilio always uses POST. Reject GET so accidental browser hits surface clearly.
export async function GET() {
  return new Response('Method Not Allowed', { status: 405 })
}
