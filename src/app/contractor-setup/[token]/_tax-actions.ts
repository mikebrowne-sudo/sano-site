'use server'

// Contractor-side IR330C submission via the secure setup link (PR 4). Token-keyed,
// service-role, no login. Creates a PENDING (submitted) declaration for Sano to
// review — it is NEVER auto-verified and NEVER payment-ready. The contractor
// cannot verify their own declaration, change a verified/historical one, bypass
// expiry, alter a schedule's tax classification, or set payment-ready status.

import { getServiceSupabase } from '@/lib/supabase-service'
import { revalidatePath } from 'next/cache'
import {
  validateDeclarationRate, CONTRACTOR_DECLARATION_TEXT, CONTRACTOR_DECLARATION_VERSION,
  type DeclarationType, type DeclarationInput,
} from '@/lib/contractor-tax-declaration'

const OPEN = new Set(['draft', 'ready_to_send', 'awaiting_contractor', 'contractor_submitted', 'sano_review_required', 'changes_requested', 'ready_to_sign'])

export interface ContractorDeclarationInput {
  token: string
  contractingIrdNumber?: string
  residencyStatus?: string
  declarationType: DeclarationType
  ir330cActivityNumber?: string
  ir330cActivityDescription?: string
  withholdingRate?: number | null
  effectiveDate?: string
  expiryDate?: string
  tailoredRateCertificateRef?: string
  exemptionCertificateRef?: string
  evidenceRef?: string
  signedName: string
  acknowledged: boolean
}

/**
 * Contractor submits an IR330C / tailored-rate / exemption declaration. Always
 * creates a PENDING (submitted) row, source=contractor_submitted, superseding any
 * prior current row. Rate-validated. Never verified here.
 */
export async function submitContractorDeclaration(input: ContractorDeclarationInput): Promise<{ ok?: true; error?: string }> {
  if (!input.token || input.token.length < 16) return { error: 'This link is not valid.' }
  if (!input.acknowledged) return { error: 'Please confirm the declaration to submit it.' }
  if (!input.signedName?.trim()) return { error: 'Type your name to sign the declaration.' }

  const rateErr = validateDeclarationRate(input as DeclarationInput)
  if (rateErr) return { error: rateErr }

  const svc = getServiceSupabase()
  const { data: setup } = await svc.from('contractor_setup').select('contractor_id, status').eq('token', input.token).maybeSingle()
  if (!setup) return { error: 'This link is not valid.' }
  if (!OPEN.has((setup.status as string) ?? '')) return { error: 'This setup is no longer open for changes.' }
  const contractorId = setup.contractor_id as string

  const nowIso = new Date().toISOString()
  const { data: current } = await svc
    .from('contractor_tax_declarations')
    .select('id')
    .eq('contractor_id', contractorId)
    .in('status', ['submitted', 'verified'])
    .maybeSingle()

  const { data: inserted, error: insErr } = await svc
    .from('contractor_tax_declarations')
    .insert({
      contractor_id: contractorId,
      contracting_ird_number: input.contractingIrdNumber?.trim() || null,
      residency_status: input.residencyStatus || null,
      declaration_type: input.declarationType,
      ir330c_activity_number: input.ir330cActivityNumber?.trim() || null,
      ir330c_activity_description: input.ir330cActivityDescription?.trim() || null,
      withholding_rate: input.withholdingRate ?? null,
      effective_date: input.effectiveDate || null,
      expiry_date: input.expiryDate || null,
      tailored_rate_certificate_ref: input.tailoredRateCertificateRef?.trim() || null,
      exemption_certificate_ref: input.exemptionCertificateRef?.trim() || null,
      evidence_ref: input.evidenceRef?.trim() || null,
      signed_name: input.signedName.trim(),
      signed_at: nowIso,
      declaration_text: CONTRACTOR_DECLARATION_TEXT,
      declaration_version: CONTRACTOR_DECLARATION_VERSION,
      source: 'contractor_submitted',
      status: 'submitted', // ALWAYS pending — never verified by the contractor
      supersedes_id: current?.id ?? null,
    })
    .select('id')
    .single()
  if (insErr) {
    if ((insErr as { code?: string }).code === '23505') return { error: 'A declaration is already awaiting review.' }
    return { error: insErr.message }
  }

  await svc.from('contractor_tax_declarations').update({ declaration_number: `CTD-${String(inserted.id).slice(0, 4).toUpperCase()}` }).eq('id', inserted.id)
  if (current?.id) {
    await svc.from('contractor_tax_declarations').update({ status: 'superseded', superseded_at: nowIso, superseded_by_id: inserted.id }).eq('id', current.id)
  }

  // Reflect into the setup section status (staff review required); never verified.
  const { data: s2 } = await svc.from('contractor_setup').select('section_status').eq('contractor_id', contractorId).maybeSingle()
  const section = { ...((s2?.section_status as Record<string, string>) ?? {}) }
  section.tax_declaration = 'awaiting_sano_review'
  await svc.from('contractor_setup').update({ section_status: section, status: 'contractor_submitted', updated_at: nowIso }).eq('contractor_id', contractorId)

  revalidatePath(`/contractor-setup/${input.token}`)
  return { ok: true }
}
