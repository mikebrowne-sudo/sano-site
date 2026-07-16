// Public (token-keyed) employment-agreement page — the employee reads the
// agreement, fills their details, and e-signs. No login (service-role read).

import { notFound } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { getServiceSupabase } from '@/lib/supabase-service'
import { EmploymentAgreementDocument, agreementViewFromRow } from '@/components/EmploymentAgreementDocument'
import { SignAgreementForm } from './_components/SignAgreementForm'

export const dynamic = 'force-dynamic'

export default async function PublicAgreementPage({ params }: { params: { token: string } }) {
  const svc = getServiceSupabase()
  const { data: a } = await svc.from('employment_agreements').select('*').eq('token', params.token).maybeSingle()
  if (!a) notFound()
  const signed = a.status === 'signed'
  const isContractor = a.agreement_type === 'contractor'

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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-7">
            <SignAgreementForm token={params.token} type={isContractor ? 'contractor' : 'casual_employee'} initialDocs={initialDocs} agreement={view} />
          </div>
        )}
      </div>
    </div>
  )
}
