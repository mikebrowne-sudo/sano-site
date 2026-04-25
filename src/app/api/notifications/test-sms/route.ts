// Phase H — Test SMS via plain POST route (admin-only).
//
// Why this exists in addition to the existing server action:
// the server-action transport on this Netlify deploy was firing
// the click handler but never invoking the action — no log row
// written, no console output, no feedback. A normal Next.js
// route handler bypasses the React/server-action transport
// entirely and works in every deployment shape.
//
// Behaviour:
//   • POST { phone, message }
//   • Admin-gated server-side
//   • Calls sendNotification (source='test'), which writes a
//     notification_logs row whether the send succeeds, fails, or
//     is skipped. No silent paths.
//   • Returns JSON { ok, status, reason?, logId?, sentTo? }.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isAdminEmail } from '@/lib/is-admin'
import { sendNotification } from '@/lib/notifications/send'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // 1. Parse JSON body. Defensive — never throws on bad input.
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body.' },
      { status: 400 },
    )
  }
  const payload = (body && typeof body === 'object') ? body as Record<string, unknown> : {}
  const phone = String(payload.phone ?? '').trim()
  const message = String(payload.message ?? '').trim()

  if (!phone)   return NextResponse.json({ ok: false, error: 'Phone number is required.' }, { status: 400 })
  if (!message) return NextResponse.json({ ok: false, error: 'Message body is required.' }, { status: 400 })

  // 2. Admin gate.
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 })
  }
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, error: 'Admin only.' }, { status: 403 })
  }

  // 3. Send via the central notification path. sendNotification
  //    writes a notification_logs row for every outcome (sent,
  //    failed, or skipped) — so a successful POST always produces
  //    visible evidence the action fired.
  const result = await sendNotification(supabase, {
    type: 'job_assigned' as const,    // arbitrary — bypassed by source:'test'
    channel: 'sms',
    audience: 'staff',
    source: 'test',
    recipientName: 'Admin test',
    recipientPhone: phone,
    variables: {},
    testBody: message,
  })

  return NextResponse.json({
    ok: result.status === 'sent',
    status: result.status,
    reason: result.reason ?? null,
    logId: result.logId ?? null,
    sentTo: result.status === 'sent' ? phone : null,
  })
}
