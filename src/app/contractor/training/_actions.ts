'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

async function getContractorId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('contractors').select('id').eq('auth_user_id', user.id).maybeSingle()
  return data?.id ?? null
}

async function verifyAssignment(assignmentId: string, contractorId: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('worker_training_assignments')
    .select('id')
    .eq('id', assignmentId)
    .eq('contractor_id', contractorId)
    .maybeSingle()
  return !!data
}

export async function acknowledgeTraining(assignmentId: string) {
  const contractorId = await getContractorId()
  if (!contractorId) return { error: 'Not authenticated.' }
  if (!await verifyAssignment(assignmentId, contractorId)) return { error: 'Access denied.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('worker_training_assignments')
    .update({ acknowledged_at: new Date().toISOString() })
    .eq('id', assignmentId)
    .eq('contractor_id', contractorId)

  if (error) return { error: error.message }
  revalidatePath('/contractor/training')
  revalidatePath(`/contractor/training/${assignmentId}`)
  return { success: true }
}

export async function completeTraining(assignmentId: string) {
  const contractorId = await getContractorId()
  if (!contractorId) return { error: 'Not authenticated.' }
  if (!await verifyAssignment(assignmentId, contractorId)) return { error: 'Access denied.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('worker_training_assignments')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', assignmentId)
    .eq('contractor_id', contractorId)

  if (error) return { error: error.message }
  revalidatePath('/contractor/training')
  revalidatePath(`/contractor/training/${assignmentId}`)
  return { success: true }
}
