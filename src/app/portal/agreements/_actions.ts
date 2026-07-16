'use server'

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'

export async function createEmploymentAgreement(input: {
  agreementType: 'casual_employee' | 'contractor'
  personLabel: string
  position: string
  hourlyRate: number | null
  startDate: string | null
  /** Optionally link this agreement to an existing person so it's tied to
   *  them (no duplicate on sign) and pre-filled with what we already hold. */
  linkedContractorId?: string | null
  linkedEmployeeId?: string | null
}): Promise<{ ok?: true; id?: string; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const isContractor = input.agreementType === 'contractor'

  // Pre-fill from a linked existing person. Only the fields that reliably
  // exist today (name / email / phone, plus address for employees) — the
  // remaining legal fields are completed at signing.
  const prefill: Record<string, unknown> = {}
  let linkedLabel: string | null = null
  if (isContractor && input.linkedContractorId) {
    const { data: c } = await supabase
      .from('contractors')
      .select('id, full_name, email, phone')
      .eq('id', input.linkedContractorId)
      .maybeSingle()
    if (c) {
      linkedLabel = c.full_name as string
      prefill.contractor_id = c.id
      prefill.employee_full_name = c.full_name
      prefill.employee_email = c.email ?? null
      prefill.employee_phone = c.phone ?? null
    }
  } else if (!isContractor && input.linkedEmployeeId) {
    const { data: e } = await supabase
      .from('employees')
      .select('id, full_name, email, phone, address')
      .eq('id', input.linkedEmployeeId)
      .maybeSingle()
    if (e) {
      linkedLabel = e.full_name as string
      prefill.employee_id = e.id
      prefill.employee_full_name = e.full_name
      prefill.employee_email = e.email ?? null
      prefill.employee_phone = e.phone ?? null
      prefill.employee_address = e.address ?? null
    }
  }

  const { data, error } = await supabase
    .from('employment_agreements')
    .insert({
      agreement_type: isContractor ? 'contractor' : 'casual_employee',
      person_label: linkedLabel || input.personLabel?.trim() || (isContractor ? 'Contractor' : 'Carol'),
      position: isContractor ? 'Independent Contractor' : (input.position?.trim() || 'Cleaner (Casual)'),
      hourly_rate: isContractor ? null : input.hourlyRate,
      start_date: input.startDate || null,
      status: 'draft',
      created_by: user.id,
      ...prefill,
    })
    .select('id')
    .single()
  if (error || !data) return { error: `Couldn’t create: ${error?.message ?? 'no row'}` }

  revalidatePath('/portal/agreements')
  return { ok: true, id: data.id as string }
}

export async function deleteEmploymentAgreement(id: string): Promise<{ ok?: true; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  const { error } = await supabase.from('employment_agreements').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/portal/agreements')
  return { ok: true }
}
