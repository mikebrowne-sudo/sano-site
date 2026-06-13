// Contractor profile page — thin wrapper over the shared profile view
// (also used by the staff "Preview as contractor" tool).

import { getContractor } from '../_lib/get-contractor'
import { ContractorProfileView } from '../_views/ContractorProfileView'

export default async function ContractorProfilePage() {
  const { supabase, contractor } = await getContractor()

  const { data: full } = await supabase
    .from('contractors')
    .select('id, full_name, email, phone, status, worker_type')
    .eq('id', contractor.id)
    .single()

  const c = full ?? contractor

  return (
    <ContractorProfileView
      contractor={{
        full_name: c.full_name,
        email: (c as { email?: string | null }).email ?? null,
        phone: (c as { phone?: string | null }).phone ?? null,
        worker_type: (c as { worker_type?: string | null }).worker_type ?? null,
      }}
    />
  )
}
