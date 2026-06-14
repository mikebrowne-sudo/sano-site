// Presentational body of the contractor "My Jobs" screen.
//
// Shared by the live contractor page and the staff "Preview as
// contractor" tool so the two can never drift. Pure + server-safe:
// takes the job rows + a `jobHref` builder (the live app links to the
// real job route; the preview links to its own ?tab=job&job= URL).

import Link from 'next/link'
import { Briefcase, MapPin, Calendar, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { contractorJobTitle } from '../_lib/job-title'

const STATUS_STYLES: Record<string, string> = {
  draft:       'bg-gray-100 text-gray-700',
  assigned:    'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed:   'bg-emerald-50 text-emerald-700',
  invoiced:    'bg-purple-50 text-purple-700',
}

export interface ContractorJobRow {
  id: string
  job_number: string
  title: string | null
  address: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  duration_estimate: string | null
  status: string
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })
}

type Bucket = 'today' | 'upcoming' | 'hidden'
// Contractors see only current, assigned work on My Jobs: no drafts,
// no undated jobs, no past/overdue. Just Today and (dated) Upcoming.
function bucketFor(scheduledDate: string | null, status: string, todayIso: string): Bucket {
  if (status === 'draft') return 'hidden'
  if (!scheduledDate) return 'hidden'
  if (scheduledDate === todayIso) return 'today'
  if (scheduledDate > todayIso) return 'upcoming'
  return 'hidden' // past / overdue
}

export function ContractorJobsView({
  jobs,
  jobHref,
  todayIso = new Date().toISOString().slice(0, 10),
}: {
  jobs: ContractorJobRow[]
  jobHref: (id: string) => string
  todayIso?: string
}) {
  const today: ContractorJobRow[] = []
  const upcoming: ContractorJobRow[] = []
  for (const j of jobs) {
    const b = bucketFor(j.scheduled_date, j.status, todayIso)
    if (b === 'today') today.push(j)
    else if (b === 'upcoming') upcoming.push(j)
  }
  const hasVisible = today.length + upcoming.length > 0

  return (
    <div>
      <h1 className="text-xl font-bold text-sage-800 mb-6">My Jobs</h1>

      {!hasVisible ? (
        <div className="bg-white rounded-2xl border border-sage-100 p-10 text-center">
          <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-sage-50 mb-3">
            <Briefcase size={22} className="text-sage-400" />
          </div>
          <p className="text-sage-800 font-medium mb-1">No jobs yet</p>
          <p className="text-sage-500 text-sm">When Sano assigns you a job, it&apos;ll show up here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {today.length > 0 && (
            <Group label="Today" tone="urgent">
              {today.map((j) => <JobCard key={j.id} job={j} href={jobHref(j.id)} highlight="today" />)}
            </Group>
          )}
          {upcoming.length > 0 && (
            <Group label="Upcoming">
              {upcoming.map((j) => <JobCard key={j.id} job={j} href={jobHref(j.id)} />)}
            </Group>
          )}
        </div>
      )}
    </div>
  )
}

function Group({ label, tone, children }: { label: string; tone?: 'urgent' | 'warn'; children: React.ReactNode }) {
  return (
    <section>
      <h2 className={clsx(
        'text-[11px] font-semibold uppercase tracking-wider mb-2 px-1',
        tone === 'urgent' ? 'text-emerald-700'
        : tone === 'warn' ? 'text-amber-700'
        : 'text-sage-500',
      )}>
        {label}
      </h2>
      <div className="space-y-2.5">{children}</div>
    </section>
  )
}

function JobCard({ job, href, highlight }: { job: ContractorJobRow; href: string; highlight?: 'today' | 'overdue' }) {
  const cleanTitle = contractorJobTitle(job.title)
  return (
    <Link
      href={href}
      className={clsx(
        'block bg-white rounded-2xl border p-4 transition-colors active:bg-sage-50 hover:border-sage-300',
        highlight === 'today'   ? 'border-emerald-200 ring-1 ring-emerald-100'
        : highlight === 'overdue' ? 'border-amber-200 ring-1 ring-amber-100'
        : 'border-sage-100',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <span className="font-semibold text-sage-800 leading-tight">{job.job_number}</span>
        <span className={clsx('shrink-0 inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize', STATUS_STYLES[job.status] ?? STATUS_STYLES.draft)}>
          {job.status.replace('_', ' ')}
        </span>
      </div>
      {cleanTitle && <p className="text-sage-700 text-sm mb-2 line-clamp-2">{cleanTitle}</p>}
      <div className="space-y-1.5 text-xs text-sage-500">
        <div className="flex items-center gap-3">
          {job.scheduled_date && (
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} />
              {fmtDate(job.scheduled_date)}
              {job.scheduled_time && <span className="ml-0.5">· {job.scheduled_time}</span>}
            </span>
          )}
          <ChevronRight size={14} className="ml-auto text-sage-300" />
        </div>
        {job.address && (
          <div className="flex items-start gap-1.5">
            <MapPin size={12} className="mt-0.5 shrink-0" />
            <span className="leading-snug">{job.address}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
