import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { Briefcase, Plus, CalendarDays } from 'lucide-react'
import { JobFilters } from './_components/JobFilters'
import { StatusBadge } from '../_components/StatusBadge'
import { loadDisplaySettings, JOB_FIELDS } from '@/lib/portal-display-settings'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function tomorrowStr() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

// Phase 2 — map a settings sortBy + sortDirection onto a Supabase
// query. Allowed sort keys are constrained by JOB_FIELDS.sortable so
// this is always safe. Param typed as `any` because Supabase's chained
// builder types switch shape after .select() — not worth pulling the
// generics through here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyJobSort(query: any, sortBy: string, sortDirection: 'asc' | 'desc') {
  const ascending = sortDirection === 'asc'
  switch (sortBy) {
    case 'scheduled_date': return query.order('scheduled_date', { ascending, nullsFirst: false })
    case 'status':         return query.order('status',         { ascending })
    case 'job_number':     return query.order('job_number',     { ascending })
    default:               return query.order('scheduled_date', { ascending: true, nullsFirst: false })
  }
}

// URL `?sort=` overrides settings — operator can re-sort interactively
// without losing the saved default.
function urlSortToSettings(s: string | undefined): { sortBy: string; sortDirection: 'asc' | 'desc' } | null {
  if (!s) return null
  if (s === 'scheduled_asc')  return { sortBy: 'scheduled_date', sortDirection: 'asc' }
  if (s === 'scheduled_desc') return { sortBy: 'scheduled_date', sortDirection: 'desc' }
  if (s === 'created_desc')   return { sortBy: 'job_number',     sortDirection: 'desc' }
  if (s === 'created_asc')    return { sortBy: 'job_number',     sortDirection: 'asc' }
  return null
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { view?: string; contractor?: string; sort?: string; q?: string }
}) {
  const supabase = createClient()

  const view = searchParams.view ?? ''
  const contractorFilter = searchParams.contractor ?? ''
  const search = searchParams.q?.trim() ?? ''

  const today = todayStr()
  const tomorrow = tomorrowStr()

  // Phase 2 — load display settings, then resolve the active sort from
  // (URL override → settings → fallback default).
  const display = await loadDisplaySettings(supabase)
  const jobsList = display.jobs.list
  const activeSort = urlSortToSettings(searchParams.sort) ?? {
    sortBy: jobsList.sortBy,
    sortDirection: jobsList.sortDirection,
  }
  const visible = new Set(jobsList.visibleFields)

  // Build query — keep the same select shape so the underlying data
  // never changes. Settings only controls which columns we render.
  let query = supabase
    .from('jobs')
    .select('id, job_number, title, address, status, scheduled_date, scheduled_time, assigned_to, contractor_id, created_at, clients ( name, company_name )')

  if (view === 'today') query = query.eq('scheduled_date', today)
  else if (view === 'tomorrow') query = query.eq('scheduled_date', tomorrow)
  else if (view === 'unassigned') query = query.is('contractor_id', null)
  else if (view === 'in_progress') query = query.eq('status', 'in_progress')
  else if (view === 'completed') query = query.eq('status', 'completed')

  if (contractorFilter) query = query.eq('contractor_id', contractorFilter)

  if (search) {
    query = query.or(`job_number.ilike.%${search}%,title.ilike.%${search}%,address.ilike.%${search}%,assigned_to.ilike.%${search}%`)
  }

  query = applyJobSort(query, activeSort.sortBy, activeSort.sortDirection)

  const [{ data: jobs, error }, { data: contractors }, todayCount, tomorrowCount, unassignedCount, inProgressCount] = await Promise.all([
    query,
    supabase.from('contractors').select('id, full_name').eq('status', 'active').order('full_name'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('scheduled_date', today),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('scheduled_date', tomorrow),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).is('contractor_id', null).neq('status', 'completed').neq('status', 'invoiced'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
  ])

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-8">Jobs</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
          Failed to load jobs: {error.message}
        </div>
      </div>
    )
  }

  const rows = (jobs ?? []).map((j) => {
    const client = j.clients as unknown as { name: string; company_name: string | null } | null
    return {
      id: j.id,
      job_number: j.job_number ?? '—',
      title: j.title ?? '—',
      client: client?.name ?? '—',
      company: client?.company_name ?? '—',
      address: j.address ?? '',
      assigned_to: j.assigned_to ?? '',
      status: j.status ?? 'draft',
      scheduled_date: j.scheduled_date,
      scheduledTime: j.scheduled_time as string | null,
      createdAt: j.created_at,
    }
  })

  const counts = {
    today: todayCount.count ?? 0,
    tomorrow: tomorrowCount.count ?? 0,
    unassigned: unassignedCount.count ?? 0,
    inProgress: inProgressCount.count ?? 0,
  }

  // Render-time helper: get cell text for a field key.
  function cell(row: typeof rows[number], key: string): React.ReactNode {
    switch (key) {
      case 'job_number':     return <span className="font-medium text-sage-800">{row.job_number}</span>
      case 'title':          return <span className="block max-w-[220px] truncate">{row.title}</span>
      case 'client':         return row.client
      case 'company':        return row.company === '—' ? <span className="text-sage-400">—</span> : row.company
      case 'address':        return row.address ? <span className="block max-w-[220px] truncate">{row.address}</span> : <span className="text-sage-400">—</span>
      case 'assigned_to':    return row.assigned_to || <span className="text-sage-300">Unassigned</span>
      case 'status':         return <StatusBadge kind="job" status={row.status} />
      case 'scheduled_date': return <>{fmtDate(row.scheduled_date)}{row.scheduledTime ? <span className="text-sage-400 ml-1.5">{row.scheduledTime}</span> : ''}</>
      default:               return null
    }
  }

  // Resolve the visible-fields list against the registry order so
  // columns render in a predictable order regardless of save order.
  const orderedVisible = JOB_FIELDS
    .filter((f) => f.contexts.includes('list') && visible.has(f.key))
    .map((f) => f.key)

  // Mobile card uses primary + secondary explicitly.
  const primaryKey = jobsList.primaryField
  const secondaryKey = jobsList.secondaryField

  function rawCell(row: typeof rows[number], key: string): string {
    switch (key) {
      case 'job_number':     return row.job_number
      case 'title':          return row.title
      case 'client':         return row.client
      case 'company':        return row.company
      case 'address':        return row.address || '—'
      case 'assigned_to':    return row.assigned_to || 'Unassigned'
      case 'status':         return row.status
      case 'scheduled_date': return fmtDate(row.scheduled_date)
      default:               return ''
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Jobs</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/portal/jobs/calendar"
            className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
          >
            <CalendarDays size={16} />
            Calendar
          </Link>
          <Link
            href="/portal/jobs/new"
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
          >
            <Plus size={16} />
            New Job
          </Link>
        </div>
      </div>

      <JobFilters contractors={contractors ?? []} counts={counts} />

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <Briefcase size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm mb-1">
            {view || search || contractorFilter ? 'No jobs match your filters.' : 'No jobs yet.'}
          </p>
          {!view && !search && !contractorFilter && (
            <Link
              href="/portal/jobs/new"
              className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors mt-3"
            >
              <Plus size={16} />
              Create your first job
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop table — visible columns driven by display settings */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  {orderedVisible.map((k) => (
                    <th key={k} className="px-5 py-3 font-semibold">
                      {JOB_FIELDS.find((f) => f.key === k)?.label ?? k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0 group">
                    {orderedVisible.map((k) => (
                      <td key={k} className="p-0">
                        <Link href={`/portal/jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-700">
                          {cell(row, k)}
                        </Link>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — primary + secondary from settings */}
          <div className="md:hidden divide-y divide-gray-100">
            {rows.map((row) => (
              <Link key={row.id} href={`/portal/jobs/${row.id}`} className="block px-4 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sage-800">{rawCell(row, primaryKey)}</span>
                  <StatusBadge kind="job" status={row.status} />
                </div>
                <div className="text-sage-700 text-sm">{rawCell(row, secondaryKey)}</div>
                {visible.has('address') && primaryKey !== 'address' && secondaryKey !== 'address' && row.address && (
                  <div className="text-sage-500 text-xs mt-1">{row.address}</div>
                )}
                <div className="flex items-center justify-between mt-2 text-xs text-sage-500">
                  <span>{row.assigned_to || 'Unassigned'}</span>
                  <span>{fmtDate(row.scheduled_date)}{row.scheduledTime ? ` ${row.scheduledTime}` : ''}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-sage-400 mt-4">{rows.length} job{rows.length !== 1 ? 's' : ''}</p>

      {jobsList.groupBy !== 'none' && (
        <p className="text-[11px] text-sage-400 mt-2 italic">
          Group-by ({jobsList.groupBy}) will be wired in the next phase. Setting persists.
        </p>
      )}
    </div>
  )
}
