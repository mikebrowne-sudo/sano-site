// Phase 5 — Applicant pipeline list view.
//
// Reads from `applicants` table (RLS staff-read). Supports a simple
// status filter via the `?status=` query string. No sort UI yet — newest
// first by created_at.

import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { UserCircle } from 'lucide-react'
import clsx from 'clsx'

const STATUS_TABS: { value: string; label: string }[] = [
  { value: '',                       label: 'All' },
  { value: 'new',                    label: 'New' },
  { value: 'reviewing',              label: 'Reviewing' },
  { value: 'interview',              label: 'Interview' },
  { value: 'approved',               label: 'Approved' },
  { value: 'rejected',               label: 'Rejected' },
  { value: 'converted_to_contractor',label: 'Converted' },
]

const STATUS_BADGE: Record<string, string> = {
  new:                         'bg-sky-50 text-sky-700',
  reviewing:                   'bg-amber-50 text-amber-700',
  interview:                   'bg-violet-50 text-violet-700',
  approved:                    'bg-emerald-50 text-emerald-700',
  rejected:                    'bg-gray-100 text-gray-500',
  converted_to_contractor:     'bg-emerald-100 text-emerald-800',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtStatus(s: string) {
  return s.replace(/_/g, ' ')
}

export default async function ApplicantsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const supabase = createClient()
  const statusFilter = searchParams.status ?? ''

  let query = supabase
    .from('applicants')
    .select('id, first_name, last_name, email, phone, suburb, application_type, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (statusFilter) query = query.eq('status', statusFilter)

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

  const rows = applicants ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl tracking-tight font-bold text-sage-800">Applicants</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_TABS.map((t) => {
          const active = (statusFilter || '') === t.value
          const href = t.value ? `/portal/applicants?status=${t.value}` : '/portal/applicants'
          return (
            <Link
              key={t.value || 'all'}
              href={href}
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

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <UserCircle size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm mb-1">No applicants{statusFilter ? ` with status "${fmtStatus(statusFilter)}"` : ''} yet.</p>
          <p className="text-sage-500 text-xs">Applications submitted via /join-our-team will appear here.</p>
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
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 last:border-0 group">
                    <td className="p-0"><Link href={`/portal/applicants/${a.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors font-medium text-sage-800">{a.first_name} {a.last_name}</Link></td>
                    <td className="p-0"><Link href={`/portal/applicants/${a.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{a.email}</Link></td>
                    <td className="p-0"><Link href={`/portal/applicants/${a.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{a.phone}</Link></td>
                    <td className="p-0"><Link href={`/portal/applicants/${a.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{a.suburb}</Link></td>
                    <td className="p-0"><Link href={`/portal/applicants/${a.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600 capitalize">{a.application_type}</Link></td>
                    <td className="p-0"><Link href={`/portal/applicants/${a.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors">
                      <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_BADGE[a.status] ?? 'bg-gray-100 text-gray-600')}>
                        {fmtStatus(a.status)}
                      </span>
                    </Link></td>
                    <td className="p-0"><Link href={`/portal/applicants/${a.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{fmtDate(a.created_at)}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {rows.map((a) => (
              <Link key={a.id} href={`/portal/applicants/${a.id}`} className="block p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sage-800 truncate">{a.first_name} {a.last_name}</p>
                    <p className="text-xs text-sage-600 truncate">{a.email}</p>
                    <p className="text-xs text-sage-600">{a.suburb} · <span className="capitalize">{a.application_type}</span></p>
                  </div>
                  <span className={clsx('inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize whitespace-nowrap', STATUS_BADGE[a.status] ?? 'bg-gray-100 text-gray-600')}>
                    {fmtStatus(a.status)}
                  </span>
                </div>
                <p className="text-[11px] text-sage-500 mt-1">{fmtDate(a.created_at)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
