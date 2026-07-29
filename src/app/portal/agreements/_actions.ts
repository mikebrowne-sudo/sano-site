'use server'

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { sendAgreementLinkEmail } from '@/lib/resend'
import { buildAgreementScheduleSnapshot } from '@/lib/agreement-schedule-snapshot'

export async function createEmploymentAgreement(input: {
  agreementType: 'casual_employee' | 'permanent_employee' | 'contractor'
  /** Employee sub-classification: 'casual' | 'part_time' | 'full_time'. Null for contractors. */
  employmentType?: string | null
  personLabel: string
  position: string
  hourlyRate: number | null
  startDate: string | null
  /** Permanent-employee terms (ignored for casual/contractor). */
  agreedHoursPerWeek?: number | null
  /** Working pattern (permanent) OR indicative availability (casual). */
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
      // agreed_days holds the working pattern (permanent) OR indicative
      // availability (casual) — stored for any employee, not contractors.
      agreed_days: !isContractor ? (input.agreedDays?.trim() || null) : null,
      // The remaining terms are permanent-only.
      agreed_hours_per_week: isPermanent ? (input.agreedHoursPerWeek ?? null) : null,
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

  // Employment sub-type (casual/part_time/full_time) — best-effort so a
  // not-yet-applied migration can't block agreement creation.
  if (!isContractor && input.employmentType) {
    const { error: etErr } = await supabase
      .from('employment_agreements')
      .update({ employment_type: input.employmentType })
      .eq('id', data.id)
    if (etErr) console.error('[agreement] employment_type not saved (run migration?):', etErr.message)
  }

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
    .select('id, token, person_label, agreement_type, employee_full_name, contractor_id, status, service_schedules_snapshot, selected_service_schedule_ids')
    .eq('id', input.agreementId)
    .maybeSingle()
  if (!a) return { error: 'Agreement not found.' }
  if (a.status === 'signed') return { error: 'This agreement is already signed.' }

  // Freeze ONLY the staff-selected service schedules onto the agreement at send
  // time so the presented Schedule A/B/… blocks are stable (a later schedule edit
  // supersedes — it must not mutate what was sent; a newly-added schedule must not
  // appear). Contractors only; re-sending re-snapshots (still unsigned). No tax
  // math — display terms only.
  if (a.agreement_type === 'contractor' && a.contractor_id) {
    const selected = (a.selected_service_schedule_ids as string[] | null) ?? []
    const blocks = await buildAgreementScheduleSnapshot(supabase, a.contractor_id as string, selected)
    await supabase
      .from('employment_agreements')
      .update({ service_schedules_snapshot: blocks, service_schedules_snapshot_at: new Date().toISOString() })
      .eq('id', input.agreementId)
  }

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

/**
 * Set which of the contractor's schedules this agreement covers. Only eligible
 * (draft/active) schedules belonging to THIS agreement's contractor may be
 * selected — any other id is rejected. Refused once the agreement is signed
 * (its selection is frozen). Clears any stale snapshot so the next send/preview
 * reflects the new selection.
 */
export async function setAgreementScheduleSelection(
  agreementId: string,
  scheduleIds: string[],
): Promise<{ ok?: true; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const { data: a } = await supabase
    .from('employment_agreements')
    .select('id, agreement_type, contractor_id, status')
    .eq('id', agreementId)
    .maybeSingle()
  if (!a) return { error: 'Agreement not found.' }
  if (a.agreement_type !== 'contractor' || !a.contractor_id) return { error: 'Schedules apply to contractor agreements only.' }
  if (a.status === 'signed') return { error: 'This agreement is signed — its schedules are frozen.' }

  const wanted = Array.from(new Set((scheduleIds ?? []).filter(Boolean)))
  if (wanted.length > 0) {
    // Validate every id belongs to this contractor AND is eligible (draft/active).
    const { data: valid } = await supabase
      .from('contractor_service_schedules')
      .select('id')
      .eq('contractor_id', a.contractor_id as string)
      .in('status', ['draft', 'active'])
      .in('id', wanted)
    const validIds = new Set((valid ?? []).map((r) => r.id as string))
    const bad = wanted.filter((id) => !validIds.has(id))
    if (bad.length > 0) {
      return { error: 'One or more selected schedules are not eligible or belong to another contractor.' }
    }
  }

  // Changing selection invalidates any prior draft snapshot (never a signed one —
  // guarded above).
  const { error } = await supabase
    .from('employment_agreements')
    .update({ selected_service_schedule_ids: wanted, service_schedules_snapshot: null, service_schedules_snapshot_at: null })
    .eq('id', agreementId)
  if (error) return { error: error.message }

  revalidatePath(`/portal/agreements/${agreementId}`)
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
