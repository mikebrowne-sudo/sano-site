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
import { parseCoverAmount } from '@/lib/parse-cover-amount'
import { seedAndAutoCompleteOnboardingOnSign, completeUploadedItems } from '@/lib/onboarding-sign'
import { validateUploadFile } from '@/lib/upload-validation'
import { AGREEMENT_DOC_TYPE_VALUES } from '@/lib/agreement-documents'
import { deriveInitialTaxReview } from '@/lib/tax-review'

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
  businessStructure?: string
  legalName?: string
  nzbn?: string
  companyNumber?: string
  gstRegistered?: boolean
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
      business_structure: input.businessStructure || null,
      nzbn: input.nzbn?.trim() || null,
      ird_number: input.irdNumber?.trim() || null,
      gst_number: input.gstNumber?.trim() || null,
      gst_registered: input.gstRegistered ?? !!input.gstNumber?.trim(),
      bank_account_name: input.bankAccountName?.trim() || null,
      bank_account_number: input.bankAccount?.trim() || null,
      insurance_provider: input.insurerName?.trim() || null,
      insurance_liability_cover: parseCoverAmount(input.insuranceCover),
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
      // Derive the initial tax-review state ONLY when none is set yet, so a
      // re-sign never overwrites an existing staff tax decision.
      const { data: taxCur } = await svc.from('contractors').select('tax_review_status').eq('id', contractorId).maybeSingle()
      const derivedTax = deriveInitialTaxReview(input.businessStructure)
      const taxInit = ((taxCur as { tax_review_status?: string | null } | null)?.tax_review_status == null)
        ? { tax_review_status: derivedTax.status, ir330c_requested: derivedTax.ir330cRequested }
        : {}

      // Extended fields depend on the 2026-07-04 / Phase-4 migrations. Best-effort
      // so a not-yet-applied migration can never block a signature.
      const { error: extErr } = await svc.from('contractors').update({
        preferred_name: input.preferredName?.trim() || null,
        address: input.address?.trim() || null,
        date_of_birth: input.dateOfBirth || null,
        emergency_contact_name: input.emergencyName?.trim() || null,
        emergency_contact_phone: input.emergencyPhone?.trim() || null,
        emergency_contact_relationship: input.emergencyRelationship?.trim() || null,
        legal_name: input.legalName?.trim() || null,
        company_number: input.companyNumber?.trim() || null,
        ...taxInit,
        agreement_id: agreement.id,
      }).eq('id', contractorId)
      if (extErr) console.error('[agreement] extended contractor fields not saved (run migration?):', extErr.message)

      // Phase 2 — seed the onboarding checklist and auto-complete only the
      // objectively-satisfied items (confirm_details, bank_details,
      // contract_signed). Idempotent + best-effort: a checklist hiccup must
      // never fail a signature that is already saved.
      try {
        const { data: rtwRow } = await svc
          .from('contractors')
          .select('right_to_work_required')
          .eq('id', contractorId)
          .maybeSingle()
        await seedAndAutoCompleteOnboardingOnSign(svc, {
          contractorId,
          agreementId: agreement.id,
          rightToWorkRequired: !!(rtwRow as { right_to_work_required?: boolean } | null)?.right_to_work_required,
        })
      } catch (e) {
        console.error('[agreement] onboarding checklist auto-complete failed:', e instanceof Error ? e.message : e)
      }

      // Phase 3 — attach documents uploaded during signing to the contractor
      // and complete the matching *_uploaded checklist items (never *_verified).
      try {
        await svc.from('worker_documents')
          .update({ contractor_id: contractorId })
          .eq('agreement_id', agreement.id)
          .is('contractor_id', null)
        const { data: docs } = await svc.from('worker_documents')
          .select('document_type')
          .eq('agreement_id', agreement.id)
        const docTypes = ((docs ?? []) as { document_type: string }[]).map((d) => d.document_type)
        if (docTypes.length > 0) {
          await completeUploadedItems(svc, { contractorId, docTypes })
        }
      } catch (e) {
        console.error('[agreement] document attach/complete failed:', e instanceof Error ? e.message : e)
      }
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

// ── Phase 3 — contractor-facing document uploads on the sign flow ──────
//
// Token-keyed (service-role). A signer can upload before their contractor
// record exists; the document carries agreement_id until signing backfills
// contractor_id. Contractors never get a staff document surface — only the
// upload/remove of their own pre-sign files.

const AGREEMENT_DOC_BUCKET = 'worker-documents'

export async function uploadAgreementDocument(formData: FormData): Promise<
  { ok: true; id: string; documentType: string; title: string; fileName: string } | { error: string }
> {
  const token = String(formData.get('token') || '')
  const documentType = String(formData.get('documentType') || '')
  const file = formData.get('file') as File | null
  if (!token || !file) return { error: 'Please choose a file.' }
  if (!AGREEMENT_DOC_TYPE_VALUES.includes(documentType)) return { error: 'Unknown document type.' }

  const valid = validateUploadFile({ name: file.name, type: file.type, size: file.size })
  if (!valid.ok) return { error: valid.error }

  const svc = getServiceSupabase()
  const { data: agreement } = await svc
    .from('employment_agreements')
    .select('id, status, agreement_type, contractor_id')
    .eq('token', token)
    .maybeSingle()
  if (!agreement) return { error: 'Invalid link.' }
  if (agreement.agreement_type !== 'contractor') return { error: 'Document uploads are for contractor agreements.' }
  if (agreement.status === 'signed') return { error: 'This agreement is already signed.' }

  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const filePath = `agreements/${agreement.id}/${documentType}-${Date.now()}.${ext}`

  const { error: upErr } = await svc.storage
    .from(AGREEMENT_DOC_BUCKET)
    .upload(filePath, file, { contentType: file.type || undefined, upsert: false })
  if (upErr) return { error: `Upload failed: ${upErr.message}` }

  const { data: inserted, error: dbErr } = await svc
    .from('worker_documents')
    .insert({
      // Stay unattached until signing backfills contractor_id — keeps pre-sign
      // remove working uniformly (incl. pre-linked agreements).
      contractor_id: null,
      agreement_id: agreement.id,
      document_type: documentType,
      title: file.name,
      file_path: filePath,
      file_size: file.size,
    })
    .select('id')
    .single()
  if (dbErr || !inserted) {
    await svc.storage.from(AGREEMENT_DOC_BUCKET).remove([filePath]) // don't orphan the object
    return { error: `Couldn’t save the document: ${dbErr?.message ?? 'unknown error'}` }
  }

  return { ok: true, id: inserted.id as string, documentType, title: file.name, fileName: file.name }
}

export async function deleteAgreementDocument(
  input: { token: string; documentId: string },
): Promise<{ ok: true } | { error: string }> {
  const { token, documentId } = input
  if (!token || !documentId) return { error: 'Missing details.' }

  const svc = getServiceSupabase()
  const { data: agreement } = await svc
    .from('employment_agreements')
    .select('id, status')
    .eq('token', token)
    .maybeSingle()
  if (!agreement) return { error: 'Invalid link.' }
  if (agreement.status === 'signed') return { error: 'This agreement is already signed.' }

  const { data: doc } = await svc
    .from('worker_documents')
    .select('id, file_path, agreement_id, contractor_id')
    .eq('id', documentId)
    .maybeSingle()
  if (!doc || doc.agreement_id !== agreement.id) return { error: 'Document not found.' }
  // Only a pre-finalise upload (not yet attached to a contractor) is removable here.
  if (doc.contractor_id) return { error: 'This document can no longer be removed here.' }

  if (doc.file_path) await svc.storage.from(AGREEMENT_DOC_BUCKET).remove([doc.file_path as string])
  await svc.from('worker_documents').delete().eq('id', documentId)
  return { ok: true }
}
