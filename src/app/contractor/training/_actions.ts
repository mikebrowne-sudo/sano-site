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

// Record an acknowledgement — FULLY SERVER-AUTHORITATIVE. The worker's user
// client has NO write access to these tables (RLS is read-own only); every write
// goes through the service-role client here, after the server has:
//   • authenticated the user + resolved their contractor_id (getContractorId),
//   • confirmed the assignment belongs to that contractor,
//   • read the current module + version FROM THE DATABASE,
//   • confirmed the module is active (eligible to acknowledge),
//   • stamped the server timestamp,
//   • updated ONLY the intended assignment fields,
//   • inserted the history row from DB-derived IDs + version + server time.
// No worker-supplied contractor_id / module_id / version / timestamp / status is
// ever trusted.
async function recordAcknowledgement(assignmentId: string, contractorId: string, opts: { complete?: boolean } = {}) {
  const svc = getServiceSupabase()

  // Ownership + module (DB-authoritative). contractorId came from the auth'd
  // session, never the client.
  const { data: a } = await svc
    .from('worker_training_assignments')
    .select('id, contractor_id, status, training_module_id, training_modules ( id, version, status )')
    .eq('id', assignmentId)
    .eq('contractor_id', contractorId)
    .maybeSingle()
  if (!a) return { error: 'Access denied.' }

  const mod = (a as { training_modules?: { id?: string; version?: string | null; status?: string | null } | null }).training_modules
  if (!mod || mod.status !== 'active') return { error: 'This module isn’t available to acknowledge.' }

  const moduleId = (a as { training_module_id: string }).training_module_id
  const version = mod.version ?? null
  const nowIso = new Date().toISOString()

  // Update ONLY the intended fields — never a client-supplied set.
  const update: Record<string, unknown> = {
    acknowledged_at: nowIso,
    acknowledged_version: version,
    reacknowledgement_required: false,
  }
  if (opts.complete) { update.status = 'completed'; update.completed_at = nowIso }

  const { error: uErr } = await svc
    .from('worker_training_assignments')
    .update(update)
    .eq('id', assignmentId)
    .eq('contractor_id', contractorId)
  if (uErr) return { error: uErr.message }

  // History from DB-derived IDs + version + server timestamp.
  await svc.from('worker_training_acknowledgements').insert({
    assignment_id: assignmentId,
    contractor_id: contractorId,
    training_module_id: moduleId,
    module_version: version,
    acknowledged_at: nowIso,
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
  return recordAcknowledgement(assignmentId, contractorId, { complete: true })
}
