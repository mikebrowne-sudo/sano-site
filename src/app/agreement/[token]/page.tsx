// Public (token-keyed) employment-agreement page — the employee reads the
// agreement, fills their details, and e-signs. No login (service-role read).

import { notFound } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { getServiceSupabase } from '@/lib/supabase-service'
import { EmploymentAgreementDocument, agreementViewFromRow } from '@/components/EmploymentAgreementDocument'
import { ScheduleReviewNote } from './_components/ScheduleReviewNote'
import { SignAgreementForm, type PrefillValues } from './_components/SignAgreementForm'

export const dynamic = 'force-dynamic'

export default async function PublicAgreementPage({ params }: { params: { token: string } }) {
  const svc = getServiceSupabase()
  const { data: a } = await svc.from('employment_agreements').select('*').eq('token', params.token).maybeSingle()
  if (!a) notFound()

  // A voided/pulled agreement can no longer be signed — show a clear notice
  // instead of the signable form (staff will send an updated copy).
  if (a.status === 'voided') {
    return (
      <main className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-sage-800 mb-2">This agreement is no longer available</h1>
        <p className="text-sage-600">This copy has been withdrawn. If you’re expecting an agreement from Sano, an updated version will be sent to you. Please contact us if you have any questions.</p>
      </main>
    )
  }
  const signed = a.status === 'signed'

  // Documents the contractor has already uploaded on this agreement (Phase 3).
  // Degrades to [] if the agreement_id column isn't present yet.
  let initialDocs: { id: string; documentType: string; title: string; fileName: string }[] = []
  if (!signed) {
    const { data: docRows } = await svc
      .from('worker_documents')
      .select('id, document_type, title')
      .eq('agreement_id', a.id)
      .order('uploaded_at', { ascending: true })
    initialDocs = ((docRows ?? []) as { id: string; document_type: string; title: string }[])
      .map((d) => ({ id: d.id, documentType: d.document_type, title: d.title, fileName: d.title }))
  }

  const view = agreementViewFromRow(a)

  // Pre-fill from a linked worker record (or the agreement itself) so anything
  // already captured isn't re-typed. Uses the rich contractors record when the
  // agreement is linked; falls back to the details captured on the agreement.
  let prefill: PrefillValues | undefined
  if (!signed) {
    const cid = a.contractor_id as string | null
    if (cid) {
      const { data: c } = await svc
        .from('contractors')
        .select('full_name, preferred_name, phone, email, address, date_of_birth, ird_number, bank_account_name, bank_account_number, company_name, legal_name, nzbn, company_number, gst_registered, gst_number, business_structure, insurance_provider, insurance_liability_cover, insurance_expiry, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship')
        .eq('id', cid)
        .maybeSingle()
      if (c) {
        const r = c as Record<string, unknown>
        const s = (v: unknown) => (v == null ? undefined : String(v))
        prefill = {
          fullName: s(r.full_name), preferredName: s(r.preferred_name), phone: s(r.phone), email: s(r.email),
          address: s(r.address), dateOfBirth: s(r.date_of_birth), ird: s(r.ird_number),
          bankName: s(r.bank_account_name), bank: s(r.bank_account_number),
          tradingName: s(r.company_name), legalName: s(r.legal_name), nzbn: s(r.nzbn), companyNumber: s(r.company_number),
          gstNumber: s(r.gst_number), businessStructure: s(r.business_structure), gstRegistered: (r.gst_registered as boolean | null) ?? undefined,
          insurerName: s(r.insurance_provider), insuranceCover: s(r.insurance_liability_cover), insuranceExpiry: s(r.insurance_expiry),
          emName: s(r.emergency_contact_name), emPhone: s(r.emergency_contact_phone), emRel: s(r.emergency_contact_relationship),
        }
      }
    } else {
      prefill = {
        fullName: (a.employee_full_name as string | null) ?? undefined,
        email: (a.employee_email as string | null) ?? undefined,
        phone: (a.employee_phone as string | null) ?? undefined,
        address: (a.employee_address as string | null) ?? undefined,
      }
    }
  }

  return (
    <div className="min-h-screen bg-sage-50/40 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {signed ? (
          <>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-5 flex items-center gap-2 text-sm text-emerald-800">
              <CheckCircle2 size={16} className="shrink-0" /> Thanks — your agreement is signed. Keep this page for your records.
            </div>
            <EmploymentAgreementDocument a={view} wrapper="share-page" />
          </>
        ) : (
          <>
            {a.agreement_type === 'contractor' && (view.scheduleBlocks?.length ?? 0) > 0 && (
              <ScheduleReviewNote token={params.token} blocks={view.scheduleBlocks ?? []} />
            )}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-7">
              <SignAgreementForm token={params.token} type={a.agreement_type === 'contractor' ? 'contractor' : a.agreement_type === 'permanent_employee' ? 'permanent_employee' : 'casual_employee'} initialDocs={initialDocs} agreement={view} prefill={prefill} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
