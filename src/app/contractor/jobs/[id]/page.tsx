import { getContractor } from '../../_lib/get-contractor'
import { redirect } from 'next/navigation'
import { loadContractorJobDetail } from '../../_lib/contractor-job-detail-data'
import { ContractorJobDetailView } from '../../_views/ContractorJobDetailView'

export default async function ContractorJobDetailPage({ params }: { params: { id: string } }) {
  const { supabase, contractor } = await getContractor()

  const job = await loadContractorJobDetail(supabase, contractor.id, params.id, contractor.hourly_rate ?? 0)

  // Job doesn't exist or doesn't belong to this contractor → back to list
  if (!job) redirect('/contractor/jobs')

  return <ContractorJobDetailView job={job} backHref="/contractor/jobs" />
}
