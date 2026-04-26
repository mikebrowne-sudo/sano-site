'use server'

// Phase 5.1 — Server actions for applicant detail page.
//
// All mutations write a row to public.audit_log so every status change
// has an entity-table'd "who/when/from→to" record visible from the
// audit_log query later. The before/after JSONB only carries the
// fields that actually changed so the log stays compact.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

const VALID_STATUSES = [
  'new', 'reviewing', 'phone_screen', 'approved', 'onboarding',
  'trial', 'ready_to_work', 'on_hold', 'rejected',
] as const

export type ApplicantStatus = typeof VALID_STATUSES[number]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function writeAudit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  applicantId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  action: string,
) {
  await supabase.from('audit_log').insert({
    actor_id: userId,
    actor_role: 'admin',
    action,
    entity_table: 'applicants',
    entity_id: applicantId,
    before,
    after,
  })
}

export async function updateApplicantStatus(input: {
  applicantId: string
  status: ApplicantStatus
}): Promise<{ ok: true } | { error: string }> {
  if (!VALID_STATUSES.includes(input.status)) return { error: 'Invalid status.' }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: prev } = await supabase
    .from('applicants').select('status').eq('id', input.applicantId).maybeSingle()
  const oldStatus = (prev as { status?: string } | null)?.status ?? null

  const { error } = await supabase
    .from('applicants')
    .update({
      status: input.status,
      status_updated_at: new Date().toISOString(),
      status_updated_by: user.id,
    })
    .eq('id', input.applicantId)
  if (error) return { error: error.message }

  await writeAudit(supabase, user.id, input.applicantId,
    { status: oldStatus },
    { status: input.status },
    'applicant.status_changed',
  )

  revalidatePath('/portal/applicants')
  revalidatePath(`/portal/applicants/${input.applicantId}`)
  return { ok: true }
}

export async function rejectApplicant(input: {
  applicantId: string
  reason: string
}): Promise<{ ok: true } | { error: string }> {
  if (!input.reason.trim()) return { error: 'Rejection reason required.' }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: prev } = await supabase
    .from('applicants').select('status').eq('id', input.applicantId).maybeSingle()
  const oldStatus = (prev as { status?: string } | null)?.status ?? null

  const { error } = await supabase
    .from('applicants')
    .update({
      status: 'rejected',
      rejection_reason: input.reason.trim(),
      status_updated_at: new Date().toISOString(),
      status_updated_by: user.id,
    })
    .eq('id', input.applicantId)
  if (error) return { error: error.message }

  await writeAudit(supabase, user.id, input.applicantId,
    { status: oldStatus },
    { status: 'rejected', rejection_reason: input.reason.trim() },
    'applicant.rejected',
  )

  revalidatePath('/portal/applicants')
  revalidatePath(`/portal/applicants/${input.applicantId}`)
  return { ok: true }
}

export async function putApplicantOnHold(input: {
  applicantId: string
  reason: string
}): Promise<{ ok: true } | { error: string }> {
  if (!input.reason.trim()) return { error: 'On-hold reason required.' }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: prev } = await supabase
    .from('applicants').select('status').eq('id', input.applicantId).maybeSingle()
  const oldStatus = (prev as { status?: string } | null)?.status ?? null

  const { error } = await supabase
    .from('applicants')
    .update({
      status: 'on_hold',
      on_hold_reason: input.reason.trim(),
      status_updated_at: new Date().toISOString(),
      status_updated_by: user.id,
    })
    .eq('id', input.applicantId)
  if (error) return { error: error.message }

  await writeAudit(supabase, user.id, input.applicantId,
    { status: oldStatus },
    { status: 'on_hold', on_hold_reason: input.reason.trim() },
    'applicant.on_hold',
  )

  revalidatePath('/portal/applicants')
  revalidatePath(`/portal/applicants/${input.applicantId}`)
  return { ok: true }
}

export async function updateTrialRequired(input: {
  applicantId: string
  trialRequired: boolean
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('applicants')
    .update({ trial_required: input.trialRequired })
    .eq('id', input.applicantId)
  if (error) return { error: error.message }

  await writeAudit(supabase, user.id, input.applicantId,
    {},
    { trial_required: input.trialRequired },
    'applicant.trial_required_changed',
  )

  revalidatePath(`/portal/applicants/${input.applicantId}`)
  return { ok: true }
}

export async function scheduleTrial(input: {
  applicantId: string
  scheduledFor: string  // datetime-local format: YYYY-MM-DDTHH:mm:ss
}): Promise<{ ok: true } | { error: string }> {
  if (!input.scheduledFor) return { error: 'Trial date required.' }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const isoDate = new Date(input.scheduledFor).toISOString()
  const { error } = await supabase
    .from('applicants')
    .update({
      trial_scheduled_for: isoDate,
      status: 'trial',
      status_updated_at: new Date().toISOString(),
      status_updated_by: user.id,
    })
    .eq('id', input.applicantId)
  if (error) return { error: error.message }

  await writeAudit(supabase, user.id, input.applicantId,
    {},
    { trial_scheduled_for: isoDate, status: 'trial' },
    'applicant.trial_scheduled',
  )

  revalidatePath('/portal/applicants')
  revalidatePath(`/portal/applicants/${input.applicantId}`)
  return { ok: true }
}

export async function recordTrialOutcome(input: {
  applicantId: string
  outcome: 'passed' | 'failed'
  note?: string
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const newStatus: ApplicantStatus =
    input.outcome === 'passed' ? 'ready_to_work' : 'rejected'

  const noteTrimmed = input.note?.trim() ?? ''
  const outcomeText = noteTrimmed
    ? `${input.outcome}: ${noteTrimmed}`
    : input.outcome

  const updatePayload: Record<string, unknown> = {
    trial_outcome: outcomeText,
    status: newStatus,
    status_updated_at: new Date().toISOString(),
    status_updated_by: user.id,
  }
  if (input.outcome === 'failed') {
    updatePayload.rejection_reason = noteTrimmed || 'Trial unsuccessful'
  }

  const { error } = await supabase
    .from('applicants')
    .update(updatePayload)
    .eq('id', input.applicantId)
  if (error) return { error: error.message }

  await writeAudit(supabase, user.id, input.applicantId,
    {},
    { trial_outcome: outcomeText, status: newStatus },
    'applicant.trial_outcome_recorded',
  )

  revalidatePath('/portal/applicants')
  revalidatePath(`/portal/applicants/${input.applicantId}`)
  return { ok: true }
}

export async function updateApplicantNotes(input: {
  applicantId: string
  notes: string
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('applicants')
    .update({ staff_notes: input.notes || null })
    .eq('id', input.applicantId)
  if (error) return { error: error.message }

  revalidatePath(`/portal/applicants/${input.applicantId}`)
  return { ok: true }
}
