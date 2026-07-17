'use server'

// Google review request (2026-07). Staff-triggered from a job or the Reviews
// tab: an editable message sent by SMS and/or email, with a one-tap link to the
// Google review page. Every send is recorded per customer in review_requests so
// we don't double-ask within the re-ask window (12 months).
//
// The review link is read from SANO_GOOGLE_REVIEW_URL (Netlify).

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { sendTwilioSms, isTwilioConfigured } from '@/lib/notifications/twilio'
import { sendReviewRequestEmail } from '@/lib/resend'
import { reviewSmsText, REVIEW_REASK_MONTHS, type ReviewVariant } from '@/lib/review-request'
import { resolveReviewRecipient } from '@/lib/review-recipient'

export interface RequestReviewInput {
  jobId: string
  sms: boolean
  email: boolean
  variant: ReviewVariant
  /** The (possibly staff-edited) message body. */
  message: string
  /** Send anyway even if asked within the window (explicit staff override). */
  force?: boolean
}

export interface RequestReviewResult {
  ok?: boolean
  error?: string
  alreadyRequested?: { sentAt: string }
  sms?: { status: 'sent' | 'skipped' | 'failed'; detail: string }
  email?: { status: 'sent' | 'skipped' | 'failed'; detail: string }
}

export async function requestReview(input: RequestReviewInput): Promise<RequestReviewResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!input?.jobId) return { error: 'Job is required.' }
  if (!input.sms && !input.email) return { error: 'Pick at least one channel (SMS or email).' }
  if (!input.message?.trim()) return { error: 'The message is empty.' }

  const reviewUrl = process.env.SANO_GOOGLE_REVIEW_URL?.trim()
  if (!reviewUrl) {
    return { error: 'Set SANO_GOOGLE_REVIEW_URL (your Google review link) in Netlify first.' }
  }

  const { data: job, error: jErr } = await supabase
    .from('jobs')
    .select('id, job_number, client_id, contact_id, clients ( name, phone, email )')
    .eq('id', input.jobId)
    .single()
  if (jErr || !job) return { error: 'Job not found.' }

  const clientId = (job.client_id as string | null) ?? null
  const client = job.clients as unknown as { name: string | null; phone: string | null; email: string | null } | null

  // Send to the job's main contact (a person), not the client's accounts record.
  const recipient = await resolveReviewRecipient(supabase, {
    contactId: (job.contact_id as string | null) ?? null,
    clientId,
    client,
  })
  const name = recipient.name
  const phone = recipient.phone
  const email = recipient.email

  // Per-customer dedupe: don't re-ask inside the window unless forced.
  if (clientId && !input.force) {
    const { data: last } = await supabase
      .from('review_requests')
      .select('sent_at')
      .eq('client_id', clientId)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const lastSent = (last as { sent_at?: string } | null)?.sent_at
    if (lastSent) {
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - REVIEW_REASK_MONTHS)
      if (new Date(lastSent) > cutoff) {
        return {
          error: `This customer was already asked on ${new Date(lastSent).toLocaleDateString('en-NZ')} — inside the ${REVIEW_REASK_MONTHS}-month window.`,
          alreadyRequested: { sentAt: lastSent },
        }
      }
    }
  }

  const result: RequestReviewResult = {}

  if (input.sms) {
    if (!isTwilioConfigured()) {
      result.sms = { status: 'skipped', detail: 'SMS not configured.' }
    } else if (!phone) {
      result.sms = { status: 'skipped', detail: 'No phone number on file for this customer.' }
    } else {
      const res = await sendTwilioSms({ to: phone, body: reviewSmsText(input.message, reviewUrl) })
      result.sms = res.ok ? { status: 'sent', detail: `Sent to ${phone}.` } : { status: 'failed', detail: res.error ?? 'SMS failed.' }
    }
  }

  if (input.email) {
    if (!email) {
      result.email = { status: 'skipped', detail: 'No email on file for this customer.' }
    } else {
      try {
        await sendReviewRequestEmail({ email, reviewUrl, variant: input.variant, message: input.message })
        result.email = { status: 'sent', detail: `Sent to ${email}.` }
      } catch (e) {
        result.email = { status: 'failed', detail: e instanceof Error ? e.message : 'Email failed.' }
      }
    }
  }

  const anySent = result.sms?.status === 'sent' || result.email?.status === 'sent'

  if (anySent) {
    const channel = result.sms?.status === 'sent' && result.email?.status === 'sent' ? 'sms+email'
      : result.sms?.status === 'sent' ? 'sms' : 'email'
    await supabase.from('review_requests').insert({
      client_id: clientId,
      job_id: input.jobId,
      channel,
      variant: input.variant,
      message: input.message,
      sent_by: user.id,
    })
    await supabase.from('audit_log').insert({
      actor_id: user.id,
      actor_role: 'staff',
      action: 'job.review_requested',
      entity_table: 'jobs',
      entity_id: input.jobId,
      before: null,
      after: { channel, variant: input.variant, name },
    })
  }

  revalidatePath(`/portal/jobs/${input.jobId}`)
  revalidatePath('/portal/reviews')
  return { ...result, ok: anySent }
}
