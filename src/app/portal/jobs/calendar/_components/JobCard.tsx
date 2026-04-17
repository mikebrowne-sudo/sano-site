import Link from 'next/link'
import clsx from 'clsx'

const STATUS_STYLES: Record<string, string> = {
  draft:       'bg-gray-100 text-gray-700',
  assigned:    'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed:   'bg-emerald-50 text-emerald-700',
  invoiced:    'bg-purple-50 text-purple-700',
}

interface Job {
  id: string
  job_number: string
  title: string | null
  address: string | null
  scheduled_time: string | null
  duration_estimate: string | null
  status: string
  assigned_to: string | null
  contractor_id: string | null
  recurring_job_id: string | null
}

export function JobCard({ job, today, compact }: { job: Job; today: string; compact?: boolean }) {
  const isUnassigned = !job.contractor_id

  if (compact) {
    return (
      <Link
        href={`/portal/jobs/${job.id}`}
        className={clsx(
          'block rounded-lg p-2 text-xs transition-colors hover:ring-1 hover:ring-sage-300',
          isUnassigned ? 'bg-amber-50/50 border border-amber-100' : 'bg-sage-50',
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="font-medium text-sage-800 truncate">{job.job_number}</span>
          <span className={clsx('shrink-0 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize', STATUS_STYLES[job.status] ?? STATUS_STYLES.draft)}>
            {job.status.replace('_', ' ')}
          </span>
        </div>
        {job.scheduled_time && <p className="text-sage-600 mt-0.5">{job.scheduled_time}</p>}
        {job.title && <p className="text-sage-500 truncate mt-0.5">{job.title}</p>}
        {job.assigned_to && <p className="text-sage-400 truncate mt-0.5">{job.assigned_to}</p>}
        {isUnassigned && <p className="text-amber-600 mt-0.5">Unassigned</p>}
      </Link>
    )
  }

  return (
    <Link
      href={`/portal/jobs/${job.id}`}
      className={clsx(
        'flex items-start gap-4 rounded-xl p-4 transition-colors hover:ring-1 hover:ring-sage-300',
        isUnassigned ? 'bg-amber-50/30 border border-amber-100' : 'bg-sage-50 border border-sage-100',
      )}
    >
      {/* Time column */}
      <div className="w-16 shrink-0 text-sm">
        <p className="font-semibold text-sage-800">{job.scheduled_time ?? '—'}</p>
        {job.duration_estimate && <p className="text-sage-400 text-xs mt-0.5">{job.duration_estimate}</p>}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sage-800 text-sm">{job.job_number}</span>
          <span className={clsx('inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_STYLES[job.status] ?? STATUS_STYLES.draft)}>
            {job.status.replace('_', ' ')}
          </span>
          {job.recurring_job_id && (
            <span className="inline-block px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-500 text-[10px] font-medium">Recurring</span>
          )}
        </div>
        {job.title && <p className="text-sage-700 text-sm truncate">{job.title}</p>}
        {job.address && <p className="text-sage-500 text-xs truncate mt-0.5">{job.address}</p>}
        <p className="text-xs mt-1">
          {job.assigned_to ? (
            <span className="text-sage-500">{job.assigned_to}</span>
          ) : (
            <span className="text-amber-600 font-medium">Unassigned</span>
          )}
        </p>
      </div>
    </Link>
  )
}
