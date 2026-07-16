// Bare print view of an employment/contractor agreement — the render
// target for the PDF route (src/app/api/agreements/[id]/pdf). Portal chrome
// is print:hidden, so the PDF captures just the document.

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { EmploymentAgreementDocument, agreementViewFromRow } from '@/components/EmploymentAgreementDocument'

export const dynamic = 'force-dynamic'

export default async function AgreementPrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const { data: a } = await supabase.from('employment_agreements').select('*').eq('id', params.id).maybeSingle()
  if (!a) notFound()

  return <EmploymentAgreementDocument a={agreementViewFromRow(a)} wrapper="print-overlay" />
}
