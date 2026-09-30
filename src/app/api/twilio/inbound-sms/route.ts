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
  confirmHoursReplyBody,
  nothingToConfirmReplyBody,
  twimlResponse,
} from '@/lib/notifications/inbound-handler'
import { toE164NZ } from '@/lib/nz-phone'
import {
  resolveSmsConfirmation,
  ambiguousSmsSuffix,
  hoursToConfirm,
  CONFIRMATION_START_DATE,
  type PendingConfirmation,
} from '@/lib/hours-confirmation'

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

  // Match the sender by phone.
  //
  // Twilio delivers `From` in E.164 (+64211234567) but every phone in this DB
  // is stored as a person types it ("021 123 4567"). A direct `.eq('phone', ...)`
  // therefore NEVER matches — which would silently drop every confirmation.
  // So candidates are normalised in code and compared in E.164.
  const fromE164 = toE164NZ(fromPhone)

  async function matchByPhone(table: 'clients' | 'contractors'): Promise<string | null> {
    // Exact match first — cheap, and correct for any row already in E.164.
    const { data: exact } = await supabase
      .from(table).select('id').eq('phone', fromPhone).limit(1)
    if (exact?.[0]?.id) return exact[0].id as string
    if (!fromE164) return null

    // Otherwise normalise the stored values and compare. The row counts here
    // are small (about 120 phones across both tables), so this is cheap.
    const { data: rows } = await supabase
      .from(table).select('id, phone').not('phone', 'is', null)
    for (const r of rows ?? []) {
      if (toE164NZ(r.phone as string | null) === fromE164) return r.id as string
    }
    return null
  }

  const matchedClientId = await matchByPhone('clients')
  const classification = classifyInbound(body)
  // A "YES" confirming a job comes from a contractor, not a client.
  const matchedContractorId = await matchByPhone('contractors')

  let actionTaken: 'opted_out' | 'help_replied' | 'hours_confirmed' | 'none' = 'none'
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
  } else if (classification.kind === 'confirm_hours' && matchedContractorId) {
    // Confirming a finished job went to plan, by replying to the reminder.
    //
    // A reply carries no job reference, so the job is inferred as the one whose
    // reminder was sent most recently — what is on the contractor's screen.
    // When several are outstanding we confirm ONLY that one and tell them the
    // rest need the portal, rather than silently confirming jobs they didn't
    // mean. A wrong confirmation lands on a pay record.
    const { data: rows } = await supabase
      .from('job_workers')
      .select(`
        job_id, contractor_id, hours_allocated, extra_hours, extra_hours_status,
        jobs!inner ( id, job_number, scheduled_date, status, deleted_at )
      `)
      .eq('contractor_id', matchedContractorId)
      .eq('hours_confirmed_status', 'unconfirmed')
      .in('jobs.status', ['completed', 'invoiced'])
      .is('jobs.deleted_at', null)
      .gte('jobs.scheduled_date', CONFIRMATION_START_DATE)

    // Pair each candidate with when its reminder actually went out.
    const pending: PendingConfirmation[] = []
    for (const r of rows ?? []) {
      const job = r.jobs as unknown as
        { id: string; job_number: string | null; scheduled_date: string | null } | null
      if (!job) continue
      const { data: lastLog } = await supabase
        .from('notification_logs')
        .select('sent_at, created_at')
        .eq('type', 'confirm_hours')
        .eq('related_job_id', job.id)
        .eq('related_contractor_id', matchedContractorId)
        .eq('status', 'sent')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      pending.push({
        jobId: job.id,
        contractorId: matchedContractorId,
        jobNumber: job.job_number ?? '—',
        scheduledDate: job.scheduled_date,
        lastRemindedAt: (lastLog?.sent_at as string | null) ?? (lastLog?.created_at as string | null) ?? null,
        hoursAllocated: (r.hours_allocated as number | null) ?? null,
        extraHours: (r.extra_hours as number | null) ?? null,
        extraHoursStatus: (r.extra_hours_status as string | null) ?? null,
      })
    }

    const resolution = resolveSmsConfirmation(pending)
    if (resolution.kind === 'none') {
      replyBody = nothingToConfirmReplyBody()
    } else {
      const target = resolution.pending
      const { error: upErr } = await supabase
        .from('job_workers')
        .update({
          hours_confirmed_status: 'as_planned',
          hours_confirmed_at: new Date().toISOString(),
          hours_confirmed_note: `Confirmed by SMS reply "${classification.keyword}"`,
        })
        .eq('job_id', target.jobId)
        .eq('contractor_id', matchedContractorId)
        .eq('hours_confirmed_status', 'unconfirmed')

      if (upErr) {
        // Don't claim success we didn't achieve — point them at the portal.
        replyBody = 'Sano: Sorry, we could not record that. Please confirm in the portal.'
      } else {
        actionTaken = 'hours_confirmed'
        const hours = hoursToConfirm({
          jobId: target.jobId, contractorId: matchedContractorId,
          hoursAllocated: target.hoursAllocated,
          hoursConfirmedStatus: 'unconfirmed',
          extraHours: target.extraHours, extraHoursStatus: target.extraHoursStatus,
        })
        replyBody = confirmHoursReplyBody(target.jobNumber, hours != null ? String(hours) : null)
          + (resolution.kind === 'ambiguous' ? ambiguousSmsSuffix(resolution.count - 1) : '')

        await supabase.from('audit_log').insert({
          actor_role: 'contractor',
          action: 'job_worker.hours_confirmed',
          entity_table: 'job_workers',
          entity_id: `${target.jobId}:${matchedContractorId}`,
          before: { hours_confirmed_status: 'unconfirmed' },
          after: {
            hours_confirmed_status: 'as_planned',
            via: 'sms_reply',
            keyword: classification.keyword,
            outstanding_after: resolution.kind === 'ambiguous' ? resolution.count - 1 : 0,
          },
        })
      }
    }
  }

  // Persist the inbound row for forensics + portal display.
  await supabase.from('notification_inbound_messages').insert({
    message_sid: messageSid,
    from_phone: fromPhone,
    to_phone: toPhone || null,
    body: body || null,
    matched_client_id: matchedClientId,
    matched_contractor_id: matchedContractorId,
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
