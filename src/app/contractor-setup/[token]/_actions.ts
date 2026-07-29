'use server'

// Contractor-side secure-link actions (PR 1). Token-keyed, service-role — no
// portal login. The contractor confirms identity + contracting structure and
// reviews service schedules. Critical changes are written to the setup's
// proposed_changes buffer for staff acceptance — they NEVER overwrite the live
// contractor record here. Contractors cannot edit agreed rates/customer terms;
// a disagreement is recorded as a note that returns to Sano.

import { getServiceSupabase } from '@/lib/supabase-service'
import { revalidatePath } from 'next/cache'

interface IdentityStructureInput {
  token: string
  fullName: string
  preferredName?: string
  phone?: string
  address?: string
  businessStructure: string // sole_trader | company | partnership | trust | other
  legalName?: string
  tradingName?: string
  nzbn?: string
  companyNumber?: string
  bankAccountName?: string
}

const CRITICAL_FIELDS: Record<string, string> = {
  full_name: 'full_name', preferred_name: 'preferred_name', phone: 'phone', address: 'address',
  business_structure: 'business_structure', legal_name: 'legal_name', nzbn: 'nzbn',
  company_number: 'company_number', bank_account_name: 'bank_account_name',
}

/**
 * Contractor submits identity + structure. We diff against the live contractor
 * record and stage any changes into proposed_changes (old → new). Nothing on the
 * contractors row is mutated here. Marks identity + structure sections
 * awaiting_sano_review and flips the setup to contractor_submitted.
 */
export async function submitIdentityStructure(input: IdentityStructureInput): Promise<{ ok?: true; error?: string }> {
  if (!input.token) return { error: 'Invalid link.' }
  if (!input.fullName?.trim()) return { error: 'Your full legal name is required.' }
  if (!input.businessStructure) return { error: 'Select your contracting structure.' }

  const svc = getServiceSupabase()
  const { data: setup } = await svc.from('contractor_setup').select('id, contractor_id, section_status, proposed_changes').eq('token', input.token).maybeSingle()
  if (!setup) return { error: 'This link is not valid.' }
  const contractorId = setup.contractor_id as string

  const { data: c } = await svc.from('contractors')
    .select('full_name, preferred_name, phone, address, business_structure, legal_name, company_name, nzbn, company_number, bank_account_name')
    .eq('id', contractorId).maybeSingle()
  if (!c) return { error: 'Contractor record not found.' }

  // Build the proposed set: only fields the contractor actually changed.
  const submitted: Record<string, string | null> = {
    full_name: input.fullName.trim(),
    preferred_name: input.preferredName?.trim() || null,
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    business_structure: input.businessStructure,
    legal_name: input.legalName?.trim() || null,
    company_number: input.companyNumber?.trim() || null,
    nzbn: input.nzbn?.trim() || null,
    bank_account_name: input.bankAccountName?.trim() || null,
  }
  const proposed = { ...((setup.proposed_changes as Record<string, { old: unknown; new: unknown }>) ?? {}) }
  for (const [field, value] of Object.entries(submitted)) {
    if (!CRITICAL_FIELDS[field]) continue
    const current = (c as Record<string, unknown>)[field] ?? null
    if ((current ?? null) !== (value ?? null)) proposed[field] = { old: current ?? null, new: value }
  }

  const sectionStatus = { ...((setup.section_status as Record<string, string>) ?? {}) }
  sectionStatus.identity = 'awaiting_sano_review'
  sectionStatus.structure = 'awaiting_sano_review'
  // Banking name confirmation only advances the banking section to review; full
  // bank verification remains its own workflow.
  if (submitted.bank_account_name) sectionStatus.banking = 'awaiting_sano_review'

  const { error } = await svc.from('contractor_setup').update({
    proposed_changes: proposed,
    section_status: sectionStatus,
    status: 'contractor_submitted',
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', setup.id)
  if (error) return { error: error.message }

  revalidatePath(`/contractor-setup/${input.token}`)
  return { ok: true }
}

/**
 * Contractor flags an incorrect commercial term on a schedule. Recorded as a
 * note that returns to Sano — the contractor cannot edit the rate/customer terms.
 */
export async function flagScheduleTerm(token: string, scheduleName: string, note: string): Promise<{ ok?: true; error?: string }> {
  if (!token) return { error: 'Invalid link.' }
  if (!note?.trim()) return { error: 'Add a short note describing what looks wrong.' }

  const svc = getServiceSupabase()
  const { data: setup } = await svc.from('contractor_setup').select('id, contractor_note, section_status').eq('token', token).maybeSingle()
  if (!setup) return { error: 'This link is not valid.' }

  const prior = (setup.contractor_note as string | null) ?? ''
  const stamped = `${prior ? prior + '\n' : ''}[${scheduleName}] ${note.trim()}`
  const sectionStatus = { ...((setup.section_status as Record<string, string>) ?? {}) }
  sectionStatus.service_schedules = 'awaiting_sano_review'

  const { error } = await svc.from('contractor_setup').update({
    contractor_note: stamped,
    section_status: sectionStatus,
    status: 'changes_requested',
    updated_at: new Date().toISOString(),
  }).eq('id', setup.id)
  if (error) return { error: error.message }

  revalidatePath(`/contractor-setup/${token}`)
  return { ok: true }
}

/** Contractor confirms the service schedules look right (no changes). */
export async function confirmSchedules(token: string): Promise<{ ok?: true; error?: string }> {
  if (!token) return { error: 'Invalid link.' }
  const svc = getServiceSupabase()
  const { data: setup } = await svc.from('contractor_setup').select('id, section_status').eq('token', token).maybeSingle()
  if (!setup) return { error: 'This link is not valid.' }
  const sectionStatus = { ...((setup.section_status as Record<string, string>) ?? {}) }
  sectionStatus.service_schedules = 'awaiting_sano_review'
  const { error } = await svc.from('contractor_setup').update({ section_status: sectionStatus, updated_at: new Date().toISOString() }).eq('id', setup.id)
  if (error) return { error: error.message }
  revalidatePath(`/contractor-setup/${token}`)
  return { ok: true }
}
