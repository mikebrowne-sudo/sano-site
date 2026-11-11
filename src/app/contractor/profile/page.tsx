// Contractor profile page — thin wrapper over the shared profile view
// (also used by the staff "Preview as contractor" tool).

import { getContractor } from '../_lib/get-contractor'
import { loadContractorProfile } from '../_lib/contractor-profile-data'
import { ContractorProfileView } from '../_views/ContractorProfileView'
import { getServiceSupabase } from '@/lib/supabase-service'

export default async function ContractorProfilePage() {
  // Identity comes from the signed-in session; the service client is then
  // scoped to that id only (documents aren't contractor-readable via RLS).
  const { contractor } = await getContractor()
  const data = await loadContractorProfile(getServiceSupabase(), contractor.id as string)

  return (
    <ContractorProfileView
      contractor={
        data ?? {
          full_name: contractor.full_name as string,
          emergency: { name: '', phone: '', relationship: '' },
          docSlots: [],
          missing: [],
        }
      }
    />
  )
}
