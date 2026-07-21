// Contractor pay statement (allowed-hours model, 2026-06).
//
// Thin page: loads the contractor's pay data (shared loader, RLS-scoped
// to the signed-in contractor) and renders the shared view. The same
// loader + view back the staff "Preview as contractor" tool, so the two
// can never drift.

import Link from 'next/link'
import { FileText } from 'lucide-react'
import { getContractor } from '../_lib/get-contractor'
import { loadContractorPayStatement } from '../_lib/contractor-pay-data'
import { ContractorPayView } from '../_views/ContractorPayView'

export const dynamic = 'force-dynamic'

export default async function ContractorPayrollPage() {
  const { contractor } = await getContractor()
  const data = await loadContractorPayStatement(contractor.id)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-10">
      <Link href="/contractor/statements" className="inline-flex items-center gap-2 text-sm text-sage-600 hover:text-sage-800 mb-4">
        <FileText size={15} /> View your payment statements
      </Link>
      <ContractorPayView data={data} />
    </div>
  )
}
