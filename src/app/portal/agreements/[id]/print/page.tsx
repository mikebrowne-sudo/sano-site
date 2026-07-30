// Bare print view of an employment/contractor agreement — the render
// target for the PDF route (src/app/api/agreements/[id]/pdf). Portal chrome
// is print:hidden, so the PDF captures just the document.

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { EmploymentAgreementDocument, agreementViewFromRow } from '@/components/EmploymentAgreementDocument'
import { liveDraftAgreementView } from '@/lib/agreement-schedule-snapshot'

export const dynamic = 'force-dynamic'

export default async function AgreementPrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const { data: a } = await supabase.from('employment_agreements').select('*').eq('id', params.id).maybeSingle()
  if (!a) notFound()

  // Draft parity: an unsigned contractor draft renders the SAME live schedules +
  // insurance as the on-screen preview (shared helper), so the downloaded PDF
  // matches. Once a snapshot is frozen (sent/signed) the frozen values win.
  const view = agreementViewFromRow(a)
  const live = await liveDraftAgreementView(supabase, a)
  if (live.scheduleBlocks) view.scheduleBlocks = live.scheduleBlocks
  if (live.insuranceArrangement !== undefined && !a.service_schedules_snapshot) view.insuranceArrangement = live.insuranceArrangement

  return <EmploymentAgreementDocument a={view} wrapper="print-overlay" />
}
