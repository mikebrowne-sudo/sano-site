'use server'

// Public (token-keyed) agreement signing. Captures the full onboarding details
// and, on signing, pushes them into the workforce area: a contractor agreement
// upserts a contractors record (by email); an employee agreement creates an
// employees record. Uses the service-role client (token-keyed, like /share/*).

import { getServiceSupabase } from '@/lib/supabase-service'
import { revalidatePath } from 'next/cache'
import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { sendAgreementSignedEmail } from '@/lib/resend'

export interface SignAgreementInput {
  token: string
  fullName: string
  preferredName?: string
  phone?: string
  email?: string
  address: string
  dateOfBirth?: string
  irdNumber: string
  taxCode: string
  bankAccountName?: string
  bankAccount: string
  kiwisaverChoice: string // 'opt_out' | 'stay_in'
  emergencyName?: string
  emergencyPhone?: string
  emergencyRelationship?: string
  // Contractor-only:
  tradingName?: string
  gstNumber?: string
  insurerName?: string
  insuranceCover?: string
  insuranceExpiry?: string
  signedName: string
}

export async function signEmploymentAgreement(input: SignAgreementInput): Promise<{ ok?: true; error?: string }> {
  if (!input.token) return { error: 'Invalid link.' }
  if (!input.fullName?.trim()) return { error: 'Your full name is required.' }
  if (!input.signedName?.trim()) return { error: 'Type your name to sign.' }
  if (input.signedName.trim().toLowerCase() !== input.fullName.trim().toLowerCase()) {
    return { error: 'The signature must match your full legal name above.' }
  }

  const svc = getServiceSupabase()
  const { data: agreement } = await svc
    .from('employment_agreements')
    .select('id, status, agreement_type, position, hourly_rate, start_date, contractor_id, employee_id, is_test')
    .eq('token', input.token)
    .maybeSingle()
  if (!agreement) return { error: 'Agreement not found.' }
  if (agreement.status === 'signed') return { error: 'This agreement has already been signed.' }

  const isContractor = agreement.agreement_type === 'contractor'
  const name = input.fullName.trim()
  const email = input.email?.trim() || null

  const { error: updErr } = await svc
    .from('employment_agreements')
    .update({
      employee_full_name: name,
      preferred_name: input.preferredName?.trim() || null,
      employee_phone: input.phone?.trim() || null,
      employee_email: email,
      employee_address: input.address?.trim() || null,
      date_of_birth: input.dateOfBirth || null,
      employee_ird_number: input.irdNumber?.trim() || null,
      tax_code: input.taxCode?.trim() || 'M',
      bank_account_name: input.bankAccountName?.trim() || null,
      employee_bank_account: input.bankAccount?.trim() || null,
      kiwisaver_choice: input.kiwisaverChoice === 'stay_in' ? 'stay_in' : 'opt_out',
      emergency_contact_name: input.emergencyName?.trim() || null,
      emergency_contact_phone: input.emergencyPhone?.trim() || null,
      emergency_contact_relationship: input.emergencyRelationship?.trim() || null,
      contractor_trading_name: input.tradingName?.trim() || null,
      contractor_gst_number: input.gstNumber?.trim() || null,
      insurer_name: input.insurerName?.trim() || null,
      insurance_cover: input.insuranceCover?.trim() || null,
      insurance_expiry: input.insuranceExpiry || null,
      signed_name: input.signedName.trim(),
      signed_at: new Date().toISOString(),
      status: 'signed',
    })
    .eq('id', agreement.id)
  if (updErr) return { error: `Couldn’t save your signature: ${updErr.message}` }

  const isTest = !!agreement.is_test

  // Push into the workforce area. If the agreement was pre-linked to an
  // existing person at creation, update THAT record (no duplicate); else
  // match a contractor by email, else create. Skipped entirely for a test
  // run so a dry-run never creates or touches a real contractor/employee.
  const today = new Date().toISOString().slice(0, 10)
  if (isTest) {
    // no-op — test runs don't touch the workforce area
  } else if (isContractor) {
    // Core fields — columns that already exist on contractors; must succeed.
    const core = {
      full_name: name,
      email,
      phone: input.phone?.trim() || null,
      company_name: input.tradingName?.trim() || null,
      ird_number: input.irdNumber?.trim() || null,
      gst_number: input.gstNumber?.trim() || null,
      gst_registered: !!input.gstNumber?.trim(),
      bank_account_name: input.bankAccountName?.trim() || null,
      bank_account_number: input.bankAccount?.trim() || null,
      insurance_provider: input.insurerName?.trim() || null,
      insurance_expiry: input.insuranceExpiry || null,
      worker_type: 'contractor',
      contract_signed_date: today,
      start_date: (agreement.start_date as string | null) || null,
    }
    let contractorId: string | null = (agreement.contractor_id as string | null) ?? null
    if (!contractorId && email) {
      contractorId = ((await svc.from('contractors').select('id').ilike('email', email).maybeSingle()).data?.id as string | null) ?? null
    }
    if (contractorId) {
      await svc.from('contractors').update(core).eq('id', contractorId)
    } else {
      const { data: created } = await svc.from('contractors').insert(core).select('id').single()
      contractorId = (created?.id as string | null) ?? null
    }
    if (contractorId) {
      await svc.from('employment_agreements').update({ contractor_id: contractorId }).eq('id', agreement.id)
      // Extended fields depend on the 2026-07-04 migration. Best-effort so a
      // not-yet-applied migration can never block a signature.
      const { error: extErr } = await svc.from('contractors').update({
        preferred_name: input.preferredName?.trim() || null,
        address: input.address?.trim() || null,
        date_of_birth: input.dateOfBirth || null,
        emergency_contact_name: input.emergencyName?.trim() || null,
        emergency_contact_phone: input.emergencyPhone?.trim() || null,
        emergency_contact_relationship: input.emergencyRelationship?.trim() || null,
        agreement_id: agreement.id,
      }).eq('id', contractorId)
      if (extErr) console.error('[agreement] extended contractor fields not saved (run 2026-07-04 migration?):', extErr.message)
    }
  } else {
    const empFields = {
      full_name: name,
      preferred_name: input.preferredName?.trim() || null,
      phone: input.phone?.trim() || null,
      email,
      address: input.address?.trim() || null,
      date_of_birth: input.dateOfBirth || null,
      start_date: (agreement.start_date as string | null) || null,
      position: (agreement.position as string | null) || null,
      hourly_rate: agreement.hourly_rate,
      ird_number: input.irdNumber?.trim() || null,
      tax_code: input.taxCode?.trim() || 'M',
      kiwisaver_opt_out: input.kiwisaverChoice !== 'stay_in',
      bank_account_name: input.bankAccountName?.trim() || null,
      bank_account_number: input.bankAccount?.trim() || null,
      emergency_contact_name: input.emergencyName?.trim() || null,
      emergency_contact_phone: input.emergencyPhone?.trim() || null,
      emergency_contact_relationship: input.emergencyRelationship?.trim() || null,
      agreement_id: agreement.id,
    }
    let employeeId: string | null = (agreement.employee_id as string | null) ?? null
    if (employeeId) {
      await svc.from('employees').update(empFields).eq('id', employeeId)
    } else {
      const { data: emp } = await svc.from('employees').insert(empFields).select('id').single()
      employeeId = (emp?.id as string | null) ?? null
    }
    if (employeeId) await svc.from('employment_agreements').update({ employee_id: employeeId }).eq('id', agreement.id)
  }

  // Confirmation email with the signed PDF attached. Fail-soft: the signature
  // is already saved, so a mail/PDF hiccup must never fail the signing.
  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sano.nz'
    const pdfBuffer = await renderPdfFromUrl(`${origin}/agreement/${input.token}/print`)
    const stem = sanitizePdfFilename(`Sano Agreement - ${name}`)
    await sendAgreementSignedEmail({
      personName: name,
      agreementType: isContractor ? 'contractor' : 'casual_employee',
      signerEmail: email,
      portalUrl: `${origin}/portal/agreements/${agreement.id}`,
      pdf: { filename: `${stem}.pdf`, content: pdfBuffer },
      isTest,
    })
  } catch (e) {
    console.error('[agreement] confirmation email/PDF failed:', e instanceof Error ? e.message : e)
  }

  revalidatePath('/portal/agreements')
  revalidatePath('/portal/employees')
  revalidatePath('/portal/contractors')
  return { ok: true }
}
