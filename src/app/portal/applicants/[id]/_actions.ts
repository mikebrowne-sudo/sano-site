'use server'

// Phase 5.1 — Server actions for applicant detail page.
//
// All mutations write a row to public.audit_log so every status change
// has an entity-table'd "who/when/from→to" record visible from the
// audit_log query later. The before/after JSONB only carries the
// fields that actually changed so the log stays compact.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { checklistForWorkerType } from '@/lib/onboarding-checklist'

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

// Phase 5.2 — Applicant → Contractor conversion.
//
// Triggered from the applicant detail page once status is `approved`.
// Creates the contractor record (status='onboarding',
// onboarding_status='in_progress') and links it back to the applicant
// via source_applicant_id. The applicant is moved to status='onboarding'
// with converted_contractor_id + converted_at populated.
//
// Idempotency: if the applicant already has a converted_contractor_id,
// the action is a no-op and returns the existing contractor id. This
// makes a re-click safe even if the page state is stale.
//
// Email dedupe: case-insensitive lookup against contractors.email.
// Trial flag: passed through from the modal (default true), persisted
// on both the contractor and the applicant for audit.
//
// Audit: writes one row to audit_log with action
// 'applicant_converted_to_contractor' and a structured before/after
// payload.

export async function startContractorOnboarding(input: {
  applicantId: string
  workerKind: 'contractor' | 'employee'
  trialRequired: boolean
}): Promise<{ ok: true; contractorId: string } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Read applicant
  const { data: applicant, error: appErr } = await supabase
    .from('applicants')
    .select('id, status, first_name, last_name, email, phone, suburb, application_type, converted_contractor_id, trial_required')
    .eq('id', input.applicantId)
    .maybeSingle()
  if (appErr) return { error: appErr.message }
  if (!applicant) return { error: 'Applicant not found.' }

  type ApplicantRow = {
    id: string
    status: string
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
    suburb: string | null
    application_type: string | null
    converted_contractor_id: string | null
    trial_required: boolean | null
  }
  const a = applicant as ApplicantRow

  // Idempotency: already converted → no-op, return existing.
  if (a.converted_contractor_id) {
    return { ok: true, contractorId: a.converted_contractor_id }
  }

  // Status guard: must be approved before onboarding can start.
  if (a.status !== 'approved') {
    return { error: 'Applicant must be in "approved" status to start onboarding.' }
  }

  // Required field validation.
  if (!a.first_name?.trim() || !a.last_name?.trim()) {
    return { error: 'Applicant name is missing.' }
  }
  if (!a.email?.trim()) {
    return { error: 'Applicant email is missing.' }
  }
  if (!a.phone?.trim()) {
    return { error: 'Applicant phone is missing.' }
  }

  const lcEmail = a.email.toLowerCase().trim()

  // Email dedup against contractors.
  const { data: existing } = await supabase
    .from('contractors')
    .select('id')
    .ilike('email', lcEmail)
    .limit(1)
  if (existing && existing.length > 0) {
    return { error: 'A contractor record with this email already exists.' }
  }

  // Map worker kind → contractors columns.
  // 'contractor' → worker_type='contractor', employment_type=null
  // 'employee'   → worker_type='employee',   employment_type='casual'
  //                  (default; admin refines to part_time / full_time
  //                   on the contractor record)
  const workerType: 'contractor' | 'employee' =
    input.workerKind === 'contractor' ? 'contractor' : 'employee'
  const employmentType: 'casual' | null =
    input.workerKind === 'contractor' ? null : 'casual'
  const fullName = `${a.first_name.trim()} ${a.last_name.trim()}`
  const nowIso = new Date().toISOString()

  // Create contractor.
  const { data: contractorRow, error: cErr } = await supabase
    .from('contractors')
    .insert({
      full_name: fullName,
      email: lcEmail,
      phone: a.phone.trim(),
      suburb: a.suburb?.trim() || null,
      worker_type: workerType,
      employment_type: employmentType,
      status: 'onboarding',
      onboarding_status: 'in_progress',
      onboarding_started_at: nowIso,
      trial_required: input.trialRequired,
      source_applicant_id: a.id,
    })
    .select('id')
    .single()
  if (cErr) return { error: cErr.message }
  const contractor = contractorRow as { id: string } | null
  if (!contractor) return { error: 'Contractor creation failed.' }

  // Seed the onboarding checklist for this worker type. Failure here
  // is logged but does not abort the conversion — the panel can be
  // re-seeded later if needed (Phase 5.3).
  const checklist = checklistForWorkerType(workerType).map((it) => ({
    contractor_id: contractor.id,
    section: it.section,
    item_key: it.item_key,
    label: it.label,
    sort_order: it.sort_order,
    status: 'pending',
  }))
  if (checklist.length > 0) {
    const { error: seedErr } = await supabase.from('contractor_onboarding').insert(checklist)
    if (seedErr) {
      console.error('[startContractorOnboarding] checklist seed failed', seedErr)
    }
  }

  // Update applicant.
  const { error: aUpdErr } = await supabase
    .from('applicants')
    .update({
      status: 'onboarding',
      converted_contractor_id: contractor.id,
      converted_at: nowIso,
      trial_required: input.trialRequired,
      status_updated_at: nowIso,
      status_updated_by: user.id,
    })
    .eq('id', input.applicantId)
  if (aUpdErr) {
    // Contractor row exists; idempotency on retry will pick it up.
    return { error: `Contractor created but applicant update failed: ${aUpdErr.message}` }
  }

  // Audit log.
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'applicant_converted_to_contractor',
    entity_table: 'applicants',
    entity_id: a.id,
    before: { status: 'approved', converted_contractor_id: null },
    after: {
      status: 'onboarding',
      converted_contractor_id: contractor.id,
      worker_kind: input.workerKind,
      worker_type: workerType,
      trial_required: input.trialRequired,
    },
  })

  revalidatePath('/portal/applicants')
  revalidatePath(`/portal/applicants/${input.applicantId}`)
  return { ok: true, contractorId: contractor.id }
}
