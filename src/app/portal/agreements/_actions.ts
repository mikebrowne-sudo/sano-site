'use server'

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { sendAgreementLinkEmail } from '@/lib/resend'

export async function createEmploymentAgreement(input: {
  agreementType: 'casual_employee' | 'permanent_employee' | 'contractor'
  personLabel: string
  position: string
  hourlyRate: number | null
  startDate: string | null
  /** Permanent-employee terms (ignored for casual/contractor). */
  agreedHoursPerWeek?: number | null
  agreedDays?: string | null
  placeOfWork?: string | null
  payFrequency?: string | null
  noticePeriod?: string | null
  /** Optionally link this agreement to an existing person so it's tied to
   *  them (no duplicate on sign) and pre-filled with what we already hold. */
  linkedContractorId?: string | null
  linkedEmployeeId?: string | null
  /** Test run — dry-runs the flow without creating a workforce record or
   *  notifying the team (only the tester is emailed on sign). */
  isTest?: boolean
}): Promise<{ ok?: true; id?: string; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const isContractor = input.agreementType === 'contractor'
  const isPermanent = input.agreementType === 'permanent_employee'

  // Pre-fill from a linked existing person. Only the fields that reliably
  // exist today (name / email / phone, plus address + tax code for employees) —
  // the remaining legal fields are completed at signing.
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
    // Employees are contractors rows (worker_type='employee'); link via
    // contractor_id so signing updates that same workforce record.
    const { data: e } = await supabase
      .from('contractors')
      .select('id, full_name, email, phone, address, tax_code')
      .eq('id', input.linkedEmployeeId)
      .eq('worker_type', 'employee')
      .maybeSingle()
    if (e) {
      linkedLabel = e.full_name as string
      prefill.contractor_id = e.id
      prefill.employee_full_name = e.full_name
      prefill.employee_email = e.email ?? null
      prefill.employee_phone = e.phone ?? null
      prefill.employee_address = e.address ?? null
      if (isPermanent && e.tax_code) prefill.tax_code = e.tax_code
    }
  }

  const version = isContractor ? 'Contractor 2026' : isPermanent ? 'Permanent Employee 2026' : 'Casual Employee 2026'
  const position = isContractor
    ? 'Independent Contractor'
    : (input.position?.trim() || (isPermanent ? 'Cleaner' : 'Cleaner (Casual)'))

  const { data, error } = await supabase
    .from('employment_agreements')
    .insert({
      agreement_type: input.agreementType,
      agreement_version: version,
      person_label: linkedLabel || input.personLabel?.trim() || (isContractor ? 'Contractor' : 'Employee'),
      position,
      hourly_rate: input.hourlyRate,
      start_date: input.startDate || null,
      // Permanent-only terms — null for other types.
      agreed_hours_per_week: isPermanent ? (input.agreedHoursPerWeek ?? null) : null,
      agreed_days: isPermanent ? (input.agreedDays?.trim() || null) : null,
      place_of_work: isPermanent ? (input.placeOfWork?.trim() || null) : null,
      pay_frequency: isPermanent ? (input.payFrequency ?? null) : null,
      notice_period: isPermanent ? (input.noticePeriod?.trim() || null) : null,
      status: 'draft',
      is_test: !!input.isTest,
      created_by: user.id,
      ...prefill,
    })
    .select('id')
    .single()
  if (error || !data) return { error: `Couldn’t create: ${error?.message ?? 'no row'}` }

  revalidatePath('/portal/agreements')
  return { ok: true, id: data.id as string }
}

export async function sendAgreementLink(input: { agreementId: string; email: string }): Promise<{ ok?: true; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const email = input.email.trim()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid email address.' }

  const { data: a } = await supabase
    .from('employment_agreements')
    .select('id, token, person_label, agreement_type, employee_full_name, contractor_id, status')
    .eq('id', input.agreementId)
    .maybeSingle()
  if (!a) return { error: 'Agreement not found.' }
  if (a.status === 'signed') return { error: 'This agreement is already signed.' }

  // Greet by the worker's real name — prefer the linked contractor record, then
  // the agreement's captured name, then a non-generic label; never "Contractor".
  let personName = (a.employee_full_name as string | null) || ''
  if (a.contractor_id) {
    const { data: c } = await supabase.from('contractors').select('full_name, preferred_name').eq('id', a.contractor_id as string).maybeSingle()
    personName = (c?.preferred_name as string | null) || (c?.full_name as string | null) || personName
  }
  if (!personName) {
    const label = ((a.person_label as string | null) || '').trim()
    if (label && !['contractor', 'employee', 'carol'].includes(label.toLowerCase())) personName = label
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sano.nz'
  const link = `${origin}/agreement/${a.token}`
  try {
    await sendAgreementLinkEmail({
      to: email,
      personName: personName || 'there',
      agreementType: a.agreement_type === 'contractor' ? 'contractor' : 'casual_employee',
      link,
    })
  } catch (e) {
    return { error: `Couldn’t send: ${e instanceof Error ? e.message : 'email failed'}` }
  }

  // Remember the address we sent to (fills employee_email if it was blank).
  await supabase.from('employment_agreements').update({ employee_email: email }).eq('id', input.agreementId)
  revalidatePath(`/portal/agreements/${input.agreementId}`)
  return { ok: true }
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
