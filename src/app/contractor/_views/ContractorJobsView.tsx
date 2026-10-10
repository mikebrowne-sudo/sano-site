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

type Bucket = 'today' | 'confirm' | 'outstanding' | 'upcoming' | 'later' | 'hidden'

/** How far back a finished job still asks "did it go to plan?" on the list, and
 *  how far ahead counts as "Next two weeks" before the rest folds under "Later". */
const CONFIRM_WINDOW_DAYS = 14
const UPCOMING_WINDOW_DAYS = 14

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Contractors' action list, most pressing first: Today; finished jobs still
// waiting on their hours answer; past-dated jobs not yet marked done; the next
// two weeks; everything after that (folded). Other completed / invoiced jobs
// live in the Completed history tab.
export function bucketFor(
  scheduledDate: string | null,
  status: string,
  todayIso: string,
  needsHours = false,
): Bucket {
  if (status === 'draft') return 'hidden'
  if (status === 'completed' || status === 'invoiced') {
    return needsHours && scheduledDate && scheduledDate >= addDays(todayIso, -CONFIRM_WINDOW_DAYS) ? 'confirm' : 'hidden'
  }
  if (!scheduledDate) return 'hidden'
  if (scheduledDate === todayIso) return 'today'
  if (scheduledDate < todayIso) return 'outstanding' // overdue, still markable
  return scheduledDate <= addDays(todayIso, UPCOMING_WINDOW_DAYS) ? 'upcoming' : 'later'
}

export function ContractorJobsView({
  jobs,
  jobHref,
  showHeading = true,
  unconfirmedJobIds = [],
  // NZ calendar day (UTC is still "yesterday" every NZ morning).
  todayIso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(new Date()),
}: {
  jobs: ContractorJobRow[]
  jobHref: (id: string) => string
  showHeading?: boolean
  /** Jobs where this contractor hasn't yet answered "did it go to plan?". */
  unconfirmedJobIds?: string[]
  todayIso?: string
}) {
  const needsHours = new Set(unconfirmedJobIds)
  const today: ContractorJobRow[] = []
  const confirm: ContractorJobRow[] = []
  const outstanding: ContractorJobRow[] = []
  const upcoming: ContractorJobRow[] = []
  const later: ContractorJobRow[] = []
  for (const j of jobs) {
    const b = bucketFor(j.scheduled_date, j.status, todayIso, needsHours.has(j.id))
    if (b === 'today') today.push(j)
    else if (b === 'confirm') confirm.push(j)
    else if (b === 'outstanding') outstanding.push(j)
    else if (b === 'upcoming') upcoming.push(j)
    else if (b === 'later') later.push(j)
  }
  // Newest first for the look-back lists; the forward lists stay in date order.
  confirm.reverse()
  outstanding.reverse()
  const hasVisible = today.length + confirm.length + outstanding.length + upcoming.length + later.length > 0

  return (
    <div>
      {showHeading && <h1 className="text-xl font-bold text-sage-800 mb-6">My Jobs</h1>}

      {!hasVisible ? (
        <div className="bg-white rounded-2xl border border-sage-100 p-10 text-center">
          <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-sage-50 mb-3">
            <Briefcase size={22} className="text-sage-400" />
          </div>
          <p className="text-sage-800 font-medium mb-1">Nothing to do right now</p>
          <p className="text-sage-500 text-sm">When Sano assigns you a job, it&apos;ll show up here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {today.length > 0 && (
            <Group label="Today" tone="urgent">
              {today.map((j) => <JobCard key={j.id} job={j} href={jobHref(j.id)} highlight="today" />)}
            </Group>
          )}
          {confirm.length > 0 && (
            <Group label="Confirm your hours" tone="urgent" hint="Tap a job and tell us if it went to plan.">
              {confirm.map((j) => <JobCard key={j.id} job={j} href={jobHref(j.id)} highlight="confirm" />)}
            </Group>
          )}
          {outstanding.length > 0 && (
            <Group label="Needs marking done" tone="warn">
              {outstanding.map((j) => <JobCard key={j.id} job={j} href={jobHref(j.id)} highlight="overdue" />)}
            </Group>
          )}
          {upcoming.length > 0 && (
            <Group label="Next two weeks">
              {upcoming.map((j) => <JobCard key={j.id} job={j} href={jobHref(j.id)} />)}
            </Group>
          )}
          {later.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wider text-sage-500 px-1 py-1">
                Later ({later.length}) <span className="normal-case font-normal tracking-normal group-open:hidden">· tap to show</span>
              </summary>
              <div className="space-y-2.5 mt-2">
                {later.map((j) => <JobCard key={j.id} job={j} href={jobHref(j.id)} />)}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

function Group({ label, tone, hint, children }: { label: string; tone?: 'urgent' | 'warn'; hint?: string; children: React.ReactNode }) {
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
      {hint && <p className="text-xs text-sage-500 -mt-1 mb-2 px-1">{hint}</p>}
      <div className="space-y-2.5">{children}</div>
    </section>
  )
}

function JobCard({ job, href, highlight }: { job: ContractorJobRow; href: string; highlight?: 'today' | 'overdue' | 'confirm' }) {
  const cleanTitle = contractorJobTitle(job.title)
  return (
    <Link
      href={href}
      className={clsx(
        'block bg-white rounded-2xl border p-4 transition-colors active:bg-sage-50 hover:border-sage-300',
        highlight === 'today' || highlight === 'confirm' ? 'border-emerald-200 ring-1 ring-emerald-100'
        : highlight === 'overdue' ? 'border-amber-200 ring-1 ring-amber-100'
        : 'border-sage-100',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <span className="font-semibold text-sage-800 leading-tight">{job.job_number}</span>
        {highlight === 'confirm' ? (
          <span className="shrink-0 inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-600 text-white">
            Confirm hours
          </span>
        ) : (
          <span className={clsx('shrink-0 inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize', STATUS_STYLES[job.status] ?? STATUS_STYLES.draft)}>
            {job.status.replace('_', ' ')}
          </span>
        )}
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
