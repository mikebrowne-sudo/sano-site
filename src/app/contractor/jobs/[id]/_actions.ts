'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

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

async function verifyJobOwnership(jobId: string, contractorId: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('contractor_id', contractorId)
    .maybeSingle()

  return !!data
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
  const supabase = createClient()

  const { data: priorJob } = await supabase
    .from('jobs')
    .select('started_at')
    .eq('id', jobId)
    .eq('contractor_id', contractorId)
    .maybeSingle()

  const { error } = await supabase
    .from('jobs')
    .update({
      status: 'completed',
      completed_at: now,
      started_at: priorJob?.started_at ?? now,
    })
    .eq('id', jobId)
    .eq('contractor_id', contractorId)

  if (error) return { error: error.message }

  revalidatePath(`/contractor/jobs/${jobId}`)
  revalidatePath('/contractor/jobs')
  return { success: true }
}

export async function contractorUpdateNotes(jobId: string, notes: string) {
  const contractorId = await getContractorId()
  if (!contractorId) return { error: 'Not authenticated.' }

  const owns = await verifyJobOwnership(jobId, contractorId)
  if (!owns) return { error: 'You do not have access to this job.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('jobs')
    .update({ contractor_notes: notes.trim() || null })
    .eq('id', jobId)
    .eq('contractor_id', contractorId)

  if (error) return { error: error.message }

  revalidatePath(`/contractor/jobs/${jobId}`)
  return { success: true }
}
