'use server'

import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { completeInductionIfDone } from '@/lib/induction-modules'
import { revalidatePath } from 'next/cache'

// After a contractor acknowledges/completes a module, complete the
// induction_completed checklist item if all required induction modules are
// done. Uses the service-role client (the checklist is admin-RLS) and is
// best-effort so it never fails the contractor's own action.
async function syncInductionChecklist(contractorId: string) {
  try {
    await completeInductionIfDone(getServiceSupabase(), contractorId)
  } catch (e) {
    console.error('[training] induction checklist sync failed:', e instanceof Error ? e.message : e)
  }
}

async function getContractorId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('contractors').select('id').eq('auth_user_id', user.id).maybeSingle()
  return data?.id ?? null
}

// Record an acknowledgement through the ATOMIC database RPC. The history insert
// and the assignment update commit together (or both roll back) inside one
// transaction. The RPC is security-definer but derives identity from the
// caller's JWT (auth.uid()) and re-validates ownership + active module itself —
// so it is called via the worker's USER client and trusts NOTHING from the
// client except the assignment id. It is idempotent (a duplicate ack for the
// same version writes no new evidence and is not an error).
async function recordAcknowledgement(assignmentId: string, contractorId: string, complete: boolean) {
  const supabase = createClient()
  const { error } = await supabase.rpc('record_training_acknowledgement', {
    p_assignment_id: assignmentId,
    p_complete: complete,
  })
  if (error) {
    const msg = error.message || ''
    if (/assignment not found/i.test(msg)) return { error: 'Access denied.' }
    if (/module not active/i.test(msg)) return { error: 'This module isn’t available to acknowledge.' }
    if (/not a worker/i.test(msg)) return { error: 'Not authenticated.' }
    return { error: 'Could not record your acknowledgement. Please try again.' }
  }
  await syncInductionChecklist(contractorId)
  revalidatePath('/contractor/training')
  revalidatePath(`/contractor/training/${assignmentId}`)
  return { success: true as const }
}

export async function acknowledgeTraining(assignmentId: string) {
  const contractorId = await getContractorId()
  if (!contractorId) return { error: 'Not authenticated.' }
  return recordAcknowledgement(assignmentId, contractorId, false)
}

export async function completeTraining(assignmentId: string) {
  const contractorId = await getContractorId()
  if (!contractorId) return { error: 'Not authenticated.' }
  return recordAcknowledgement(assignmentId, contractorId, true)
}
