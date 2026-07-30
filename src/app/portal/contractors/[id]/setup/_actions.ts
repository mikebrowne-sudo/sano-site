'use server'

// Staff-led contractor setup actions (PR 1).
//
// Create a setup draft, edit service schedules + insurance arrangement, set
// per-section statuses, send the secure link, and review/accept contractor
// proposed changes. NO tax money movement and NO structured tax/GST capture —
// those are later PRs. Admin-gated, audited.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { sendAgreementLinkEmail } from '@/lib/resend'
import { SETUP_SECTIONS, DEFERRED_SECTIONS, type SectionState, type SetupSection, type SectionStatusMap } from '@/lib/contractor-setup-status'
import { CONTRACTOR_PROPOSABLE_SET } from '@/lib/contractor-setup-allowlist'

function revalidate(contractorId: string) {
  revalidatePath(`/portal/contractors/${contractorId}/setup`)
  revalidatePath(`/portal/contractors/${contractorId}`)
}

async function admin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { supabase, user: null as null }
  return { supabase, user }
}

/** Default section statuses for a fresh setup: deferred tax/GST are explicitly
 *  blocked_pending_workflow so they can never read as complete in PR 1. */
function seedSectionStatus(): SectionStatusMap {
  const map: SectionStatusMap = {}
  for (const s of SETUP_SECTIONS) {
    map[s] = DEFERRED_SECTIONS.includes(s) ? 'blocked_pending_workflow' : 'not_requested'
  }
  return map
}

/** Create (or return existing) the setup draft for a contractor. */
export async function createContractorSetup(contractorId: string): Promise<{ ok?: true; id?: string; error?: string }> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }

  const { data: existing } = await supabase.from('contractor_setup').select('id').eq('contractor_id', contractorId).maybeSingle()
  if (existing) return { ok: true, id: existing.id as string }

  const token = crypto.randomUUID().replace(/-/g, '')
  const { data, error } = await supabase
    .from('contractor_setup')
    .insert({ contractor_id: contractorId, token, status: 'draft', section_status: seedSectionStatus(), created_by: user.id })
    .select('id')
    .single()
  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    actor_id: user.id, actor_role: 'admin', action: 'contractor_setup.created',
    entity_table: 'contractor_setup', entity_id: data.id, before: null, after: { contractor_id: contractorId },
  })
  revalidate(contractorId)
  return { ok: true, id: data.id as string }
}

/** Set one section's status (staff ownership marking). Deferred sections may only
 *  be set to not_applicable or blocked_pending_workflow in PR 1. */
export async function setSectionStatus(
  contractorId: string,
  section: SetupSection,
  state: SectionState,
): Promise<{ ok?: true; error?: string }> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }
  if (DEFERRED_SECTIONS.includes(section) && !['not_applicable', 'blocked_pending_workflow'].includes(state)) {
    return { error: 'GST and tax declaration are captured in a later workflow — they cannot be verified here yet.' }
  }
  const { data: setup } = await supabase.from('contractor_setup').select('id, section_status').eq('contractor_id', contractorId).maybeSingle()
  if (!setup) return { error: 'No setup draft — create one first.' }
  const map = { ...((setup.section_status as SectionStatusMap) ?? {}), [section]: state }
  const { error } = await supabase.from('contractor_setup').update({ section_status: map, updated_at: new Date().toISOString() }).eq('id', setup.id)
  if (error) return { error: error.message }
  revalidate(contractorId)
  return { ok: true }
}

export interface ScheduleInput {
  id?: string
  name: string
  customerClientId?: string | null
  serviceAddress?: string | null
  classification?: 'residential' | 'commercial' | null
  serviceType?: string | null
  workDescription?: string | null
  startDate?: string | null
  endDate?: string | null
  term?: 'ongoing' | 'fixed' | null
  frequency?: string | null
  expectedUnits?: string | null
  workVariability?: 'fixed' | 'variable' | null
  paymentMethod?: string | null
  paymentBasis?: string | null
  rateBasis?: string | null
  agreedAmount?: number | null
  paymentFrequency?: string | null
  noticePeriod?: string | null
  priceReviewDate?: string | null
  paymentReference?: string | null
  costCentre?: string | null
  /** Who supplies equipment / cleaning products for this arrangement. UI option
   *  set: contractor_supplied | sano_supplied | client_supplied | as_agreed. */
  equipmentArrangement?: string | null
  productArrangement?: string | null
  status?: 'draft' | 'active' | 'paused' | 'ended'
  effectiveFrom?: string | null
}

/** Create or update a service schedule. Update is guarded — it never silently
 *  rewrites history for an already-active schedule's commercial terms; a rate
 *  change on an active schedule should supersede (later PR). Here PR 1 edits
 *  drafts freely and blocks agreed_amount edits on active schedules. */
export async function upsertServiceSchedule(contractorId: string, input: ScheduleInput): Promise<{ ok?: true; id?: string; error?: string }> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }
  if (!input.name?.trim()) return { error: 'Give the schedule a name.' }

  const row = {
    contractor_id: contractorId,
    name: input.name.trim(),
    customer_client_id: input.customerClientId || null,
    service_address: input.serviceAddress || null,
    classification: input.classification || null,
    service_type: input.serviceType || null,
    work_description: input.workDescription || null,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    term: input.term || null,
    frequency: input.frequency || null,
    expected_units: input.expectedUnits || null,
    work_variability: input.workVariability || null,
    payment_method: input.paymentMethod || null,
    payment_basis: input.paymentBasis || null,
    rate_basis: input.rateBasis || null,
    agreed_amount: input.agreedAmount ?? null,
    payment_frequency: input.paymentFrequency || null,
    notice_period: input.noticePeriod || null,
    price_review_date: input.priceReviewDate || null,
    payment_reference: input.paymentReference || null,
    cost_centre: input.costCentre || null,
    equipment_arrangement: input.equipmentArrangement || null,
    product_arrangement: input.productArrangement || null,
    status: input.status || 'draft',
    effective_from: input.effectiveFrom || null,
    updated_at: new Date().toISOString(),
  }

  if (input.id) {
    // Guard: don't let an active schedule's agreed amount be silently overwritten.
    const { data: cur } = await supabase.from('contractor_service_schedules').select('status, agreed_amount').eq('id', input.id).maybeSingle()
    if (cur?.status === 'active' && cur.agreed_amount != null && Number(cur.agreed_amount) !== (input.agreedAmount ?? null)) {
      return { error: 'This schedule is active. Changing its agreed amount must supersede the version (available in a later workflow), not overwrite it.' }
    }
    const { error } = await supabase.from('contractor_service_schedules').update(row).eq('id', input.id)
    if (error) return { error: error.message }
    revalidate(contractorId)
    return { ok: true, id: input.id }
  }

  const { data, error } = await supabase.from('contractor_service_schedules').insert({ ...row, created_by: user.id }).select('id').single()
  if (error) return { error: error.message }
  // Assign a human ref.
  await supabase.from('contractor_service_schedules').update({ schedule_ref: `SCH-${String(data.id).slice(0, 4).toUpperCase()}` }).eq('id', data.id)
  await supabase.from('audit_log').insert({
    actor_id: user.id, actor_role: 'admin', action: 'contractor_service_schedule.created',
    entity_table: 'contractor_service_schedules', entity_id: data.id, before: null, after: { contractor_id: contractorId, name: row.name },
  })
  revalidate(contractorId)
  return { ok: true, id: data.id as string }
}

/**
 * Set an insurance arrangement (incl. covered_by_sano, which suppresses the
 * contractor upload step). Effective-dated + superseding: the prior CURRENT row
 * for this scope (contractor_default, or an override for one schedule) is marked
 * superseded and a new current row is inserted — history is preserved, never
 * overwritten. A schedule_override must name a schedule belonging to THIS
 * contractor (the DB composite FK enforces it too).
 */
export async function setInsuranceArrangement(contractorId: string, input: {
  scope?: 'contractor_default' | 'schedule_override'
  serviceScheduleId?: string | null
  mode: 'own_required' | 'covered_by_sano' | 'not_required' | 'pending_review'
  requiredType?: string | null
  minCover?: number | null
  insurer?: string | null
  policyNumber?: string | null
  effectiveDate?: string | null
  expiryDate?: string | null
  sanoPolicyRef?: string | null
  coverType?: string | null
  coverLimit?: number | null
  notes?: string | null
}): Promise<{ ok?: true; error?: string }> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }

  const scope = input.scope ?? 'contractor_default'
  const scheduleId = scope === 'schedule_override' ? (input.serviceScheduleId || null) : null
  if (scope === 'schedule_override' && !scheduleId) return { error: 'A schedule override must reference a service schedule.' }
  if (scheduleId) {
    // Confirm the schedule belongs to this contractor (belt-and-braces alongside
    // the DB composite FK) before we supersede/insert.
    const { data: sch } = await supabase.from('contractor_service_schedules').select('id').eq('id', scheduleId).eq('contractor_id', contractorId).maybeSingle()
    if (!sch) return { error: 'That service schedule does not belong to this contractor.' }
  }

  const coveredBySano = input.mode === 'covered_by_sano'
  const nowIso = new Date().toISOString()

  // Find the current row for this exact scope (default, or this schedule's override).
  const currentQuery = supabase
    .from('contractor_insurance_arrangement')
    .select('id')
    .eq('contractor_id', contractorId)
    .eq('scope', scope)
    .eq('status', 'current')
  const { data: currentRow } = scheduleId
    ? await currentQuery.eq('service_schedule_id', scheduleId).maybeSingle()
    : await currentQuery.is('service_schedule_id', null).maybeSingle()

  // Supersede the prior current row FIRST so the partial-unique index never sees
  // two current rows for the same scope.
  if (currentRow) {
    const { error: supErr } = await supabase
      .from('contractor_insurance_arrangement')
      .update({ status: 'superseded', superseded_at: nowIso, updated_at: nowIso })
      .eq('id', currentRow.id)
    if (supErr) return { error: supErr.message }
  }

  const { error: insErr } = await supabase.from('contractor_insurance_arrangement').insert({
    contractor_id: contractorId,
    scope,
    service_schedule_id: scheduleId,
    mode: input.mode,
    required_type: input.mode === 'own_required' ? (input.requiredType || null) : null,
    min_cover: input.mode === 'own_required' ? (input.minCover ?? null) : null,
    insurer: input.insurer || null,
    policy_number: input.policyNumber || null,
    effective_date: input.effectiveDate || null,
    expiry_date: input.expiryDate || null,
    sano_policy_ref: coveredBySano ? (input.sanoPolicyRef || null) : null,
    cover_type: coveredBySano ? (input.coverType || null) : null,
    cover_limit: coveredBySano ? (input.coverLimit ?? null) : null,
    confirmed_by: coveredBySano ? user.id : null,
    confirmed_at: coveredBySano ? nowIso : null,
    notes: input.notes || null,
    status: 'current',
    supersedes_id: currentRow?.id ?? null,
    effective_from: input.effectiveDate || null,
    created_by: user.id,
  })
  if (insErr) return { error: insErr.message }

  await supabase.from('audit_log').insert({
    actor_id: user.id, actor_role: 'admin', action: 'contractor_insurance.set',
    entity_table: 'contractor_insurance_arrangement', entity_id: contractorId,
    before: currentRow ? { superseded: currentRow.id } : null,
    after: { scope, service_schedule_id: scheduleId, mode: input.mode },
  })

  // The MASTER insurance section status reflects the contractor_default only
  // (a per-schedule override doesn't change the contractor-level section state).
  if (scope === 'contractor_default') {
    const insState: SectionState =
      input.mode === 'covered_by_sano' || input.mode === 'not_required' ? 'not_applicable'
      : input.mode === 'own_required' ? 'contractor_to_complete'
      : 'awaiting_sano_review'
    await setSectionStatus(contractorId, 'insurance', insState)
  }

  revalidate(contractorId)
  return { ok: true }
}

/** Send the secure setup link to the contractor. Requires an email + at least
 *  one section requested. Does NOT send for the wrong person — reads the
 *  contractor's own email. */
export async function sendSetupLink(contractorId: string): Promise<{ ok?: true; error?: string }> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }

  const [{ data: setup }, { data: c }] = await Promise.all([
    supabase.from('contractor_setup').select('id, token, status').eq('contractor_id', contractorId).maybeSingle(),
    supabase.from('contractors').select('full_name, email').eq('id', contractorId).maybeSingle(),
  ])
  if (!setup) return { error: 'No setup draft to send.' }
  if (!c?.email) return { error: 'This contractor has no email address on file.' }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://sano.nz'
  const link = `${origin}/contractor-setup/${setup.token}`
  try {
    await sendAgreementLinkEmail({ to: c.email as string, personName: (c.full_name as string) || 'there', agreementType: 'contractor', link })
  } catch (e) {
    return { error: `Could not send the email: ${e instanceof Error ? e.message : 'unknown error'}` }
  }

  await supabase.from('contractor_setup').update({ status: 'awaiting_contractor', sent_at: new Date().toISOString() }).eq('id', setup.id)
  await supabase.from('audit_log').insert({
    actor_id: user.id, actor_role: 'admin', action: 'contractor_setup.link_sent',
    entity_table: 'contractor_setup', entity_id: setup.id, before: null, after: { to: c.email },
  })
  revalidate(contractorId)
  return { ok: true }
}

/** Accept a contractor-proposed change into the live contractor record. Only
 *  non-tax/GST fields are accepted in PR 1 (identity/structure/banking-name);
 *  critical financial/tax fields are handled by later dedicated workflows. */
export async function acceptProposedChange(
  contractorId: string,
  field: string,
): Promise<{ ok?: true; error?: string }> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }

  const { data: setup } = await supabase.from('contractor_setup').select('id, proposed_changes').eq('contractor_id', contractorId).maybeSingle()
  if (!setup) return { error: 'No setup found.' }
  const proposed = (setup.proposed_changes as Record<string, { old: unknown; new: unknown }>) ?? {}
  const change = proposed[field]
  if (!change) return { error: 'No such proposed change.' }

  // Same allowlist the contractor could propose against (no tax/GST money fields).
  if (!CONTRACTOR_PROPOSABLE_SET.has(field)) {
    return { error: 'This field is accepted through its dedicated tax/GST/banking workflow, not here.' }
  }
  const col = field

  const before = { [col]: change.old }
  const { error } = await supabase.from('contractors').update({ [col]: change.new }).eq('id', contractorId)
  if (error) return { error: error.message }

  delete proposed[field]
  await supabase.from('contractor_setup').update({ proposed_changes: proposed, reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('id', setup.id)
  await supabase.from('audit_log').insert({
    actor_id: user.id, actor_role: 'admin', action: 'contractor_setup.change_accepted',
    entity_table: 'contractors', entity_id: contractorId, before, after: { [col]: change.new },
  })
  revalidate(contractorId)
  return { ok: true }
}
