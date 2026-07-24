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

// Load the assignment for the current worker + the module's CURRENT version
// (server-authoritative — never trust a client-supplied version). Returns null
// if the assignment isn't the worker's own (ownership enforcement).
async function loadOwnAssignment(assignmentId: string, contractorId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('worker_training_assignments')
    .select('id, training_module_id, training_modules ( version )')
    .eq('id', assignmentId)
    .eq('contractor_id', contractorId)
    .maybeSingle()
  if (!data) return null
  const version = (data as { training_modules?: { version?: string | null } | null }).training_modules?.version ?? null
  return { moduleId: (data as { training_module_id: string }).training_module_id, version }
}

// Record an acknowledgement: snapshot the version onto the assignment, clear any
// re-acknowledgement flag, and append an immutable history row (per version).
async function recordAcknowledgement(assignmentId: string, contractorId: string, extra: Record<string, unknown> = {}) {
  const a = await loadOwnAssignment(assignmentId, contractorId)
  if (!a) return { error: 'Access denied.' }
  const supabase = createClient()
  const nowIso = new Date().toISOString()
  const { error } = await supabase
    .from('worker_training_assignments')
    .update({ acknowledged_at: nowIso, acknowledged_version: a.version, reacknowledgement_required: false, ...extra })
    .eq('id', assignmentId)
    .eq('contractor_id', contractorId)
  if (error) return { error: error.message }
  await supabase.from('worker_training_acknowledgements').insert({
    assignment_id: assignmentId, contractor_id: contractorId,
    training_module_id: a.moduleId, module_version: a.version, acknowledged_at: nowIso,
  })
  await syncInductionChecklist(contractorId)
  revalidatePath('/contractor/training')
  revalidatePath(`/contractor/training/${assignmentId}`)
  return { success: true as const }
}

export async function acknowledgeTraining(assignmentId: string) {
  const contractorId = await getContractorId()
  if (!contractorId) return { error: 'Not authenticated.' }
  return recordAcknowledgement(assignmentId, contractorId)
}

export async function completeTraining(assignmentId: string) {
  const contractorId = await getContractorId()
  if (!contractorId) return { error: 'Not authenticated.' }
  return recordAcknowledgement(assignmentId, contractorId, { status: 'completed', completed_at: new Date().toISOString() })
}
