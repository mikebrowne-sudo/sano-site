import { getContractor } from '../_lib/get-contractor'
import Link from 'next/link'
import { Briefcase } from 'lucide-react'
import clsx from 'clsx'

const STATUS_STYLES: Record<string, string> = {
  draft:       'bg-gray-100 text-gray-700',
  assigned:    'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed:   'bg-emerald-50 text-emerald-700',
  invoiced:    'bg-purple-50 text-purple-700',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ContractorJobsPage() {
  const { supabase, contractor } = await getContractor()

  // Only select safe fields — no job_price, no internal_notes.
  // Phase D.3 — also exclude archived jobs so contractors never see
  // jobs that have been soft-deleted by staff.
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, job_number, title, address, scheduled_date, scheduled_time, duration_estimate, status')
    .eq('contractor_id', contractor.id)
    .is('deleted_at', null)
    .order('scheduled_date', { ascending: true, nullsFirst: false })

  const rows = jobs ?? []

  return (
    <div>
      <h1 className="text-xl font-bold text-sage-800 mb-6">My Jobs</h1>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-sage-100 p-10 text-center">
          <Briefcase size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm">No jobs assigned to you yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((job) => (
            <Link
              key={job.id}
              href={`/contractor/jobs/${job.id}`}
              className="block bg-white rounded-xl border border-sage-100 p-4 hover:border-sage-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sage-800">{job.job_number}</span>
                <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_STYLES[job.status] ?? STATUS_STYLES.draft)}>
                  {job.status.replace('_', ' ')}
                </span>
              </div>
              {job.title && <p className="text-sage-700 text-sm mb-1">{job.title}</p>}
              {job.address && <p className="text-sage-500 text-sm mb-2">{job.address}</p>}
              <div className="flex items-center gap-4 text-xs text-sage-500">
                <span>{fmtDate(job.scheduled_date)}</span>
                {job.scheduled_time && <span>{job.scheduled_time}</span>}
                {job.duration_estimate && <span>{job.duration_estimate}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
