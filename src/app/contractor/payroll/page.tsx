// Contractor pay statement (allowed-hours model, 2026-06).
//
// Thin page: loads the contractor's pay data (shared loader, RLS-scoped
// to the signed-in contractor) and renders the shared view. The same
// loader + view back the staff "Preview as contractor" tool, so the two
// can never drift.

import { getContractor } from '../_lib/get-contractor'
import { loadContractorPayStatement } from '../_lib/contractor-pay-data'
import { ContractorPayView } from '../_views/ContractorPayView'

export const dynamic = 'force-dynamic'

export default async function ContractorPayrollPage() {
  const { supabase, contractor } = await getContractor()
  const data = await loadContractorPayStatement(supabase, contractor.id, contractor.hourly_rate ?? 0)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-10">
      <ContractorPayView data={data} />
    </div>
  )
}
