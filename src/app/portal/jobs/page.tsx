import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { Briefcase, Plus, CalendarDays } from 'lucide-react'
import { JobFilters } from './_components/JobFilters'
import { StatusBadge } from '../_components/StatusBadge'

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

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { view?: string; contractor?: string; sort?: string; q?: string }
}) {
  const supabase = createClient()

  const view = searchParams.view ?? ''
  const contractorFilter = searchParams.contractor ?? ''
  const sort = searchParams.sort ?? 'scheduled_asc'
  const search = searchParams.q?.trim() ?? ''

  const today = todayStr()
  const tomorrow = tomorrowStr()

  // Build query — safe fields + assigned_to + contractor name
  let query = supabase
    .from('jobs')
    .select('id, job_number, title, address, status, scheduled_date, scheduled_time, assigned_to, contractor_id, created_at, clients ( name )')

  // Apply view filters
  if (view === 'today') query = query.eq('scheduled_date', today)
  else if (view === 'tomorrow') query = query.eq('scheduled_date', tomorrow)
  else if (view === 'unassigned') query = query.is('contractor_id', null)
  else if (view === 'in_progress') query = query.eq('status', 'in_progress')
  else if (view === 'completed') query = query.eq('status', 'completed')

  // Contractor filter
  if (contractorFilter) query = query.eq('contractor_id', contractorFilter)

  // Search — ilike on job_number, title, address, assigned_to
  if (search) {
    query = query.or(`job_number.ilike.%${search}%,title.ilike.%${search}%,address.ilike.%${search}%,assigned_to.ilike.%${search}%`)
  }

  // Sorting
  if (sort === 'scheduled_asc') query = query.order('scheduled_date', { ascending: true, nullsFirst: false })
  else if (sort === 'scheduled_desc') query = query.order('scheduled_date', { ascending: false })
  else if (sort === 'created_desc') query = query.order('created_at', { ascending: false })
  else if (sort === 'created_asc') query = query.order('created_at', { ascending: true })

  // Load jobs + contractors + counts in parallel
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
        <h1 className="text-2xl font-bold text-sage-800 mb-6">Jobs</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
          Failed to load jobs: {error.message}
        </div>
      </div>
    )
  }

  const rows = (jobs ?? []).map((j) => {
    const client = j.clients as unknown as { name: string } | null
    return {
      id: j.id,
      jobNumber: j.job_number,
      clientName: client?.name ?? '—',
      title: j.title ?? '—',
      address: j.address ?? '',
      status: j.status ?? 'draft',
      assignedTo: j.assigned_to ?? '',
      scheduledDate: j.scheduled_date,
      scheduledTime: j.scheduled_time,
      createdAt: j.created_at,
    }
  })

  const counts = {
    today: todayCount.count ?? 0,
    tomorrow: tomorrowCount.count ?? 0,
    unassigned: unassignedCount.count ?? 0,
    inProgress: inProgressCount.count ?? 0,
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-sage-800">Jobs</h1>
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
        <div className="bg-white rounded-xl border border-sage-100 p-10 text-center">
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
        <div className="bg-white rounded-xl border border-sage-100 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sage-100 text-left text-sage-600">
                  <th className="px-5 py-3 font-semibold">Job #</th>
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-5 py-3 font-semibold">Address</th>
                  <th className="px-5 py-3 font-semibold">Contractor</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-sage-50 last:border-0 group">
                    <td className="p-0"><Link href={`/portal/jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors font-medium text-sage-800">{row.jobNumber}</Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-700 max-w-[200px] truncate">{row.title}</Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-600 max-w-[200px] truncate">{row.address || '—'}</Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-600">{row.assignedTo || <span className="text-sage-300">Unassigned</span>}</Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors"><StatusBadge kind="job" status={row.status} /></Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-600">{fmtDate(row.scheduledDate)}{row.scheduledTime ? <span className="text-sage-400 ml-1.5">{row.scheduledTime}</span> : ''}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-sage-100">
            {rows.map((row) => (
              <Link key={row.id} href={`/portal/jobs/${row.id}`} className="block px-4 py-4 hover:bg-sage-50/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sage-800">{row.jobNumber}</span>
                  <StatusBadge kind="job" status={row.status} />
                </div>
                <div className="text-sage-700 text-sm">{row.title}</div>
                {row.address && <div className="text-sage-500 text-xs mt-1">{row.address}</div>}
                <div className="flex items-center justify-between mt-2 text-xs text-sage-500">
                  <span>{row.assignedTo || 'Unassigned'}</span>
                  <span>{fmtDate(row.scheduledDate)}{row.scheduledTime ? ` ${row.scheduledTime}` : ''}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-sage-400 mt-4">{rows.length} job{rows.length !== 1 ? 's' : ''}</p>
    </div>
  )
}
