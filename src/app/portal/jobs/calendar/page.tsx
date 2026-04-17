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

function fmtDayHeader(iso: string) {
  return new Date(iso).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
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

  const view = searchParams.view === 'day' ? 'day' : 'week'
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
  } else {
    rangeStart = getMonday(selectedDate)
    rangeEnd = addDays(rangeStart, 6)
    dates = Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i))
  }

  // Navigation URLs
  const prevDate = view === 'day' ? addDays(selectedDate, -1) : addDays(rangeStart, -7)
  const nextDate = view === 'day' ? addDays(selectedDate, 1) : addDays(rangeStart, 7)

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
    .order('scheduled_time', { ascending: true, nullsFirst: false })
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
            : `${fmtDayHeader(rangeStart)} – ${fmtDayHeader(rangeEnd)}`
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
      {view === 'day' ? (
        /* Day view */
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
      ) : (
        /* Week view */
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
    </div>
  )
}
