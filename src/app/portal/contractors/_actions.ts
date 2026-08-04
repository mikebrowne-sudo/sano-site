'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  KS_DEFAULT_EMPLOYEE,
  employerKiwiSaverRate,
  validateKiwiSaverElection,
  kiwiSaverStatusEnrolled,
} from '@/lib/payroll/kiwisaver'

interface ContractorInput {
  full_name: string
  email?: string
  phone?: string
  hourly_rate?: number
  base_hourly_rate?: number
  loaded_hourly_rate?: number
  holiday_pay_percent?: number
  status?: string
  worker_type?: string
  employment_type?: string | null
  notes?: string
  // Payroll
  start_date?: string
  end_date?: string
  pay_frequency?: string
  standard_hours?: number
  holiday_pay_method?: string
  /** Reason when overriding the agreed holiday-pay method after onboarding (audited). */
  holiday_pay_method_override_reason?: string
  ird_number?: string
  tax_code?: string
  ir330_received?: boolean
  kiwisaver_enrolled?: boolean
  kiwisaver_status?: string
  kiwisaver_ks3_provided?: boolean
  kiwisaver_optout_filed?: boolean
  kiwisaver_employee_rate?: number
  kiwisaver_employer_rate?: number
  kiwisaver_rate_source?: string
  kiwisaver_rate_effective_date?: string
  kiwisaver_temp_reduction_expiry?: string
  // Insurance
  insurance_provider?: string
  insurance_policy_number?: string
  insurance_expiry?: string
  insurance_liability_cover?: number
  // Business identity (contractor)
  company_name?: string
  business_structure?: string
  nzbn?: string
  legal_name?: string
  company_number?: string
  // GST (contractor)
  gst_registered?: boolean
  gst_number?: string
  gst_effective_date?: string
  gst_end_date?: string
  tax_treatment?: string
  // Payment (contractor)
  bank_account_name?: string
  bank_account_number?: string
  payment_terms_days?: number
  // Compliance
  contract_signed_date?: string
  right_to_work_required?: boolean
  right_to_work_expiry?: string
  // Operational
  service_areas?: string[]
  approved_services?: string[]
  availability_notes?: string
  has_vehicle?: boolean
  provides_own_equipment?: boolean
  key_holding_approved?: boolean
  alarm_access_approved?: boolean
  pet_friendly?: boolean
  // Work capability (Phase 2)
  experience_level?: string
  can_lead_jobs?: boolean
  can_work_solo?: boolean
  can_supervise_others?: boolean
  // Portal access (Phase 2)
  invite_sent_at?: string
  portal_access_active?: boolean
}

function payrollFields(input: ContractorInput) {
  const isEmployee = input.worker_type && input.worker_type !== 'contractor'
  if (!isEmployee) return {}

  const isPaygo = input.holiday_pay_method === 'pay_as_you_go_8_percent'
  const baseRate = input.base_hourly_rate ?? null
  const holidayPct = isPaygo ? (input.holiday_pay_percent ?? 8) : null
  const loadedRate = baseRate && isPaygo && holidayPct
    ? Math.round(baseRate * (1 + holidayPct / 100) * 100) / 100
    : null

  return {
    base_hourly_rate: baseRate,
    loaded_hourly_rate: loadedRate,
    holiday_pay_percent: holidayPct,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    pay_frequency: input.pay_frequency || null,
    standard_hours: input.standard_hours ?? null,
    holiday_pay_method: input.holiday_pay_method || null,
    ird_number: input.ird_number?.trim() || null,
    tax_code: input.tax_code || 'M',
    ir330_received: input.ir330_received ?? false,
    // Payroll enrolment DERIVES from the KiwiSaver membership status (single
    // source of truth); the passed enrolled flag is ignored when a status is set.
    kiwisaver_status: input.kiwisaver_status || null,
    kiwisaver_enrolled: input.kiwisaver_status ? kiwiSaverStatusEnrolled(input.kiwisaver_status) : (input.kiwisaver_enrolled ?? false),
    kiwisaver_ks3_provided: input.kiwisaver_ks3_provided ?? false,
    kiwisaver_optout_filed: input.kiwisaver_optout_filed ?? false,
    kiwisaver_employee_rate: input.kiwisaver_employee_rate ?? KS_DEFAULT_EMPLOYEE,
    kiwisaver_employer_rate: employerKiwiSaverRate(input.kiwisaver_employer_rate),
    kiwisaver_rate_source: input.kiwisaver_rate_source || 'standard',
    kiwisaver_rate_effective_date: input.kiwisaver_rate_effective_date || null,
    kiwisaver_temp_reduction_expiry: input.kiwisaver_temp_reduction_expiry || null,
  }
}

function validateGst(input: ContractorInput): string | null {
  if (input.gst_registered && !input.gst_number?.trim()) {
    return 'GST number is required when GST registered is on.'
  }
  return null
}

// Server-side KiwiSaver validation. Only STRUCTURAL errors block a write (bad
// rate, bad source, a temporary reduction missing its 3% / expiry). The
// "3% needs a temporary reduction" inconsistency is a soft warning surfaced in
// the form, never a hard block — so a historical record can still be edited.
// Not enrolled ⇒ nothing to validate.
function validateKiwiSaver(input: ContractorInput): string | null {
  if (!input.kiwisaver_enrolled) return null
  const { error } = validateKiwiSaverElection({
    rate: input.kiwisaver_employee_rate,
    source: input.kiwisaver_rate_source,
    expiry: input.kiwisaver_temp_reduction_expiry,
  })
  return error ?? null
}

export async function createContractor(input: ContractorInput) {
  const supabase = createClient()

  if (!input.full_name.trim()) {
    return { error: 'Full name is required.' }
  }

  const gstError = validateGst(input)
  if (gstError) return { error: gstError }

  const ksError = validateKiwiSaver(input)
  if (ksError) return { error: ksError }

  const { data, error } = await supabase
    .from('contractors')
    .insert({
      full_name: input.full_name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      hourly_rate: input.hourly_rate ?? null,
      status: input.status || 'active',
      worker_type: input.worker_type || 'contractor',
      employment_type: input.employment_type ?? null,
      notes: input.notes?.trim() || null,
      // Insurance
      insurance_provider: input.insurance_provider?.trim() || null,
      insurance_policy_number: input.insurance_policy_number?.trim() || null,
      insurance_expiry: input.insurance_expiry || null,
      insurance_liability_cover: input.insurance_liability_cover ?? null,
      // Business identity (contractor)
      company_name: input.company_name?.trim() || null,
      business_structure: input.business_structure || null,
      nzbn: input.nzbn?.trim() || null,
      legal_name: input.legal_name?.trim() || null,
      company_number: input.company_number?.trim() || null,
      // GST (contractor)
      gst_registered: input.gst_registered ?? false,
      gst_number: input.gst_number?.trim() || null,
      gst_effective_date: input.gst_registered ? (input.gst_effective_date || null) : null,
      gst_end_date: input.gst_end_date || null,
      tax_treatment: input.tax_treatment || 'pending_review',
      // Payment (contractor)
      bank_account_name: input.bank_account_name?.trim() || null,
      bank_account_number: input.bank_account_number?.trim() || null,
      payment_terms_days: input.payment_terms_days ?? null,
      // Compliance
      contract_signed_date: input.contract_signed_date || null,
      right_to_work_required: input.right_to_work_required ?? false,
      right_to_work_expiry: input.right_to_work_expiry || null,
      // Operational
      service_areas: input.service_areas ?? [],
      approved_services: input.approved_services ?? [],
      availability_notes: input.availability_notes?.trim() || null,
      has_vehicle: input.has_vehicle ?? false,
      provides_own_equipment: input.provides_own_equipment ?? false,
      key_holding_approved: input.key_holding_approved ?? false,
      alarm_access_approved: input.alarm_access_approved ?? false,
      pet_friendly: input.pet_friendly ?? false,
      // Work capability (Phase 2)
      experience_level: input.experience_level || null,
      can_lead_jobs: input.can_lead_jobs ?? false,
      can_work_solo: input.can_work_solo ?? true,
      can_supervise_others: input.can_supervise_others ?? false,
      // Portal access (Phase 2)
      invite_sent_at: input.invite_sent_at || null,
      portal_access_active: input.portal_access_active ?? false,
      ...payrollFields(input),
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: `Failed to create contractor: ${error?.message}` }
  }

  redirect(`/portal/contractors/${data.id}`)
}

export async function updateContractor(id: string, input: ContractorInput) {
  const supabase = createClient()

  if (!input.full_name.trim()) {
    return { error: 'Full name is required.' }
  }

  const gstError = validateGst(input)
  if (gstError) return { error: gstError }

  const ksError = validateKiwiSaver(input)
  if (ksError) return { error: ksError }

  const { error } = await supabase
    .from('contractors')
    .update({
      full_name: input.full_name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      hourly_rate: input.hourly_rate ?? null,
      status: input.status || 'active',
      worker_type: input.worker_type || 'contractor',
      employment_type: input.employment_type ?? null,
      notes: input.notes?.trim() || null,
      // Insurance
      insurance_provider: input.insurance_provider?.trim() || null,
      insurance_policy_number: input.insurance_policy_number?.trim() || null,
      insurance_expiry: input.insurance_expiry || null,
      insurance_liability_cover: input.insurance_liability_cover ?? null,
      // Business identity (contractor)
      company_name: input.company_name?.trim() || null,
      business_structure: input.business_structure || null,
      nzbn: input.nzbn?.trim() || null,
      legal_name: input.legal_name?.trim() || null,
      company_number: input.company_number?.trim() || null,
      // GST (contractor)
      gst_registered: input.gst_registered ?? false,
      gst_number: input.gst_number?.trim() || null,
      gst_effective_date: input.gst_registered ? (input.gst_effective_date || null) : null,
      gst_end_date: input.gst_end_date || null,
      tax_treatment: input.tax_treatment || 'pending_review',
      // Payment (contractor)
      bank_account_name: input.bank_account_name?.trim() || null,
      bank_account_number: input.bank_account_number?.trim() || null,
      payment_terms_days: input.payment_terms_days ?? null,
      // Compliance
      contract_signed_date: input.contract_signed_date || null,
      right_to_work_required: input.right_to_work_required ?? false,
      right_to_work_expiry: input.right_to_work_expiry || null,
      // Operational
      service_areas: input.service_areas ?? [],
      approved_services: input.approved_services ?? [],
      availability_notes: input.availability_notes?.trim() || null,
      has_vehicle: input.has_vehicle ?? false,
      provides_own_equipment: input.provides_own_equipment ?? false,
      key_holding_approved: input.key_holding_approved ?? false,
      alarm_access_approved: input.alarm_access_approved ?? false,
      pet_friendly: input.pet_friendly ?? false,
      // Work capability (Phase 2)
      experience_level: input.experience_level || null,
      can_lead_jobs: input.can_lead_jobs ?? false,
      can_work_solo: input.can_work_solo ?? true,
      can_supervise_others: input.can_supervise_others ?? false,
      // Portal access (Phase 2)
      invite_sent_at: input.invite_sent_at || null,
      portal_access_active: input.portal_access_active ?? false,
      ...payrollFields(input),
    })
    .eq('id', id)

  if (error) {
    return { error: `Failed to update contractor: ${error.message}` }
  }

  // Audit an override of the agreed (onboarding) holiday-pay method.
  if (input.holiday_pay_method_override_reason?.trim()) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('audit_log').insert({
      actor_id: user?.id ?? null,
      actor_role: 'admin',
      action: 'holiday_pay_method.override',
      entity_table: 'contractors',
      entity_id: id,
      after: {
        holiday_pay_method: input.holiday_pay_method,
        reason: input.holiday_pay_method_override_reason.trim(),
      },
    })
  }

  revalidatePath(`/portal/contractors/${id}`)
  revalidatePath('/portal/contractors')
  redirect(`/portal/contractors/${id}`)
}

export async function uploadDocument(formData: FormData) {
  const supabase = createClient()

  const contractorId = formData.get('contractor_id') as string
  const documentType = formData.get('document_type') as string
  const title = formData.get('title') as string
  const notes = formData.get('notes') as string
  const file = formData.get('file') as File

  if (!contractorId || !title?.trim() || !file) {
    return { error: 'Title and file are required.' }
  }

  // Upload to Supabase Storage
  const ext = file.name.split('.').pop() || 'bin'
  const filePath = `${contractorId}/${Date.now()}-${title.trim().replace(/\s+/g, '-').toLowerCase()}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from('worker-documents')
    .upload(filePath, file)

  if (uploadErr) {
    return { error: `Upload failed: ${uploadErr.message}` }
  }

  // Save metadata
  const { error: dbErr } = await supabase
    .from('worker_documents')
    .insert({
      contractor_id: contractorId,
      document_type: documentType || 'other',
      title: title.trim(),
      file_path: filePath,
      file_size: file.size,
      notes: notes?.trim() || null,
    })

  if (dbErr) {
    return { error: `Failed to save document record: ${dbErr.message}` }
  }

  // Upload = "mark as done" for the completed statutory forms. Uploading the
  // form is the evidence, so it flips the matching received/filed flag in one
  // step (staff can still change it manually on the profile).
  //   • IR330 / IR330C  → ir330_received = true (clears the ND-45% warning)
  //   • KS10 opt-out     → record the opt-out as filed
  const type = documentType || 'other'
  if (type === 'ir330' || type === 'ir330c') {
    await supabase.from('contractors').update({ ir330_received: true }).eq('id', contractorId)
  } else if (type === 'ks10_optout') {
    await supabase
      .from('contractors')
      .update({ kiwisaver_optout_filed: true, kiwisaver_ks10_received_date: new Date().toISOString().slice(0, 10) })
      .eq('id', contractorId)
  }

  revalidatePath(`/portal/contractors/${contractorId}`)
  return { success: true }
}

export async function deleteDocument(documentId: string, contractorId: string) {
  const supabase = createClient()

  // Get file path first
  const { data: doc } = await supabase
    .from('worker_documents')
    .select('file_path')
    .eq('id', documentId)
    .single()

  if (doc?.file_path) {
    await supabase.storage.from('worker-documents').remove([doc.file_path])
  }

  const { error } = await supabase
    .from('worker_documents')
    .delete()
    .eq('id', documentId)

  if (error) {
    return { error: `Failed to delete document: ${error.message}` }
  }

  revalidatePath(`/portal/contractors/${contractorId}`)
  return { success: true }
}

// ── Incidents ────────────────────────────────────────────────

interface IncidentInput {
  contractor_id: string
  incident_date: string
  severity: string
  description: string
  notes?: string
}

export async function createIncident(input: IncidentInput) {
  const supabase = createClient()

  if (!input.contractor_id || !input.incident_date || !input.severity || !input.description.trim()) {
    return { error: 'Date, severity and description are required.' }
  }

  const { error } = await supabase
    .from('contractor_incidents')
    .insert({
      contractor_id: input.contractor_id,
      incident_date: input.incident_date,
      severity: input.severity,
      description: input.description.trim(),
      notes: input.notes?.trim() || null,
    })

  if (error) return { error: `Failed to add incident: ${error.message}` }

  revalidatePath(`/portal/contractors/${input.contractor_id}`)
  return { success: true }
}

export async function resolveIncident(incidentId: string, contractorId: string) {
  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { error } = await supabase
    .from('contractor_incidents')
    .update({ resolved_at: today })
    .eq('id', incidentId)

  if (error) return { error: `Failed to resolve incident: ${error.message}` }

  revalidatePath(`/portal/contractors/${contractorId}`)
  return { success: true }
}

export async function deleteIncident(incidentId: string, contractorId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('contractor_incidents')
    .delete()
    .eq('id', incidentId)

  if (error) return { error: `Failed to delete incident: ${error.message}` }

  revalidatePath(`/portal/contractors/${contractorId}`)
  return { success: true }
}
