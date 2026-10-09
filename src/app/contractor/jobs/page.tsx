import { getContractor } from '../_lib/get-contractor'
import { ContractorJobsView, type ContractorJobRow } from '../_views/ContractorJobsView'
import { ContractorJobHistoryView } from '../_views/ContractorJobHistoryView'
import { ContractorJobsTabs } from '../_components/ContractorJobsTabs'
import { loadContractorJobHistory } from '../_lib/contractor-job-history'

export default async function ContractorJobsPage() {
  const { supabase, contractor } = await getContractor()

  // Only select safe fields — no job_price, no internal_notes
  // Jobs I'm on: as the primary cleaner, or on the roster (second cleaner).
  const { data: rosterRows } = await supabase.from('job_workers').select('job_id').eq('contractor_id', contractor.id)
  const rosterJobIds = Array.from(new Set((rosterRows ?? []).map((r) => r.job_id as string)))
  const mine = rosterJobIds.length
    ? `contractor_id.eq.${contractor.id},id.in.(${rosterJobIds.join(',')})`
    : `contractor_id.eq.${contractor.id}`

  const [{ data: jobs }, history] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, job_number, title, address, scheduled_date, scheduled_time, duration_estimate, status')
      .or(mine)
      // Archived / test jobs are gone for staff, so they must be gone here too —
      // otherwise a contractor can keep working (and completing) a job nobody
      // in the office can see or invoice. Mirrors the staff preview.
      .is('deleted_at', null)
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
