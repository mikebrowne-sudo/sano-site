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

// Record an acknowledgement through the ATOMIC, SERVICE-ROLE-ONLY database RPC.
// The worker ID is derived from the authenticated session (never the browser).
// The RPC is not executable by the authenticated role, so a worker cannot invoke
// it directly and bypass this flow / the scroll-gate. The history insert + the
// assignment update commit together (or both roll back) in one transaction, and
// the RPC independently re-confirms ownership + active module and takes the
// version + timestamp from the DB. Idempotent for a duplicate (assignment,
// version).
async function recordAcknowledgement(assignmentId: string, workerId: string, complete: boolean) {
  const svc = getServiceSupabase()

  // Defense-in-depth ownership pre-check. workerId came from the auth session;
  // the RPC re-confirms this too.
  const { data: owned } = await svc
    .from('worker_training_assignments')
    .select('id')
    .eq('id', assignmentId)
    .eq('contractor_id', workerId)
    .maybeSingle()
  if (!owned) return { error: 'Access denied.' }

  // Only server-derived identifiers + the requested action are passed.
  const { error } = await svc.rpc('record_training_acknowledgement', {
    p_assignment_id: assignmentId,
    p_worker_id: workerId,
    p_complete: complete,
  })
  if (error) {
    const msg = error.message || ''
    if (/assignment not found/i.test(msg)) return { error: 'Access denied.' }
    if (/module not active/i.test(msg)) return { error: 'This module isn’t available to acknowledge.' }
    return { error: 'Could not record your acknowledgement. Please try again.' }
  }

  await syncInductionChecklist(workerId)
  revalidatePath('/contractor/training')
  revalidatePath(`/contractor/training/${assignmentId}`)
  return { success: true as const }
}

export async function acknowledgeTraining(assignmentId: string) {
  const contractorId = await getContractorId()   // derived from the authenticated session
  if (!contractorId) return { error: 'Not authenticated.' }
  return recordAcknowledgement(assignmentId, contractorId, false)
}

export async function completeTraining(assignmentId: string) {
  const contractorId = await getContractorId()
  if (!contractorId) return { error: 'Not authenticated.' }
  return recordAcknowledgement(assignmentId, contractorId, true)
}
