'use server'

// Phase H.3 — contractor "On my way" SMS to the customer.
//
// Fires customer.cleaner_on_the_way without mutating the job row.
// Distinct from contractorStartJob (which sets status='in_progress'
// and started_at) — "on the way" is informational, not a state change.
//
// Dedupe: blocks a second send for the same job within the same
// calendar day. Operator can re-send manually from the staff job
// page if a genuine re-send is needed.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { sendNotification } from '@/lib/notifications/send'

interface OnTheWayResult {
  status: 'sent' | 'failed' | 'skipped'
  reason?: string
}

const BUSINESS_NAME  = 'Sano'
const BUSINESS_PHONE = '0800 726 686'

async function getContractorId(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('contractors')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  return data?.id ?? null
}

export async function contractorOnTheWaySms(jobId: string):
  Promise<OnTheWayResult | { error: string }> {
  const supabase = createClient()
  const contractorId = await getContractorId(supabase)
  if (!contractorId) return { error: 'Not authenticated.' }

  const { data: job } = await supabase
    .from('jobs')
    .select(`
      id, address, scheduled_time, client_id, contractor_id, deleted_at,
      clients ( name, phone )
    `)
    .eq('id', jobId)
    .eq('contractor_id', contractorId)
    .maybeSingle()
  if (!job) return { error: 'You do not have access to this job.' }
  if (job.deleted_at) return { error: 'This job has been archived.' }
  if (!job.client_id) return { error: 'No client linked to this job.' }

  // Same-day dedupe — at most one "on the way" SMS per job per day.
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('notification_logs')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'cleaner_on_the_way')
    .eq('related_job_id', jobId)
    .eq('status', 'sent')
    .gte('created_at', todayStart.toISOString())
  if ((count ?? 0) > 0) {
    return { status: 'skipped', reason: 'Already sent today.' }
  }

  const client = job.clients as unknown as { name: string | null; phone: string | null } | null

  const result = await sendNotification(supabase, {
    type: 'cleaner_on_the_way',
    channel: 'sms',
    audience: 'customer',
    source: 'automated',
    recipientName: client?.name,
    recipientPhone: client?.phone ?? null,
    variables: {
      client_name:    (client?.name ?? '').split(/\s+/)[0],
      site_address:   job.address ?? '',
      scheduled_time: job.scheduled_time ?? '',
      business_name:  BUSINESS_NAME,
      business_phone: BUSINESS_PHONE,
    },
    jobId: job.id,
    clientId: job.client_id,
  })

  revalidatePath(`/contractor/jobs/${jobId}`)
  return { status: result.status, reason: result.reason }
}
