'use server'

// Custom (job-less) review request — send the Google review link to any person
// with a manually entered name + phone/email and an editable message. Recorded
// in review_requests with a null client_id/job_id and the recipient's details.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { sendTwilioSms, isTwilioConfigured } from '@/lib/notifications/twilio'
import { sendReviewRequestEmail } from '@/lib/resend'
import { reviewSmsText } from '@/lib/review-request'

export interface CustomReviewInput {
  name: string
  phone: string | null
  email: string | null
  message: string
  viaSms: boolean
  viaEmail: boolean
}

export interface CustomReviewResult {
  ok?: boolean
  error?: string
  sms?: { status: 'sent' | 'skipped' | 'failed'; detail: string }
  email?: { status: 'sent' | 'skipped' | 'failed'; detail: string }
}

export async function requestCustomReview(input: CustomReviewInput): Promise<CustomReviewResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  if (!input.message?.trim()) return { error: 'Write a message first.' }
  if (!input.viaSms && !input.viaEmail) return { error: 'Pick at least one — text or email.' }

  const phone = input.phone?.trim() || null
  const email = input.email?.trim() || null
  if (input.viaSms && !phone) return { error: 'Enter a phone number to send by text.' }
  if (input.viaEmail && !email) return { error: 'Enter an email address to send by email.' }

  const reviewUrl = process.env.SANO_GOOGLE_REVIEW_URL?.trim()
  if (!reviewUrl) return { error: 'Set SANO_GOOGLE_REVIEW_URL (your Google review link) in Netlify first.' }

  const name = input.name?.trim() || null
  const result: CustomReviewResult = {}

  if (input.viaSms) {
    if (!isTwilioConfigured()) {
      result.sms = { status: 'skipped', detail: 'SMS not configured.' }
    } else {
      const res = await sendTwilioSms({ to: phone!, body: reviewSmsText(input.message, reviewUrl) })
      result.sms = res.ok ? { status: 'sent', detail: `Sent to ${phone}.` } : { status: 'failed', detail: res.error ?? 'Text failed.' }
    }
  }

  if (input.viaEmail) {
    try {
      await sendReviewRequestEmail({ email: email!, reviewUrl, variant: 'recent', message: input.message })
      result.email = { status: 'sent', detail: `Sent to ${email}.` }
    } catch (e) {
      result.email = { status: 'failed', detail: e instanceof Error ? e.message : 'Email failed.' }
    }
  }

  const anySent = result.sms?.status === 'sent' || result.email?.status === 'sent'

  if (anySent) {
    const channel = result.sms?.status === 'sent' && result.email?.status === 'sent' ? 'sms+email'
      : result.sms?.status === 'sent' ? 'sms' : 'email'
    await supabase.from('review_requests').insert({
      client_id: null,
      job_id: null,
      channel,
      variant: 'custom',
      message: input.message,
      recipient_name: name,
      recipient_contact: email ?? phone,
      sent_by: user.id,
    })
  }

  revalidatePath('/portal/reviews')
  return { ...result, ok: anySent }
}
