import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { ChevronLeft, ChevronRight, List, Plus } from 'lucide-react'
import { CalendarFilters } from './_components/CalendarFilters'
import { JobCard } from './_components/JobCard'
import clsx from 'clsx'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function getMonday(dateStr: string) {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function getMonthStart(dateStr: string) {
  const d = new Date(dateStr)
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

function addMonths(dateStr: string, months: number) {
  const d = new Date(dateStr)
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function fmtMonthHeader(iso: string) {
  return new Date(iso).toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })
}

function fmtDayHeader(iso: string) {
  return new Date(iso).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// Parse free-text scheduled_time (e.g. "9:00am", "09:00", "2pm") to minutes-from-midnight.
// Unparseable or empty values sort to end-of-day via POSITIVE_INFINITY.
function parseScheduledTime(raw: string | null): number {
  if (!raw) return Number.POSITIVE_INFINITY
  const s = raw.trim().toLowerCase().replace(/\s+/g, '').replace(/\./g, ':')
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/)
  if (!m) return Number.POSITIVE_INFINITY
  let h = parseInt(m[1], 10)
  const mm = m[2] ? parseInt(m[2], 10) : 0
  const ampm = m[3]
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return Number.POSITIVE_INFINITY
  if (ampm === 'pm' && h < 12) h += 12
  if (ampm === 'am' && h === 12) h = 0
  return h * 60 + mm
}

interface Job {
  id: string
  job_number: string
  title: string | null
  address: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  duration_estimate: string | null
  status: string
  assigned_to: string | null
  contractor_id: string | null
  recurring_job_id: string | null
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { view?: string; date?: string; contractor?: string; status?: string }
}) {
  const supabase = createClient()

  const view: 'day' | 'week' | 'month' =
    searchParams.view === 'day' ? 'day' : searchParams.view === 'month' ? 'month' : 'week'
  const today = todayStr()
  const selectedDate = searchParams.date || today
  const contractorFilter = searchParams.contractor ?? ''
  const statusFilter = searchParams.status ?? ''

  // Calculate date range
  let rangeStart: string
  let rangeEnd: string
  let dates: string[]

  if (view === 'day') {
    rangeStart = selectedDate
    rangeEnd = selectedDate
    dates = [selectedDate]
  } else if (view === 'week') {
    rangeStart = getMonday(selectedDate)
    rangeEnd = addDays(rangeStart, 6)
    dates = Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i))
  } else {
    const monthStart = getMonthStart(selectedDate)
    rangeStart = getMonday(monthStart)
    rangeEnd = addDays(rangeStart, 41)
    dates = Array.from({ length: 42 }, (_, i) => addDays(rangeStart, i))
  }

  const selectedMonthKey = getMonthStart(selectedDate).slice(0, 7)

  // Navigation URLs
  const prevDate =
    view === 'day' ? addDays(selectedDate, -1)
    : view === 'week' ? addDays(rangeStart, -7)
    : addMonths(selectedDate, -1)
  const nextDate =
    view === 'day' ? addDays(selectedDate, 1)
    : view === 'week' ? addDays(rangeStart, 7)
    : addMonths(selectedDate, 1)

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    params.set('view', overrides.view ?? view)
    params.set('date', overrides.date ?? selectedDate)
    if (overrides.contractor ?? contractorFilter) params.set('contractor', overrides.contractor ?? contractorFilter)
    if (overrides.status ?? statusFilter) params.set('status', overrides.status ?? statusFilter)
    return `/portal/jobs/calendar?${params.toString()}`
  }

  // Query jobs for range
  let query = supabase
    .from('jobs')
    .select('id, job_number, title, address, scheduled_date, scheduled_time, duration_estimate, status, assigned_to, contractor_id, recurring_job_id')
    .gte('scheduled_date', rangeStart)
    .lte('scheduled_date', rangeEnd)
    .order('created_at', { ascending: true })

  if (contractorFilter) query = query.eq('contractor_id', contractorFilter)
  if (statusFilter === 'unassigned') query = query.is('contractor_id', null)
  else if (statusFilter) query = query.eq('status', statusFilter)

  const [{ data: jobs }, { data: contractors }] = await Promise.all([
    query,
    supabase.from('contractors').select('id, full_name').eq('status', 'active').order('full_name'),
  ])

  const jobsByDate: Record<string, Job[]> = {}
  for (const d of dates) jobsByDate[d] = []
  for (const j of (jobs ?? []) as Job[]) {
    if (j.scheduled_date && jobsByDate[j.scheduled_date]) {
      jobsByDate[j.scheduled_date].push(j)
    }
  }
  // Sort each day's jobs by parsed scheduled_time; unparseable times go to end-of-day.
  // Stable sort preserves the DB's created_at tiebreaker for equal times.
  for (const d of dates) {
    jobsByDate[d].sort((a, b) => parseScheduledTime(a.scheduled_time) - parseScheduledTime(b.scheduled_time))
  }

  const totalJobs = jobs?.length ?? 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-sage-800">Calendar</h1>
          <Link href="/portal/jobs" className="inline-flex items-center gap-1.5 border border-sage-200 text-sage-600 font-medium px-3 py-1.5 rounded-lg text-xs hover:bg-sage-50 transition-colors">
            <List size={14} /> List view
          </Link>
        </div>
        <Link
          href={`/portal/jobs/new?date=${view === 'day' ? selectedDate : today}`}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
        >
          <Plus size={16} /> New Job
        </Link>
      </div>

      {/* View toggle + navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-sage-200 overflow-hidden">
            <Link href={buildUrl({ view: 'day' })} className={clsx('px-3 py-2 text-sm font-medium transition-colors', view === 'day' ? 'bg-sage-500 text-white' : 'text-sage-600 hover:bg-sage-50')}>Day</Link>
            <Link href={buildUrl({ view: 'week' })} className={clsx('px-3 py-2 text-sm font-medium transition-colors', view === 'week' ? 'bg-sage-500 text-white' : 'text-sage-600 hover:bg-sage-50')}>Week</Link>
            <Link href={buildUrl({ view: 'month' })} className={clsx('px-3 py-2 text-sm font-medium transition-colors', view === 'month' ? 'bg-sage-500 text-white' : 'text-sage-600 hover:bg-sage-50')}>Month</Link>
          </div>

          {/* Nav arrows */}
          <div className="flex items-center gap-1">
            <Link href={buildUrl({ date: prevDate })} className="p-2 rounded-lg border border-sage-200 text-sage-600 hover:bg-sage-50 transition-colors">
              <ChevronLeft size={16} />
            </Link>
            <Link href={buildUrl({ date: today })} className="px-3 py-2 rounded-lg border border-sage-200 text-sage-600 text-sm font-medium hover:bg-sage-50 transition-colors">Today</Link>
            <Link href={buildUrl({ date: nextDate })} className="p-2 rounded-lg border border-sage-200 text-sage-600 hover:bg-sage-50 transition-colors">
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        {/* Date label */}
        <span className="text-sm font-medium text-sage-700">
          {view === 'day'
            ? fmtDateLong(selectedDate)
            : view === 'week'
            ? `${fmtDayHeader(rangeStart)} – ${fmtDayHeader(rangeEnd)}`
            : fmtMonthHeader(selectedDate)
          }
          <span className="text-sage-400 ml-2">({totalJobs} job{totalJobs !== 1 ? 's' : ''})</span>
        </span>
      </div>

      {/* Filters */}
      <CalendarFilters
        contractors={contractors ?? []}
        currentContractor={contractorFilter}
        currentStatus={statusFilter}
        view={view}
        date={selectedDate}
      />

      {/* Calendar body */}
      {view === 'day' && (
        <div className="bg-white rounded-xl border border-sage-100 p-5">
          {jobsByDate[selectedDate].length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sage-500 text-sm mb-3">No jobs scheduled for this day.</p>
              <Link href={`/portal/jobs/new?date=${selectedDate}`} className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors">
                <Plus size={16} /> Add Job
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {jobsByDate[selectedDate].map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {dates.map((date) => {
            const dayJobs = jobsByDate[date]
            const isToday = date === today
            return (
              <div key={date} className={clsx('bg-white rounded-xl border p-3 min-h-[120px]', isToday ? 'border-sage-300 ring-1 ring-sage-200' : 'border-sage-100')}>
                <div className="flex items-center justify-between mb-2">
                  <Link href={buildUrl({ view: 'day', date })} className={clsx('text-xs font-semibold hover:text-sage-700 transition-colors', isToday ? 'text-sage-800' : 'text-sage-500')}>
                    {fmtDayHeader(date)}
                  </Link>
                  {dayJobs.length > 0 && (
                    <span className="text-xs text-sage-400 font-medium">{dayJobs.length}</span>
                  )}
                </div>
                {dayJobs.length === 0 ? (
                  <p className="text-xs text-sage-300 mt-4 text-center">—</p>
                ) : (
                  <div className="space-y-2">
                    {dayJobs.map((job) => (
                      <JobCard key={job.id} job={job} compact />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {view === 'month' && (
        <div>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="text-xs text-sage-500 font-semibold text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {dates.map((date) => {
              const dayJobs = jobsByDate[date]
              const isToday = date === today
              const isInMonth = date.slice(0, 7) === selectedMonthKey
              const overflow = dayJobs.length > 3
              const shown = overflow ? dayJobs.slice(0, 3) : dayJobs
              return (
                <div
                  key={date}
                  className={clsx(
                    'bg-white rounded-lg border p-2 min-h-[110px] flex flex-col',
                    isToday ? 'border-sage-300 ring-1 ring-sage-200' : 'border-sage-100',
                    !isInMonth && 'opacity-50',
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Link
                      href={buildUrl({ view: 'day', date })}
                      className={clsx(
                        'text-xs font-semibold hover:text-sage-700 transition-colors',
                        isToday ? 'text-sage-800' : 'text-sage-500',
                      )}
                    >
                      {new Date(date).getDate()}
                    </Link>
                    {dayJobs.length > 0 && (
                      <span className="text-[10px] text-sage-400 font-medium">{dayJobs.length}</span>
                    )}
                  </div>
                  <div className="space-y-1 flex-1">
                    {shown.map((job) => (
                      <JobCard key={job.id} job={job} compact />
                    ))}
                    {overflow && (
                      <Link
                        href={buildUrl({ view: 'day', date })}
                        className="block text-[11px] text-sage-500 hover:text-sage-700 font-medium pl-1 pt-0.5"
                      >
                        +{dayJobs.length - 3} more
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
