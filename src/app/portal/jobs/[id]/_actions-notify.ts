'use server'

// Phase H — manual contractor + customer SMS sends from the job page.
//
// Both actions delegate to the central sendNotification (which
// applies every gating rule + writes notification_logs) so the
// behaviour is identical to the automated path.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { isAdminEmail } from '@/lib/is-admin'
import { sendNotification } from '@/lib/notifications/send'

interface JobContext {
  id: string
  job_number: string
  title: string | null
  address: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  client_id: string | null
  contractor_id: string | null
}

async function loadJobAndAuth(jobId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return { error: 'Admin only.' as const }
  }
  const { data: job } = await supabase
    .from('jobs')
    .select('id, job_number, title, address, scheduled_date, scheduled_time, client_id, contractor_id, deleted_at')
    .eq('id', jobId)
    .single()
  if (!job) return { error: 'Job not found.' as const }
  if (job.deleted_at) return { error: 'Cannot notify on an archived job.' as const }
  return { ok: true as const, supabase, user, job: job as JobContext & { deleted_at: string | null } }
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''
const BUSINESS_NAME  = 'Sano'
const BUSINESS_PHONE = '0800 726 686'

// ─── Contractor SMS — job_assigned ─────────────────────────────

export async function sendContractorJobAssignedSms(jobId: string):
  Promise<{ status: 'sent' | 'failed' | 'skipped'; reason?: string } | { error: string }> {
  const ctx = await loadJobAndAuth(jobId)
  if ('error' in ctx) return { error: ctx.error as string }
  const { supabase, job } = ctx

  if (!job.contractor_id) return { error: 'No contractor assigned to this job.' }

  const { data: contractor } = await supabase
    .from('contractors')
    .select('full_name, phone')
    .eq('id', job.contractor_id)
    .single()
  if (!contractor) return { error: 'Contractor not found.' }

  const result = await sendNotification(supabase, {
    type: 'job_assigned',
    channel: 'sms',
    audience: 'contractor',
    source: 'manual',
    recipientName: contractor.full_name,
    recipientPhone: contractor.phone,
    variables: {
      contractor_name: (contractor.full_name ?? '').split(/\s+/)[0],
      job_title:       job.title ?? job.job_number,
      job_number:      job.job_number,
      site_address:    job.address ?? '',
      scheduled_date:  fmtDate(job.scheduled_date),
      scheduled_time:  job.scheduled_time ?? '',
      job_link:        `${SITE_URL}/contractor/jobs/${job.id}`,
      business_name:   BUSINESS_NAME,
      business_phone:  BUSINESS_PHONE,
    },
    jobId: job.id,
    contractorId: job.contractor_id,
  })

  revalidatePath(`/portal/jobs/${jobId}`)
  return { status: result.status, reason: result.reason }
}

// ─── Customer SMS — booking_confirmation ───────────────────────

export async function sendCustomerBookingConfirmationSms(jobId: string):
  Promise<{ status: 'sent' | 'failed' | 'skipped'; reason?: string } | { error: string }> {
  const ctx = await loadJobAndAuth(jobId)
  if ('error' in ctx) return { error: ctx.error as string }
  const { supabase, job } = ctx

  if (!job.client_id) return { error: 'No client linked to this job.' }

  const { data: client } = await supabase
    .from('clients')
    .select('name, phone')
    .eq('id', job.client_id)
    .single()
  if (!client) return { error: 'Client not found.' }

  const result = await sendNotification(supabase, {
    type: 'booking_confirmation',
    channel: 'sms',
    audience: 'customer',
    source: 'manual',
    recipientName: client.name,
    recipientPhone: client.phone,
    variables: {
      client_name:    (client.name ?? '').split(/\s+/)[0],
      job_title:      job.title ?? '',
      job_number:     job.job_number,
      site_address:   job.address ?? '',
      scheduled_date: fmtDate(job.scheduled_date),
      scheduled_time: job.scheduled_time ?? '',
      business_name:  BUSINESS_NAME,
      business_phone: BUSINESS_PHONE,
    },
    jobId: job.id,
    clientId: job.client_id,
  })

  revalidatePath(`/portal/jobs/${jobId}`)
  return { status: result.status, reason: result.reason }
}
