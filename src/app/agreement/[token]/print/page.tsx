// Public, token-keyed print view of a signed agreement — the render target
// for the PDF attached to the confirmation email. The token IS the auth
// (same model as /share/*); no portal chrome (root layout only).

import { notFound } from 'next/navigation'
import { getServiceSupabase } from '@/lib/supabase-service'
import { EmploymentAgreementDocument, agreementViewFromRow } from '@/components/EmploymentAgreementDocument'

export const dynamic = 'force-dynamic'

export default async function AgreementTokenPrintPage({ params }: { params: { token: string } }) {
  const svc = getServiceSupabase()
  const { data: a } = await svc.from('employment_agreements').select('*').eq('token', params.token).maybeSingle()
  if (!a) notFound()

  return <EmploymentAgreementDocument a={agreementViewFromRow(a)} wrapper="print-overlay" />
}
