'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { getServiceSupabase } from '@/lib/supabase-service'
import { autoApproveRecurringJobPay } from '@/lib/recurring-pay-auto-approve'

async function getContractorId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('contractors')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  return data?.id ?? null
}

/**
 * Is this contractor on this (live) job — as the primary cleaner OR on the
 * roster (job_workers, e.g. the second cleaner on a two-cleaner job)? Same rule
 * as the job detail loader. Read with the service client because job_workers
 * RLS only shows a contractor their own row; nothing is returned to the caller.
 */
async function verifyJobOwnership(jobId: string, contractorId: string): Promise<boolean> {
  const svc = getServiceSupabase()
  const [{ data: job }, { data: worker }] = await Promise.all([
    svc.from('jobs').select('id, contractor_id').eq('id', jobId).is('deleted_at', null).maybeSingle(),
    svc.from('job_workers').select('contractor_id').eq('job_id', jobId).eq('contractor_id', contractorId).maybeSingle(),
  ])
  if (!job) return false // archived / missing: can't start, complete or note it
  return job.contractor_id === contractorId || !!worker
}

// Allowed-hours model (2026-06) — contractor "Mark complete".
//
// The old Start → Finish clock-in/out flow is archived. A job's
// labour/pay basis is its allowed hours, not a stopwatch, so the
// contractor no longer clocks in and out; they just mark the job
// complete when it's done. We back-fill started_at when it was never
// set so the lifecycle stays coherent. No actual_* time capture.
export async function contractorCompleteJob(jobId: string) {
  const contractorId = await getContractorId()
  if (!contractorId) return { error: 'Not authenticated.' }

  const owns = await verifyJobOwnership(jobId, contractorId)
  if (!owns) return { error: 'You do not have access to this job.' }

  const now = new Date().toISOString()
  // Service client, scoped to this one job id the caller was just verified to
  // be on: jobs RLS only lets the PRIMARY cleaner write, so a second cleaner's
  // "Mark complete" used to fail.
  const supabase = getServiceSupabase()

  const { data: priorJob } = await supabase
    .from('jobs')
    .select('started_at')
    .eq('id', jobId)
    .maybeSingle()

  const { error } = await supabase
    .from('jobs')
    .update({
      status: 'completed',
      completed_at: now,
      started_at: priorJob?.started_at ?? now,
    })
    .eq('id', jobId)
    .is('deleted_at', null)

  if (error) return { error: error.message }

  // Recurring occurrence → approve the contractor payable now. Service-role
  // because the contractor can't write contractor_invoices; the job id is one
  // they were just verified to own. Never fails the completion — the daily
  // cron sweep retries anything that didn't land.
  try {
    await autoApproveRecurringJobPay(getServiceSupabase(), jobId)
  } catch (e) {
    console.error('[contractorCompleteJob] recurring auto-approve failed', e)
  }

  revalidatePath(`/contractor/jobs/${jobId}`)
  revalidatePath('/contractor/jobs')
  return { success: true }
}

export async function contractorUpdateNotes(jobId: string, notes: string) {
  const contractorId = await getContractorId()
  if (!contractorId) return { error: 'Not authenticated.' }

  const owns = await verifyJobOwnership(jobId, contractorId)
  if (!owns) return { error: 'You do not have access to this job.' }

  // Service client after the roster check above (see contractorCompleteJob).
  const { error } = await getServiceSupabase()
    .from('jobs')
    .update({ contractor_notes: notes.trim() || null })
    .eq('id', jobId)
    .is('deleted_at', null)

  if (error) return { error: error.message }

  revalidatePath(`/contractor/jobs/${jobId}`)
  return { success: true }
}
