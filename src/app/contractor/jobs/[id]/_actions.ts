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

export async function contractorStartJob(jobId: string) {
  const contractorId = await getContractorId()
  if (!contractorId) return { error: 'Not authenticated.' }

  const owns = await verifyJobOwnership(jobId, contractorId)
  if (!owns) return { error: 'You do not have access to this job.' }

  const now = new Date().toISOString()
  const supabase = createClient()

  const { error } = await supabase
    .from('jobs')
    .update({ status: 'in_progress', started_at: now })
    .eq('id', jobId)
    .eq('contractor_id', contractorId)

  if (error) return { error: error.message }

  // Set actual_start_time on this worker's job_workers record
  await supabase
    .from('job_workers')
    .update({ actual_start_time: now })
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)

  revalidatePath(`/contractor/jobs/${jobId}`)
  revalidatePath('/contractor/jobs')
  return { success: true }
}

export async function contractorCompleteJob(jobId: string) {
  const contractorId = await getContractorId()
  if (!contractorId) return { error: 'Not authenticated.' }

  const owns = await verifyJobOwnership(jobId, contractorId)
  if (!owns) return { error: 'You do not have access to this job.' }

  const now = new Date().toISOString()
  const supabase = createClient()

  const { error } = await supabase
    .from('jobs')
    .update({ status: 'completed', completed_at: now })
    .eq('id', jobId)
    .eq('contractor_id', contractorId)

  if (error) return { error: error.message }

  // Set actual_end_time and auto-calc actual_hours
  const { data: jw } = await supabase
    .from('job_workers')
    .select('actual_start_time')
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)
    .maybeSingle()

  const actualHours = jw?.actual_start_time
    ? Math.round(((new Date(now).getTime() - new Date(jw.actual_start_time).getTime()) / 3600000) * 100) / 100
    : null

  await supabase
    .from('job_workers')
    .update({ actual_end_time: now, actual_hours: actualHours })
    .eq('job_id', jobId)
    .eq('contractor_id', contractorId)

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
