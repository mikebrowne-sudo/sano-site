import { getContractor } from '../_lib/get-contractor'
import Link from 'next/link'
import { Briefcase, MapPin, Calendar, ChevronRight } from 'lucide-react'
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
  return new Date(iso).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// Phase 5.5.4 — categorise jobs into Today / Upcoming / Earlier so the
// most urgent work stays at the top on a phone screen. "Overdue" =
// scheduled in the past and not yet completed/invoiced.
type Bucket = 'today' | 'overdue' | 'upcoming' | 'past'
function bucketFor(scheduledDate: string | null, status: string): Bucket {
  if (!scheduledDate) return 'upcoming'
  const today = todayISO()
  if (status === 'completed' || status === 'invoiced') return 'past'
  if (scheduledDate === today) return 'today'
  if (scheduledDate < today) return 'overdue'
  return 'upcoming'
}

export default async function ContractorJobsPage() {
  const { supabase, contractor } = await getContractor()

  // Only select safe fields — no job_price, no internal_notes
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, job_number, title, address, scheduled_date, scheduled_time, duration_estimate, status')
    .eq('contractor_id', contractor.id)
    .order('scheduled_date', { ascending: true, nullsFirst: false })

  const rows = jobs ?? []

  const today: typeof rows    = []
  const overdue: typeof rows  = []
  const upcoming: typeof rows = []
  const past: typeof rows     = []
  for (const j of rows) {
    const b = bucketFor(j.scheduled_date, j.status)
    if (b === 'today')         today.push(j)
    else if (b === 'overdue')  overdue.push(j)
    else if (b === 'upcoming') upcoming.push(j)
    else                       past.push(j)
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-sage-800 mb-6">My Jobs</h1>

      {rows.length === 0 ? (
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
              {today.map((j) => <JobCard key={j.id} job={j} highlight="today" />)}
            </Group>
          )}
          {overdue.length > 0 && (
            <Group label="Overdue" tone="warn">
              {overdue.map((j) => <JobCard key={j.id} job={j} highlight="overdue" />)}
            </Group>
          )}
          {upcoming.length > 0 && (
            <Group label="Upcoming">
              {upcoming.map((j) => <JobCard key={j.id} job={j} />)}
            </Group>
          )}
          {past.length > 0 && (
            <Group label="Earlier">
              {past.map((j) => <JobCard key={j.id} job={j} />)}
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

type Job = {
  id: string
  job_number: string
  title: string | null
  address: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  duration_estimate: string | null
  status: string
}

function JobCard({ job, highlight }: { job: Job; highlight?: 'today' | 'overdue' }) {
  return (
    <Link
      href={`/contractor/jobs/${job.id}`}
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
      {job.title && <p className="text-sage-700 text-sm mb-2 line-clamp-2">{job.title}</p>}
      <div className="flex items-center gap-3 text-xs text-sage-500 flex-wrap">
        {job.scheduled_date && (
          <span className="inline-flex items-center gap-1">
            <Calendar size={12} />
            {fmtDate(job.scheduled_date)}
            {job.scheduled_time && <span className="ml-0.5">· {job.scheduled_time}</span>}
          </span>
        )}
        {job.address && (
          <span className="inline-flex items-center gap-1 truncate max-w-[60%]">
            <MapPin size={12} />
            <span className="truncate">{job.address}</span>
          </span>
        )}
        <ChevronRight size={14} className="ml-auto text-sage-300" />
      </div>
    </Link>
  )
}
