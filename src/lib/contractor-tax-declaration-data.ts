// Contractor tax declaration — server-side reads.
//
// Staff reads use the RLS admin client; the token (secure-link) read uses the
// service-role client with a STRICT contractor-safe allowlist (never review
// notes, verification metadata, other declarations of other contractors, or
// internal document refs).

import { getServiceSupabase } from './supabase-service'
import type { DeclarationRecord } from './contractor-tax-declaration'

export interface FullDeclaration extends DeclarationRecord {
  declarationNumber: string | null
  contractorId: string
  contractingEntityType: string | null
  contractingLegalName: string | null
  contractingIrdNumber: string | null
  residencyStatus: string | null
  ir330cActivityNumber: string | null
  ir330cActivityDescription: string | null
  tailoredRateCertificateRef: string | null
  exemptionCertificateRef: string | null
  evidenceRef: string | null
  signedName: string | null
  signedAt: string | null
  source: string
  verifiedAt: string | null
  verifiedBy: string | null
  reviewNotes: string | null
  supersedesId: string | null
  supersededAt: string | null
  createdAt: string | null
}

function mapFull(r: Record<string, unknown>): FullDeclaration {
  return {
    id: r.id as string,
    declarationNumber: (r.declaration_number as string | null) ?? null,
    contractorId: r.contractor_id as string,
    status: (r.status as DeclarationRecord['status']) ?? 'submitted',
    declarationType: r.declaration_type as DeclarationRecord['declarationType'],
    withholdingRate: r.withholding_rate == null ? null : Number(r.withholding_rate),
    effectiveDate: (r.effective_date as string | null) ?? null,
    expiryDate: (r.expiry_date as string | null) ?? null,
    contractingEntityType: (r.contracting_entity_type as string | null) ?? null,
    contractingLegalName: (r.contracting_legal_name as string | null) ?? null,
    contractingIrdNumber: (r.contracting_ird_number as string | null) ?? null,
    residencyStatus: (r.residency_status as string | null) ?? null,
    ir330cActivityNumber: (r.ir330c_activity_number as string | null) ?? null,
    ir330cActivityDescription: (r.ir330c_activity_description as string | null) ?? null,
    tailoredRateCertificateRef: (r.tailored_rate_certificate_ref as string | null) ?? null,
    exemptionCertificateRef: (r.exemption_certificate_ref as string | null) ?? null,
    evidenceRef: (r.evidence_ref as string | null) ?? null,
    signedName: (r.signed_name as string | null) ?? null,
    signedAt: (r.signed_at as string | null) ?? null,
    source: (r.source as string) ?? 'staff_recorded',
    verifiedAt: (r.verified_at as string | null) ?? null,
    verifiedBy: (r.verified_by as string | null) ?? null,
    reviewNotes: (r.review_notes as string | null) ?? null,
    supersedesId: (r.supersedes_id as string | null) ?? null,
    supersededAt: (r.superseded_at as string | null) ?? null,
    createdAt: (r.created_at as string | null) ?? null,
  }
}

/** The DeclarationRecord subset the tax-gate needs (current declaration). */
export function currentDeclarationRecord(d: FullDeclaration | null): DeclarationRecord | null {
  if (!d) return null
  return { id: d.id, status: d.status, declarationType: d.declarationType, withholdingRate: d.withholdingRate, expiryDate: d.expiryDate, effectiveDate: d.effectiveDate }
}

/** Staff read: current declaration + full history for a contractor. */
export async function getContractorDeclarations(contractorId: string): Promise<{ current: FullDeclaration | null; history: FullDeclaration[] }> {
  const svc = getServiceSupabase()
  const { data } = await svc
    .from('contractor_tax_declarations')
    .select('*')
    .eq('contractor_id', contractorId)
    .order('created_at', { ascending: false })
  const all = (data ?? []).map((r) => mapFull(r as Record<string, unknown>))
  const current = all.find((d) => d.status === 'submitted' || d.status === 'verified') ?? null
  return { current, history: all }
}

/** The contractor-SAFE view of the current declaration, for the token route.
 *  ONLY fields the contractor needs to see/complete — NEVER review notes,
 *  verification metadata, internal evidence refs, or other contractors. */
export interface ContractorSafeDeclaration {
  status: 'submitted' | 'verified' | 'rejected' | 'superseded'
  declarationType: string | null
  withholdingRate: number | null
  effectiveDate: string | null
  expiryDate: string | null
  ir330cActivityNumber: string | null
  /** Whether staff have asked for a correction (rejected) — a prompt to resubmit. */
  needsResubmit: boolean
}

export async function getContractorSafeDeclarationByToken(token: string): Promise<{ contractorId: string; declaration: ContractorSafeDeclaration | null } | null> {
  if (!token || token.length < 16) return null
  const svc = getServiceSupabase()
  // Resolve the contractor from the setup token (same gate as the setup route).
  const { data: setup } = await svc.from('contractor_setup').select('contractor_id, status').eq('token', token).maybeSingle()
  if (!setup) return null
  const OPEN = new Set(['draft', 'ready_to_send', 'awaiting_contractor', 'contractor_submitted', 'sano_review_required', 'changes_requested', 'ready_to_sign'])
  if (!OPEN.has((setup.status as string) ?? '')) return null
  const contractorId = setup.contractor_id as string

  const { data } = await svc
    .from('contractor_tax_declarations')
    .select('status, declaration_type, withholding_rate, effective_date, expiry_date, ir330c_activity_number')
    .eq('contractor_id', contractorId)
    .in('status', ['submitted', 'verified', 'rejected'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const declaration: ContractorSafeDeclaration | null = data ? {
    status: (data.status as ContractorSafeDeclaration['status']),
    declarationType: (data.declaration_type as string | null) ?? null,
    withholdingRate: data.withholding_rate == null ? null : Number(data.withholding_rate),
    effectiveDate: (data.effective_date as string | null) ?? null,
    expiryDate: (data.expiry_date as string | null) ?? null,
    ir330cActivityNumber: (data.ir330c_activity_number as string | null) ?? null,
    needsResubmit: data.status === 'rejected',
  } : null

  return { contractorId, declaration }
}
