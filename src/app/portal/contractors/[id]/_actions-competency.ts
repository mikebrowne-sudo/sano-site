'use server'

// Phase 6 — staff competency sign-off. Reuses the existing capability fields on
// contractors (approved_services, experience_level, can_*, key_holding_approved,
// alarm_access_approved) plus the trial fields — no parallel competency system.
// Completing the sign-off completes the staff-only competency_confirmed item and
// recomputes onboarding status so a fully-verified contractor can advance.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { recomputeOnboardingStatus } from './_actions-onboarding'

export interface CompetencyInput {
  contractorId: string
  assessmentDate: string
  experienceLevel?: string
  approvedServices?: string[]
  canWorkSolo: boolean
  canLeadJobs: boolean
  canSuperviseOthers: boolean
  keyHoldingApproved: boolean
  alarmAccessApproved: boolean
  trialOutcome?: 'passed' | 'failed' | ''
  limitations?: string
  notes?: string
}

export async function recordCompetency(input: CompetencyInput): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!input.assessmentDate) return { error: 'Assessment date is required.' }

  const nowIso = new Date().toISOString()
  const update: Record<string, unknown> = {
    competency_confirmed_at: nowIso,
    competency_confirmed_by: user.id,
    competency_assessment_date: input.assessmentDate,
    experience_level: input.experienceLevel || null,
    approved_services: input.approvedServices ?? [],
    can_work_solo: input.canWorkSolo,
    can_lead_jobs: input.canLeadJobs,
    can_supervise_others: input.canSuperviseOthers,
    key_holding_approved: input.keyHoldingApproved,
    alarm_access_approved: input.alarmAccessApproved,
    competency_limitations: input.limitations?.trim() || null,
    competency_notes: input.notes?.trim() || null,
  }
  if (input.trialOutcome === 'passed' || input.trialOutcome === 'failed') {
    update.trial_status = input.trialOutcome
  }

  const { error } = await supabase.from('contractors').update(update).eq('id', input.contractorId)
  if (error) return { error: error.message }

  // Complete the staff-only competency_confirmed item (only where pending).
  // Best-effort: the checklist is admin-RLS; the sign-off above is source of truth.
  const { error: itemErr } = await supabase
    .from('contractor_onboarding')
    .update({ status: 'complete', completed_at: nowIso, completed_by: user.id })
    .eq('contractor_id', input.contractorId)
    .eq('item_key', 'competency_confirmed')
    .eq('status', 'pending')
  if (itemErr) console.error('[competency] competency_confirmed not auto-completed:', itemErr.message)

  // Advance onboarding status now competency is signed off.
  await recomputeOnboardingStatus(supabase, input.contractorId, { actorId: user.id })

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'contractor.competency_confirmed',
    entity_table: 'contractors',
    entity_id: input.contractorId,
    before: {},
    after: {
      assessment_date: input.assessmentDate,
      can_work_solo: input.canWorkSolo,
      can_lead_jobs: input.canLeadJobs,
      key_holding_approved: input.keyHoldingApproved,
    },
  })

  revalidatePath(`/portal/contractors/${input.contractorId}`)
  return { ok: true }
}
