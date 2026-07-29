'use server'

// Staff contractor tax-declaration actions (PR 4). Record / verify / reject /
// supersede IR330C, tailored-rate and exemption declarations, and classify each
// service schedule's tax treatment. Immutable + superseding: a correction creates
// a new row and supersedes the prior current one — verified declarations are never
// overwritten. Admin-only, audited. NO withholding calc / money movement.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import {
  validateDeclarationRate, CONTRACTOR_DECLARATION_TEXT, CONTRACTOR_DECLARATION_VERSION,
  type DeclarationType, type DeclarationInput,
} from '@/lib/contractor-tax-declaration'
import { classificationChangeMode } from '@/lib/contractor-tax-gate'

function revalidate(contractorId: string) {
  revalidatePath(`/portal/contractors/${contractorId}/tax`)
  revalidatePath(`/portal/contractors/${contractorId}/setup`)
  revalidatePath(`/portal/contractors/${contractorId}`)
}

async function admin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { supabase, user: null as null }
  return { supabase, user }
}

export interface DeclarationStaffInput {
  contractorId: string
  contractingEntityType?: string | null
  contractingLegalName?: string | null
  contractingIrdNumber?: string | null
  residencyStatus?: string | null
  declarationType: DeclarationType
  ir330cActivityNumber?: string | null
  ir330cActivityDescription?: string | null
  withholdingRate?: number | null   // decimal
  declarationDate?: string | null
  effectiveDate?: string | null
  expiryDate?: string | null
  tailoredRateCertificateRef?: string | null
  exemptionCertificateRef?: string | null
  evidenceRef?: string | null
  signedName?: string | null
  /** Mark verified immediately (a staff-received paper IR330C the staff member is
   *  verifying now). Contractor-submitted rows are NEVER auto-verified. */
  verifyNow?: boolean
}

/**
 * Record a new declaration (staff-entered, e.g. a paper IR330C). Supersedes any
 * existing current row. Rate-validated. If verifyNow, it's created verified;
 * otherwise submitted (pending).
 */
export async function recordDeclaration(input: DeclarationStaffInput): Promise<{ ok?: true; id?: string; error?: string }> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }

  const rateErr = validateDeclarationRate(input as DeclarationInput)
  if (rateErr) return { error: rateErr }

  // Verified-completeness guard (mirrors the DB CHECK): a verify-now record must
  // carry an effective date + signature; text/version/verified_by are set below.
  if (input.verifyNow) {
    if (!input.effectiveDate) return { error: 'A verified declaration needs an effective date.' }
    if (!input.signedName?.trim()) return { error: 'A verified declaration must be signed (enter the signatory name).' }
  }

  const nowIso = new Date().toISOString()
  // A VERIFIED declaration and a PENDING replacement may coexist. So:
  //  - a pending (submit-only) record replaces only a prior SUBMITTED row (never
  //    the live verified one — that stays valid through review);
  //  - a verify-now record supersedes the prior CURRENT VERIFIED row atomically.
  // The one-submitted / one-current-verified partial indexes enforce this.
  const { data: priorSubmitted } = await supabase
    .from('contractor_tax_declarations')
    .select('id').eq('contractor_id', input.contractorId).eq('status', 'submitted').maybeSingle()
  const { data: priorVerified } = await supabase
    .from('contractor_tax_declarations')
    .select('id').eq('contractor_id', input.contractorId).eq('status', 'verified').is('superseded_at', null).maybeSingle()

  // Which prior row (if any) this new row supersedes: verify-now → the verified
  // current; submit-only → any pending submitted it replaces.
  const supersedesId = input.verifyNow ? (priorVerified?.id ?? null) : (priorSubmitted?.id ?? null)
  // A pending submit must first clear any existing pending row (only one allowed).
  if (!input.verifyNow && priorSubmitted?.id) {
    await supabase.from('contractor_tax_declarations')
      .update({ status: 'superseded', superseded_at: nowIso, superseded_by_id: null })
      .eq('id', priorSubmitted.id)
  }

  const { data: inserted, error: insErr } = await supabase
    .from('contractor_tax_declarations')
    .insert({
      contractor_id: input.contractorId,
      contracting_entity_type: input.contractingEntityType || null,
      contracting_legal_name: input.contractingLegalName || null,
      contracting_ird_number: input.contractingIrdNumber || null,
      residency_status: input.residencyStatus || null,
      declaration_type: input.declarationType,
      ir330c_activity_number: input.ir330cActivityNumber || null,
      ir330c_activity_description: input.ir330cActivityDescription || null,
      withholding_rate: input.withholdingRate ?? null,
      declaration_date: input.declarationDate || null,
      effective_date: input.effectiveDate || null,
      expiry_date: input.expiryDate || null,
      tailored_rate_certificate_ref: input.tailoredRateCertificateRef || null,
      exemption_certificate_ref: input.exemptionCertificateRef || null,
      evidence_ref: input.evidenceRef || null,
      signed_name: input.signedName || null,
      signed_at: input.signedName ? nowIso : null,
      declaration_text: CONTRACTOR_DECLARATION_TEXT,
      declaration_version: CONTRACTOR_DECLARATION_VERSION,
      source: 'staff_recorded',
      status: input.verifyNow ? 'verified' : 'submitted',
      verified_at: input.verifyNow ? nowIso : null,
      verified_by: input.verifyNow ? user.id : null,
      supersedes_id: supersedesId,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (insErr) {
    if ((insErr as { code?: string }).code === '23505') return { error: 'There is already a current declaration of that kind — supersede it first.' }
    return { error: insErr.message }
  }

  await supabase.from('contractor_tax_declarations').update({ declaration_number: `CTD-${String(inserted.id).slice(0, 4).toUpperCase()}` }).eq('id', inserted.id)

  // verify-now atomically supersedes the prior VERIFIED current row (both pointers).
  if (input.verifyNow && priorVerified?.id) {
    await supabase
      .from('contractor_tax_declarations')
      .update({ status: 'superseded', superseded_at: nowIso, superseded_by_id: inserted.id })
      .eq('id', priorVerified.id)
      .eq('status', 'verified')
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id, actor_role: 'admin', action: 'contractor_tax_declaration.recorded',
    entity_table: 'contractor_tax_declarations', entity_id: inserted.id,
    before: supersedesId ? { superseded: supersedesId } : null,
    after: { type: input.declarationType, verified: !!input.verifyNow },
  })
  revalidate(input.contractorId)
  return { ok: true, id: inserted.id as string }
}

/** Verify (or reject) a submitted declaration. Audited with old→new status. */
export async function setDeclarationStatus(
  declarationId: string,
  status: 'verified' | 'rejected',
  reviewNotes: string | null,
): Promise<{ ok?: true; error?: string }> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }

  const { data: d } = await supabase
    .from('contractor_tax_declarations')
    .select('id, contractor_id, status, effective_date, signed_name, signed_at, declaration_text, declaration_version, supersedes_id')
    .eq('id', declarationId)
    .maybeSingle()
  if (!d) return { error: 'Declaration not found.' }
  if (d.status !== 'submitted') return { error: `Only a submitted declaration can be ${status}. This one is ${d.status}.` }

  const nowIso = new Date().toISOString()

  // Rejecting a replacement leaves the existing verified declaration untouched.
  if (status === 'rejected') {
    const { error } = await supabase
      .from('contractor_tax_declarations')
      .update({ status: 'rejected', review_notes: reviewNotes || null })
      .eq('id', declarationId).eq('status', 'submitted')
    if (error) return { error: error.message }
    await supabase.from('audit_log').insert({
      actor_id: user.id, actor_role: 'admin', action: 'contractor_tax_declaration.rejected',
      entity_table: 'contractor_tax_declarations', entity_id: declarationId,
      before: { status: 'submitted' }, after: { status: 'rejected', review_notes: reviewNotes || null },
    })
    revalidate(d.contractor_id as string)
    return { ok: true }
  }

  // Verifying: app-level completeness guard (mirrors the DB CHECK) — a verified
  // declaration must carry an effective date + signature + declaration wording.
  if (!d.effective_date) return { error: 'Set an effective date before verifying this declaration.' }
  if (!d.signed_name || !d.signed_at) return { error: 'A verified declaration must be signed.' }
  if (!d.declaration_text || !d.declaration_version) return { error: 'The declaration wording/version is missing.' }

  // Atomically supersede the prior CURRENT VERIFIED row (if any) as this one
  // becomes verified. Both pointers populated: new.supersedes_id (may already be
  // set from submission) and old.superseded_by_id.
  const { data: priorVerified } = await supabase
    .from('contractor_tax_declarations')
    .select('id').eq('contractor_id', d.contractor_id as string).eq('status', 'verified').is('superseded_at', null).maybeSingle()

  const { error: vErr } = await supabase
    .from('contractor_tax_declarations')
    .update({
      status: 'verified', verified_at: nowIso, verified_by: user.id, review_notes: reviewNotes || null,
      // Ensure the back-pointer reflects the row actually superseded now.
      supersedes_id: priorVerified?.id ?? (d.supersedes_id as string | null) ?? null,
    })
    .eq('id', declarationId).eq('status', 'submitted')
  if (vErr) return { error: vErr.message }

  if (priorVerified?.id) {
    const { error: supErr } = await supabase
      .from('contractor_tax_declarations')
      .update({ status: 'superseded', superseded_at: nowIso, superseded_by_id: declarationId })
      .eq('id', priorVerified.id).eq('status', 'verified')
    if (supErr) return { error: `Verified, but superseding the prior declaration failed: ${supErr.message}` }
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id, actor_role: 'admin', action: 'contractor_tax_declaration.verified',
    entity_table: 'contractor_tax_declarations', entity_id: declarationId,
    before: { status: 'submitted', prior_verified: priorVerified?.id ?? null },
    after: { status: 'verified', superseded: priorVerified?.id ?? null },
  })
  revalidate(d.contractor_id as string)
  return { ok: true }
}

/** Classify a service schedule's tax treatment (staff-only). Contractors cannot
 *  reach this — it lives in the admin-gated portal actions. */
export async function setScheduleTaxTreatment(
  contractorId: string,
  scheduleId: string,
  treatment: 'schedular_payment' | 'ordinary_trade_creditor' | 'exempt_certificate' | 'pending_review',
  note: string | null,
  effectiveFrom?: string | null,
): Promise<{ ok?: true; error?: string; supersededBy?: string }> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }

  // Load the FULL schedule (we clone it if it must supersede). Confirm ownership.
  const { data: sch } = await supabase
    .from('contractor_service_schedules')
    .select('*')
    .eq('id', scheduleId)
    .eq('contractor_id', contractorId)
    .maybeSingle()
  if (!sch) return { error: 'That schedule does not belong to this contractor.' }
  const s = sch as Record<string, unknown>
  const status = (s.status as string) ?? 'draft'
  const mode = classificationChangeMode(status)
  if (mode === 'rejected') {
    return { error: 'This schedule version is no longer current — classify the current version.' }
  }

  const nowIso = new Date().toISOString()
  const priorTreatment = (s.tax_treatment as string | null) ?? null

  // DRAFT: classification is part of the version being built — edit in place.
  if (mode === 'edit_in_place') {
    const { error } = await supabase
      .from('contractor_service_schedules')
      .update({ tax_treatment: treatment, tax_treatment_note: note || null, updated_at: nowIso })
      .eq('id', scheduleId)
    if (error) return { error: error.message }
    await supabase.from('audit_log').insert({
      actor_id: user.id, actor_role: 'admin', action: 'contractor_schedule.tax_treatment_set_draft',
      entity_table: 'contractor_service_schedules', entity_id: scheduleId,
      before: { tax_treatment: priorTreatment }, after: { tax_treatment: treatment },
    })
    revalidate(contractorId)
    return { ok: true }
  }

  // ACTIVE (or paused): the classification is part of an effective-dated version —
  // no silent in-place change. Supersede: create a NEW version (clone) carrying the
  // new tax_treatment + effective_from, mark the old one superseded pointing at the
  // new one. Later payment snapshots can identify which version/classification
  // applied on any date via the effective_from + supersession lineage.
  if (priorTreatment === treatment) return { ok: true } // no-op, nothing to supersede

  const effIso = (effectiveFrom || nowIso.slice(0, 10))
  // Clone the current version's fields into a new row (new id), with the new
  // classification, effective from the change date, superseding the old row.
  const clone: Record<string, unknown> = { ...s }
  delete clone.id
  delete clone.created_at
  delete clone.updated_at
  delete clone.superseded_at
  delete clone.superseded_by
  clone.tax_treatment = treatment
  clone.tax_treatment_note = note || null
  clone.effective_from = effIso
  clone.supersedes_id = scheduleId
  clone.status = status // stays active/paused
  clone.created_by = user.id
  clone.approved_by = user.id

  const { data: newRow, error: insErr } = await supabase
    .from('contractor_service_schedules')
    .insert(clone)
    .select('id')
    .single()
  if (insErr) return { error: `Could not create the new schedule version: ${insErr.message}` }

  const { error: supErr } = await supabase
    .from('contractor_service_schedules')
    .update({ status: 'superseded', superseded_at: nowIso, superseded_by: newRow.id, updated_at: nowIso })
    .eq('id', scheduleId)
  if (supErr) return { error: `New version created but superseding the old failed: ${supErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id, actor_role: 'admin', action: 'contractor_schedule.tax_treatment_superseded',
    entity_table: 'contractor_service_schedules', entity_id: newRow.id,
    before: { schedule_version: scheduleId, tax_treatment: priorTreatment },
    after: { schedule_version: newRow.id, tax_treatment: treatment, effective_from: effIso, supersedes: scheduleId },
  })
  revalidate(contractorId)
  return { ok: true, supersededBy: newRow.id as string }
}
