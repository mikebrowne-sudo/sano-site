'use server'

// Post-job Google review request (2026-07).
//
// The single biggest off-site lever for local SEO is a steady stream of
// Google reviews. This lets staff send a friendly "leave us a review"
// message to the customer after a job — by SMS, email, or both — with a
// one-tap link to the Google review page.
//
// The review link is read from SANO_GOOGLE_REVIEW_URL (set it in Netlify
// to your Google Business Profile "write a review" short link, e.g.
// https://g.page/r/XXXX/review). Until that's set the action returns a
// clear error and the button explains what to do.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { sendTwilioSms, isTwilioConfigured } from '@/lib/notifications/twilio'
import { sendReviewRequestEmail } from '@/lib/resend'

export interface RequestReviewInput {
  jobId: string
  sms: boolean
  email: boolean
}

export interface RequestReviewResult {
  ok?: boolean
  error?: string
  sms?: { status: 'sent' | 'skipped' | 'failed'; detail: string }
  email?: { status: 'sent' | 'skipped' | 'failed'; detail: string }
}

function firstName(name: string | null): string {
  return name?.trim().split(/\s+/)[0] || 'there'
}

export async function requestReview(input: RequestReviewInput): Promise<RequestReviewResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!input?.jobId) return { error: 'Job is required.' }
  if (!input.sms && !input.email) return { error: 'Pick at least one channel (SMS or email).' }

  const reviewUrl = process.env.SANO_GOOGLE_REVIEW_URL?.trim()
  if (!reviewUrl) {
    return { error: 'Set SANO_GOOGLE_REVIEW_URL (your Google review link) in Netlify first.' }
  }

  const { data: job, error: jErr } = await supabase
    .from('jobs')
    .select('id, job_number, client_id, clients ( name, phone, email )')
    .eq('id', input.jobId)
    .single()
  if (jErr || !job) return { error: 'Job not found.' }

  const client = job.clients as unknown as { name: string | null; phone: string | null; email: string | null } | null
  const name = client?.name ?? null
  const phone = client?.phone?.trim() || null
  const email = client?.email?.trim() || null

  const result: RequestReviewResult = {}

  // ── SMS ──
  if (input.sms) {
    if (!isTwilioConfigured()) {
      result.sms = { status: 'skipped', detail: 'SMS not configured.' }
    } else if (!phone) {
      result.sms = { status: 'skipped', detail: 'No phone number on file for this customer.' }
    } else {
      const body = `Hi ${firstName(name)}, thanks for choosing Sano Cleaning! If you were happy with your clean, a quick Google review would mean a lot: ${reviewUrl}`
      const res = await sendTwilioSms({ to: phone, body })
      result.sms = res.ok
        ? { status: 'sent', detail: `Sent to ${phone}.` }
        : { status: 'failed', detail: res.error ?? 'SMS failed.' }
    }
  }

  // ── Email ──
  if (input.email) {
    if (!email) {
      result.email = { status: 'skipped', detail: 'No email on file for this customer.' }
    } else {
      try {
        await sendReviewRequestEmail({ name: name ?? '', email, reviewUrl })
        result.email = { status: 'sent', detail: `Sent to ${email}.` }
      } catch (e) {
        result.email = { status: 'failed', detail: e instanceof Error ? e.message : 'Email failed.' }
      }
    }
  }

  const anySent = result.sms?.status === 'sent' || result.email?.status === 'sent'

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'staff',
    action: 'job.review_requested',
    entity_table: 'jobs',
    entity_id: input.jobId,
    before: null,
    after: {
      sms: result.sms?.status ?? 'not_requested',
      email: result.email?.status ?? 'not_requested',
    },
  })

  revalidatePath(`/portal/jobs/${input.jobId}`)
  return { ...result, ok: anySent }
}
