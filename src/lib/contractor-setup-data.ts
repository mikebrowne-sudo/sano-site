// Contractor setup + service schedules — server-side read helpers.
//
// Admin reads use the RLS admin client; the token (secure-link) read uses the
// service-role client, mirroring /agreement/[token] and /share/*.

import { getServiceSupabase } from './supabase-service'
import type { SectionStatusMap } from './contractor-setup-status'
import type { PaymentBasis, PaymentMethod, RateBasis } from './contractor-schedule-preview'

export interface ServiceSchedule {
  id: string
  scheduleRef: string | null
  name: string
  customerClientId: string | null
  siteId: string | null
  serviceAddress: string | null
  classification: 'residential' | 'commercial' | null
  serviceType: string | null
  workDescription: string | null
  startDate: string | null
  endDate: string | null
  term: 'ongoing' | 'fixed' | null
  frequency: string | null
  expectedUnits: string | null
  workVariability: 'fixed' | 'variable' | null
  paymentMethod: PaymentMethod | null
  paymentBasis: PaymentBasis | null
  rateBasis: RateBasis | null
  agreedAmount: number | null
  paymentFrequency: string | null
  noticePeriod: string | null
  priceReviewDate: string | null
  paymentReference: string | null
  costCentre: string | null
  status: 'draft' | 'active' | 'paused' | 'ended' | 'superseded'
  effectiveFrom: string | null
  createdAt: string | null
}

export interface InsuranceArrangement {
  id: string
  mode: 'own_required' | 'covered_by_sano' | 'not_required' | 'pending_review'
  requiredType: string | null
  minCover: number | null
  insurer: string | null
  policyNumber: string | null
  effectiveDate: string | null
  expiryDate: string | null
  verificationStatus: string | null
  sanoPolicyRef: string | null
  coverType: string | null
  coverLimit: number | null
  confirmedAt: string | null
  notes: string | null
}

export interface ContractorSetup {
  id: string
  contractorId: string
  token: string
  status: string
  sectionStatus: SectionStatusMap
  proposedChanges: Record<string, unknown>
  contractorNote: string | null
  sentAt: string | null
  submittedAt: string | null
  reviewedAt: string | null
  createdAt: string | null
}

function mapSchedule(r: Record<string, unknown>): ServiceSchedule {
  return {
    id: r.id as string,
    scheduleRef: (r.schedule_ref as string | null) ?? null,
    name: (r.name as string | null) ?? '',
    customerClientId: (r.customer_client_id as string | null) ?? null,
    siteId: (r.site_id as string | null) ?? null,
    serviceAddress: (r.service_address as string | null) ?? null,
    classification: (r.classification as 'residential' | 'commercial' | null) ?? null,
    serviceType: (r.service_type as string | null) ?? null,
    workDescription: (r.work_description as string | null) ?? null,
    startDate: (r.start_date as string | null) ?? null,
    endDate: (r.end_date as string | null) ?? null,
    term: (r.term as 'ongoing' | 'fixed' | null) ?? null,
    frequency: (r.frequency as string | null) ?? null,
    expectedUnits: (r.expected_units as string | null) ?? null,
    workVariability: (r.work_variability as 'fixed' | 'variable' | null) ?? null,
    paymentMethod: (r.payment_method as PaymentMethod | null) ?? null,
    paymentBasis: (r.payment_basis as PaymentBasis | null) ?? null,
    rateBasis: (r.rate_basis as RateBasis | null) ?? null,
    agreedAmount: r.agreed_amount == null ? null : Number(r.agreed_amount),
    paymentFrequency: (r.payment_frequency as string | null) ?? null,
    noticePeriod: (r.notice_period as string | null) ?? null,
    priceReviewDate: (r.price_review_date as string | null) ?? null,
    paymentReference: (r.payment_reference as string | null) ?? null,
    costCentre: (r.cost_centre as string | null) ?? null,
    status: (r.status as ServiceSchedule['status']) ?? 'draft',
    effectiveFrom: (r.effective_from as string | null) ?? null,
    createdAt: (r.created_at as string | null) ?? null,
  }
}

function mapSetup(r: Record<string, unknown>): ContractorSetup {
  return {
    id: r.id as string,
    contractorId: r.contractor_id as string,
    token: r.token as string,
    status: (r.status as string) ?? 'draft',
    sectionStatus: (r.section_status as SectionStatusMap) ?? {},
    proposedChanges: (r.proposed_changes as Record<string, unknown>) ?? {},
    contractorNote: (r.contractor_note as string | null) ?? null,
    sentAt: (r.sent_at as string | null) ?? null,
    submittedAt: (r.submitted_at as string | null) ?? null,
    reviewedAt: (r.reviewed_at as string | null) ?? null,
    createdAt: (r.created_at as string | null) ?? null,
  }
}

/** Staff read: the setup + schedules + insurance for a contractor. */
export async function getContractorSetupBundle(contractorId: string): Promise<{
  setup: ContractorSetup | null
  schedules: ServiceSchedule[]
  insurance: InsuranceArrangement | null
}> {
  const svc = getServiceSupabase()
  const [{ data: setup }, { data: schedules }, { data: insurance }] = await Promise.all([
    svc.from('contractor_setup').select('*').eq('contractor_id', contractorId).maybeSingle(),
    svc.from('contractor_service_schedules').select('*').eq('contractor_id', contractorId).order('created_at', { ascending: true }),
    svc.from('contractor_insurance_arrangement').select('*').eq('contractor_id', contractorId).maybeSingle(),
  ])
  return {
    setup: setup ? mapSetup(setup as Record<string, unknown>) : null,
    schedules: (schedules ?? []).map((s) => mapSchedule(s as Record<string, unknown>)),
    insurance: insurance ? mapInsurance(insurance as Record<string, unknown>) : null,
  }
}

/** Token read (secure link, service-role). Returns the setup + contractor basics
 *  + schedules the contractor can review. */
export async function getSetupByToken(token: string): Promise<{
  setup: ContractorSetup
  contractor: { id: string; fullName: string | null; email: string | null; businessStructure: string | null }
  schedules: ServiceSchedule[]
} | null> {
  const svc = getServiceSupabase()
  const { data: setup } = await svc.from('contractor_setup').select('*').eq('token', token).maybeSingle()
  if (!setup) return null
  const contractorId = (setup as Record<string, unknown>).contractor_id as string
  const [{ data: c }, { data: schedules }] = await Promise.all([
    svc.from('contractors').select('id, full_name, email, business_structure').eq('id', contractorId).maybeSingle(),
    svc.from('contractor_service_schedules').select('*').eq('contractor_id', contractorId).neq('status', 'superseded').order('created_at', { ascending: true }),
  ])
  return {
    setup: mapSetup(setup as Record<string, unknown>),
    contractor: {
      id: contractorId,
      fullName: (c?.full_name as string | null) ?? null,
      email: (c?.email as string | null) ?? null,
      businessStructure: (c?.business_structure as string | null) ?? null,
    },
    schedules: (schedules ?? []).map((s) => mapSchedule(s as Record<string, unknown>)),
  }
}

function mapInsurance(r: Record<string, unknown>): InsuranceArrangement {
  return {
    id: r.id as string,
    mode: (r.mode as InsuranceArrangement['mode']) ?? 'pending_review',
    requiredType: (r.required_type as string | null) ?? null,
    minCover: r.min_cover == null ? null : Number(r.min_cover),
    insurer: (r.insurer as string | null) ?? null,
    policyNumber: (r.policy_number as string | null) ?? null,
    effectiveDate: (r.effective_date as string | null) ?? null,
    expiryDate: (r.expiry_date as string | null) ?? null,
    verificationStatus: (r.verification_status as string | null) ?? null,
    sanoPolicyRef: (r.sano_policy_ref as string | null) ?? null,
    coverType: (r.cover_type as string | null) ?? null,
    coverLimit: r.cover_limit == null ? null : Number(r.cover_limit),
    confirmedAt: (r.confirmed_at as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
  }
}
