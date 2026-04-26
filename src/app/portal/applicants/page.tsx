// Phase 5.1 — Applicant pipeline list view.
//
// Status filter tabs (all 9 statuses), type filter, free-text search,
// and a sort menu. Default sort is "Needs action": status='new' rows
// first (oldest first to surface stale ones), then everything else
// newest first. Rejected hidden by default unless ?show_rejected=1.

import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { UserCircle } from 'lucide-react'
import clsx from 'clsx'

type ApplicantRow = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  suburb: string
  application_type: string
  status: string
  created_at: string
}

const STALE_DAYS_DEFAULT = 7

const STATUS_TABS: { value: string; label: string }[] = [
  { value: '',              label: 'All' },
  { value: 'new',           label: 'New' },
  { value: 'reviewing',     label: 'Reviewing' },
  { value: 'phone_screen',  label: 'Phone screen' },
  { value: 'approved',      label: 'Approved' },
  { value: 'onboarding',    label: 'Onboarding' },
  { value: 'trial',         label: 'Trial' },
  { value: 'ready_to_work', label: 'Ready' },
  { value: 'on_hold',       label: 'On hold' },
  { value: 'rejected',      label: 'Rejected' },
]

const STATUS_BADGE: Record<string, string> = {
  new:           'bg-sky-50 text-sky-700',
  reviewing:     'bg-amber-50 text-amber-700',
  phone_screen:  'bg-violet-50 text-violet-700',
  approved:      'bg-indigo-50 text-indigo-700',
  onboarding:    'bg-teal-50 text-teal-700',
  trial:         'bg-purple-50 text-purple-700',
  ready_to_work: 'bg-emerald-100 text-emerald-800',
  on_hold:       'bg-gray-100 text-gray-600',
  rejected:      'bg-gray-100 text-gray-500',
}

const STATUS_PRIORITY: Record<string, number> = {
  new: 0, reviewing: 1, phone_screen: 2, trial: 3,
  approved: 4, onboarding: 5, ready_to_work: 6, on_hold: 7, rejected: 8,
}

const TYPE_TABS: { value: string; label: string }[] = [
  { value: '',           label: 'All types' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'employee',   label: 'Employee' },
]

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: '',        label: 'Needs action' },
  { value: 'newest',  label: 'Newest first' },
  { value: 'oldest',  label: 'Oldest first' },
]

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtStatus(s: string) {
  return s.replace(/_/g, ' ')
}

function isStale(row: ApplicantRow, staleDays: number): boolean {
  if (row.status !== 'new') return false
  const ageMs = Date.now() - new Date(row.created_at).getTime()
  return ageMs >= staleDays * 86400000
}

function applySort(rows: ApplicantRow[], sortKey: string): ApplicantRow[] {
  if (sortKey === 'newest') {
    return [...rows].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }
  if (sortKey === 'oldest') {
    return [...rows].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }
  // Default: needs-action.
  return [...rows].sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 99
    const pb = STATUS_PRIORITY[b.status] ?? 99
    if (pa !== pb) return pa - pb
    if (a.status === 'new') {
      // oldest first within 'new' so the most-stale rises
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export default async function ApplicantsPage({
  searchParams,
}: {
  searchParams: {
    status?: string
    type?: string
    sort?: string
    q?: string
    show_rejected?: string
  }
}) {
  const supabase = createClient()
  const statusFilter = searchParams.status ?? ''
  const typeFilter = searchParams.type ?? ''
  const sortKey = searchParams.sort ?? ''
  const search = (searchParams.q ?? '').trim()
  const showRejected = searchParams.show_rejected === '1' || statusFilter === 'rejected'

  let query = supabase
    .from('applicants')
    .select('id, first_name, last_name, email, phone, suburb, application_type, status, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  if (statusFilter) query = query.eq('status', statusFilter)
  else if (!showRejected) query = query.neq('status', 'rejected')

  if (typeFilter) query = query.eq('application_type', typeFilter)

  if (search) {
    const escaped = search.replace(/[%,]/g, '')
    query = query.or(`first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,email.ilike.%${escaped}%,suburb.ilike.%${escaped}%`)
  }

  const { data: applicants, error } = await query

  if (error) {
    return (
      <div>
        <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-8">Applicants</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
          Failed to load applicants: {error.message}
        </div>
      </div>
    )
  }

  const rows = applySort((applicants ?? []) as ApplicantRow[], sortKey)

  function buildHref(overrides: Partial<{ status: string; type: string; sort: string; q: string; show_rejected: string }>) {
    const params = new URLSearchParams()
    const merged = {
      status: overrides.status ?? statusFilter,
      type: overrides.type ?? typeFilter,
      sort: overrides.sort ?? sortKey,
      q: overrides.q ?? search,
      show_rejected: overrides.show_rejected ?? (showRejected && !statusFilter ? '1' : ''),
    }
    if (merged.status) params.set('status', merged.status)
    if (merged.type) params.set('type', merged.type)
    if (merged.sort) params.set('sort', merged.sort)
    if (merged.q) params.set('q', merged.q)
    if (merged.show_rejected === '1' && !merged.status) params.set('show_rejected', '1')
    const qs = params.toString()
    return qs ? `/portal/applicants?${qs}` : '/portal/applicants'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl tracking-tight font-bold text-sage-800">Applicants</h1>
      </div>

      {/* Search + sort + show-rejected */}
      <form className="flex flex-wrap gap-3 mb-4 items-center" action="/portal/applicants" method="get">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Search name, email, suburb…"
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 min-w-[240px]"
        />
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
        {sortKey && <input type="hidden" name="sort" value={sortKey} />}
        {showRejected && !statusFilter && <input type="hidden" name="show_rejected" value="1" />}
        <button
          type="submit"
          className="bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 transition-colors"
        >
          Search
        </button>
        {search && (
          <Link
            href={buildHref({ q: '' })}
            className="text-xs text-sage-600 hover:text-sage-800 underline-offset-2 hover:underline"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="flex flex-wrap gap-2 mb-3">
        {STATUS_TABS.map((t) => {
          const active = (statusFilter || '') === t.value
          return (
            <Link
              key={t.value || 'all'}
              href={buildHref({ status: t.value })}
              className={clsx(
                'inline-block px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors',
                active
                  ? 'bg-sage-500 text-white'
                  : 'bg-white border border-gray-200 text-sage-700 hover:bg-gray-50',
              )}
            >
              {t.label}
            </Link>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-center text-xs text-sage-600">
        <div className="flex gap-1.5">
          {TYPE_TABS.map((t) => {
            const active = (typeFilter || '') === t.value
            return (
              <Link
                key={t.value || 'all-types'}
                href={buildHref({ type: t.value })}
                className={clsx(
                  'inline-block px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                  active
                    ? 'bg-sage-100 text-sage-800'
                    : 'text-sage-600 hover:bg-gray-50',
                )}
              >
                {t.label}
              </Link>
            )
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sage-500">Sort:</span>
          {SORT_OPTIONS.map((o) => {
            const active = (sortKey || '') === o.value
            return (
              <Link
                key={o.value || 'default'}
                href={buildHref({ sort: o.value })}
                className={clsx(
                  'inline-block px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                  active
                    ? 'bg-sage-100 text-sage-800'
                    : 'text-sage-600 hover:bg-gray-50',
                )}
              >
                {o.label}
              </Link>
            )
          })}
        </div>
        {!statusFilter && (
          <Link
            href={buildHref({ show_rejected: showRejected ? '' : '1' })}
            className="text-[11px] text-sage-600 hover:text-sage-800 underline-offset-2 hover:underline ml-auto"
          >
            {showRejected ? 'Hide rejected' : 'Show rejected'}
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <UserCircle size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm mb-1">
            No applicants{statusFilter ? ` with status "${fmtStatus(statusFilter)}"` : ''}
            {typeFilter ? ` (${typeFilter})` : ''}
            {search ? ` matching "${search}"` : ''} yet.
          </p>
          <p className="text-sage-500 text-xs">Applications submitted via /join-our-team appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Phone</th>
                  <th className="px-5 py-3 font-semibold">Suburb</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const stale = isStale(a, STALE_DAYS_DEFAULT)
                  return (
                    <tr key={a.id} className="border-b border-gray-50 last:border-0 group">
                      <td className="p-0">
                        <Link href={`/portal/applicants/${a.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors font-medium text-sage-800">
                          <span className="inline-flex items-center gap-2">
                            {stale && <span className="inline-block w-2 h-2 rounded-full bg-amber-400" title={`Stale — in 'new' for ${STALE_DAYS_DEFAULT}+ days`} />}
                            {a.first_name} {a.last_name}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0"><Link href={`/portal/applicants/${a.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{a.email}</Link></td>
                      <td className="p-0"><Link href={`/portal/applicants/${a.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{a.phone}</Link></td>
                      <td className="p-0"><Link href={`/portal/applicants/${a.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{a.suburb}</Link></td>
                      <td className="p-0"><Link href={`/portal/applicants/${a.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600 capitalize">{a.application_type}</Link></td>
                      <td className="p-0">
                        <Link href={`/portal/applicants/${a.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors">
                          <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_BADGE[a.status] ?? 'bg-gray-100 text-gray-600')}>
                            {fmtStatus(a.status)}
                          </span>
                        </Link>
                      </td>
                      <td className="p-0"><Link href={`/portal/applicants/${a.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{fmtDate(a.created_at)}</Link></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {rows.map((a) => {
              const stale = isStale(a, STALE_DAYS_DEFAULT)
              return (
                <Link key={a.id} href={`/portal/applicants/${a.id}`} className="block p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sage-800 truncate inline-flex items-center gap-2">
                        {stale && <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />}
                        {a.first_name} {a.last_name}
                      </p>
                      <p className="text-xs text-sage-600 truncate">{a.email}</p>
                      <p className="text-xs text-sage-600">{a.suburb} · <span className="capitalize">{a.application_type}</span></p>
                    </div>
                    <span className={clsx('inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize whitespace-nowrap', STATUS_BADGE[a.status] ?? 'bg-gray-100 text-gray-600')}>
                      {fmtStatus(a.status)}
                    </span>
                  </div>
                  <p className="text-[11px] text-sage-500 mt-1">{fmtDate(a.created_at)}</p>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
