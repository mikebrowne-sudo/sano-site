import { getContractor } from '../_lib/get-contractor'
import { ContractorJobsView, type ContractorJobRow } from '../_views/ContractorJobsView'

export default async function ContractorJobsPage() {
  const { supabase, contractor } = await getContractor()

  // Only select safe fields — no job_price, no internal_notes
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, job_number, title, address, scheduled_date, scheduled_time, duration_estimate, status')
    .eq('contractor_id', contractor.id)
    .order('scheduled_date', { ascending: true, nullsFirst: false })

  return (
    <ContractorJobsView
      jobs={(jobs ?? []) as ContractorJobRow[]}
      jobHref={(id) => `/contractor/jobs/${id}`}
    />
  )
}
