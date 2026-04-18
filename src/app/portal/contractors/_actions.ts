'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

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
  notes?: string
  // Payroll
  start_date?: string
  end_date?: string
  pay_frequency?: string
  standard_hours?: number
  holiday_pay_method?: string
  ird_number?: string
  tax_code?: string
  ir330_received?: boolean
  kiwisaver_enrolled?: boolean
  kiwisaver_employee_rate?: number
  kiwisaver_employer_rate?: number
  // Insurance
  insurance_provider?: string
  insurance_policy_number?: string
  insurance_expiry?: string
  insurance_liability_cover?: number
  // Business identity (contractor)
  company_name?: string
  business_structure?: string
  nzbn?: string
  // GST (contractor)
  gst_registered?: boolean
  gst_number?: string
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
    kiwisaver_enrolled: input.kiwisaver_enrolled ?? false,
    kiwisaver_employee_rate: input.kiwisaver_employee_rate ?? 3,
    kiwisaver_employer_rate: input.kiwisaver_employer_rate ?? 3,
  }
}

function validateGst(input: ContractorInput): string | null {
  if (input.gst_registered && !input.gst_number?.trim()) {
    return 'GST number is required when GST registered is on.'
  }
  return null
}

export async function createContractor(input: ContractorInput) {
  const supabase = createClient()

  if (!input.full_name.trim()) {
    return { error: 'Full name is required.' }
  }

  const gstError = validateGst(input)
  if (gstError) return { error: gstError }

  const { data, error } = await supabase
    .from('contractors')
    .insert({
      full_name: input.full_name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      hourly_rate: input.hourly_rate ?? null,
      status: input.status || 'active',
      worker_type: input.worker_type || 'contractor',
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
      // GST (contractor)
      gst_registered: input.gst_registered ?? false,
      gst_number: input.gst_number?.trim() || null,
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

  const { error } = await supabase
    .from('contractors')
    .update({
      full_name: input.full_name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      hourly_rate: input.hourly_rate ?? null,
      status: input.status || 'active',
      worker_type: input.worker_type || 'contractor',
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
      // GST (contractor)
      gst_registered: input.gst_registered ?? false,
      gst_number: input.gst_number?.trim() || null,
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
