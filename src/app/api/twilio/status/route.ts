// Phase H.5 — Twilio delivery-status webhook.
//
// Configured in the Twilio Messaging Service "Integration → Outbound
// Messages → Status Callback URL" pointing at:
//
//   https://sano.nz/api/twilio/status      (HTTP POST)
//
// Twilio fires this for every outbound message we send, with status
// transitions: queued → sending → sent → delivered (or failed /
// undelivered). The handler updates the matching `notification_logs`
// row keyed by `provider_message_id`. The internal `status` field
// (sent/failed/skipped) — set at send time — is intentionally NOT
// mutated by these callbacks; only the new `delivery_status` and
// `delivery_updated_at` columns are written.

import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { validateTwilioSignature } from '@/lib/notifications/twilio-validate'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) {
    return NextResponse.json(
      { error: 'TWILIO_AUTH_TOKEN not configured' },
      { status: 500 },
    )
  }

  const formText = await request.text()
  const params: Record<string, string> = {}
  new URLSearchParams(formText).forEach((value, key) => {
    params[key] = value
  })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin
  const fullUrl = `${siteUrl}/api/twilio/status`

  const isValid = validateTwilioSignature({
    authToken,
    signatureHeader: request.headers.get('x-twilio-signature'),
    url: fullUrl,
    params,
  })
  if (!isValid) {
    return new Response('Forbidden', { status: 403 })
  }

  const messageSid = params['MessageSid'] ?? ''
  const messageStatus = params['MessageStatus'] ?? ''
  if (!messageSid || !messageStatus) {
    return new Response('Bad request', { status: 400 })
  }

  const supabase = getServiceSupabase()
  await supabase
    .from('notification_logs')
    .update({
      delivery_status: messageStatus,
      delivery_updated_at: new Date().toISOString(),
    })
    .eq('provider_message_id', messageSid)

  return new Response('', { status: 200 })
}

export async function GET() {
  return new Response('Method Not Allowed', { status: 405 })
}
