// Phase 5 — contractor induction modules.
//
// The four seeded, versioned modules (see the Phase 5 migration) are the
// operational induction record. They are auto-assigned during contractor
// onboarding and, once acknowledged + completed, complete the staff-visible
// induction_completed checklist item.
//
// Data-driven: the app selects induction modules by the auto_assign flag, not
// by hard-coded ids, so staff can add/retire modules without code changes.

// The six CORE H&S modules auto-assigned to every worker (Phase 6). Reference
// only — selection is by the auto_assign flag, not this list. Role-specific
// modules (working_at_height, team_leader) are manual-assign, not listed here.
export const INDUCTION_MODULE_KEYS = [
  'hs_induction',
  'hazardous_substances',
  'safe_work_practices',
  'hazard_incident_reporting',
  'security_property',
  'privacy_conduct',
] as const

export interface InductionModuleReq {
  id: string
  requires_acknowledgement: boolean
  requires_completion: boolean
}

export interface InductionAssignmentState {
  training_module_id: string
  acknowledged_at: string | null
  completed_at: string | null
  status: string | null
  reacknowledgement_required?: boolean | null
}

/**
 * True when every auto-assigned induction module the contractor actually holds
 * meets its requirement (completed if it requires completion, else acknowledged).
 * Returns false when no induction modules are assigned yet, so a contractor with
 * no modules never has induction_completed ticked automatically.
 */
export function isInductionComplete(
  modules: InductionModuleReq[],
  assignments: InductionAssignmentState[],
): boolean {
  const assigned = modules.filter((m) => assignments.some((a) => a.training_module_id === m.id))
  if (assigned.length === 0) return false
  return assigned.every((m) => {
    const a = assignments.find((x) => x.training_module_id === m.id)!
    // A module awaiting re-acknowledgement is not "complete" for a NEW induction.
    // (completeInductionIfDone only ever COMPLETES a pending item — it never
    //  un-completes — so this cannot re-gate an already-active worker.)
    if (a.reacknowledgement_required) return false
    if (m.requires_completion) return !!a.completed_at || a.status === 'completed'
    if (m.requires_acknowledgement) return !!a.acknowledged_at
    return true
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

/** The active, auto-assign induction modules that apply to a worker type. */
async function loadInductionModules(
  client: AnyClient,
  workerType: 'contractor' | 'employee' = 'contractor',
): Promise<InductionModuleReq[]> {
  const { data } = await client
    .from('training_modules')
    .select('id, requires_acknowledgement, requires_completion')
    .eq('auto_assign', true)
    .eq('status', 'active')
    .in('applies_to', [workerType, 'both'])
  return (data ?? []) as InductionModuleReq[]
}

/**
 * Assign every auto-assign contractor induction module to a contractor.
 * Idempotent: existing assignments (including completed ones) are left
 * untouched via ignoreDuplicates on the (contractor_id, training_module_id) key.
 */
export async function autoAssignInductionModules(
  client: AnyClient,
  contractorId: string,
  workerType: 'contractor' | 'employee' = 'contractor',
): Promise<{ assigned: number }> {
  const modules = await loadInductionModules(client, workerType)
  if (modules.length === 0) return { assigned: 0 }
  const rows = modules.map((m) => ({
    contractor_id: contractorId,
    training_module_id: m.id,
    status: 'assigned' as const,
  }))
  await client
    .from('worker_training_assignments')
    .upsert(rows, { onConflict: 'contractor_id,training_module_id', ignoreDuplicates: true })
  return { assigned: rows.length }
}

/**
 * Complete the induction_completed checklist item when all required induction
 * modules are done. Idempotent (only touches a pending item); completed_by is
 * null (system). Use a service-role client — the checklist is admin-RLS and
 * this runs from a contractor-authenticated action.
 */
export async function completeInductionIfDone(
  client: AnyClient,
  contractorId: string,
  workerType: 'contractor' | 'employee' = 'contractor',
): Promise<{ completed: boolean }> {
  const modules = await loadInductionModules(client, workerType)
  if (modules.length === 0) return { completed: false }

  const { data: asg } = await client
    .from('worker_training_assignments')
    .select('training_module_id, acknowledged_at, completed_at, status, reacknowledgement_required')
    .eq('contractor_id', contractorId)
    .in('training_module_id', modules.map((m) => m.id))

  if (!isInductionComplete(modules, (asg ?? []) as InductionAssignmentState[])) {
    return { completed: false }
  }

  const { data: done } = await client
    .from('contractor_onboarding')
    .update({ status: 'complete', completed_at: new Date().toISOString(), completed_by: null, completion_source: 'worker_acknowledged' })
    .eq('contractor_id', contractorId)
    .eq('item_key', 'induction_completed')
    .eq('status', 'pending')
    .select('item_key')

  return { completed: ((done ?? []) as unknown[]).length > 0 }
}
