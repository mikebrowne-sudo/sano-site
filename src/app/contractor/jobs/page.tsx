import { getContractor } from '../_lib/get-contractor'
import { ContractorJobsView, type ContractorJobRow } from '../_views/ContractorJobsView'
import { ContractorJobHistoryView } from '../_views/ContractorJobHistoryView'
import { ContractorJobsTabs } from '../_components/ContractorJobsTabs'
import { loadContractorJobHistory } from '../_lib/contractor-job-history'

export default async function ContractorJobsPage() {
  const { supabase, contractor } = await getContractor()

  // Only select safe fields — no job_price, no internal_notes
  const [{ data: jobs }, history] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, job_number, title, address, scheduled_date, scheduled_time, duration_estimate, status')
      .eq('contractor_id', contractor.id)
      .order('scheduled_date', { ascending: true, nullsFirst: false }),
    loadContractorJobHistory(contractor.id),
  ])

  const completedCount = history.reduce((n, m) => n + m.entries.length, 0)

  return (
    <div>
      <h1 className="text-xl font-bold text-sage-800 mb-5">My Jobs</h1>
      <ContractorJobsTabs
        completedCount={completedCount}
        toDo={
          <ContractorJobsView
            jobs={(jobs ?? []) as ContractorJobRow[]}
            jobHref={(id) => `/contractor/jobs/${id}`}
            showHeading={false}
          />
        }
        completed={
          <ContractorJobHistoryView months={history} jobHref={(id) => `/contractor/jobs/${id}`} />
        }
      />
    </div>
  )
}
