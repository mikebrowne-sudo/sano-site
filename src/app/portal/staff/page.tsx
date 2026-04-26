// Phase 5.5.2 — Staff list page.
//
// Admin-only via RLS. Renders a card-based mobile layout +
// table on desktop. Each row links to /portal/staff/[id].

import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { UserCog, Plus } from 'lucide-react'
import clsx from 'clsx'
import {
  staffAccessStatus,
  STATUS_LABEL,
  STATUS_BADGE,
} from './_components/InviteActions'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

const ROLE_LABEL: Record<string, string> = { admin: 'Admin', staff: 'Staff' }

export default async function StaffListPage() {
  const supabase = createClient()
  const { data: rows, error } = await supabase
    .from('staff')
    .select('id, full_name, email, role, auth_user_id, invite_sent_at, invite_accepted_at, access_disabled_at, created_at')
    .order('full_name')

  if (error) {
    return (
      <div>
        <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-8">Staff</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
          Failed to load staff: {error.message}
        </div>
      </div>
    )
  }

  const list = rows ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl tracking-tight font-bold text-sage-800">Staff</h1>
        <Link
          href="/portal/staff/new"
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
        >
          <Plus size={16} />
          New staff
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <UserCog size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm mb-4">No staff records yet.</p>
          <Link
            href="/portal/staff/new"
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
          >
            <Plus size={16} />
            Add your first staff member
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Access</th>
                  <th className="px-5 py-3 font-semibold">Invite sent</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => {
                  const status = staffAccessStatus(s as never)
                  return (
                    <tr key={s.id} className="border-b border-gray-50 last:border-0 group">
                      <td className="p-0"><Link href={`/portal/staff/${s.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors font-medium text-sage-800">{s.full_name}</Link></td>
                      <td className="p-0"><Link href={`/portal/staff/${s.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{s.email}</Link></td>
                      <td className="p-0"><Link href={`/portal/staff/${s.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{ROLE_LABEL[s.role] ?? s.role}</Link></td>
                      <td className="p-0"><Link href={`/portal/staff/${s.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors">
                        <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium', STATUS_BADGE[status])}>
                          {STATUS_LABEL[status]}
                        </span>
                      </Link></td>
                      <td className="p-0"><Link href={`/portal/staff/${s.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{fmtDate(s.invite_sent_at)}</Link></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {list.map((s) => {
              const status = staffAccessStatus(s as never)
              return (
                <Link key={s.id} href={`/portal/staff/${s.id}`} className="block p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sage-800 truncate">{s.full_name}</p>
                      <p className="text-xs text-sage-600 truncate">{s.email}</p>
                      <p className="text-xs text-sage-500 mt-0.5">{ROLE_LABEL[s.role] ?? s.role}</p>
                    </div>
                    <span className={clsx('inline-block px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap', STATUS_BADGE[status])}>
                      {STATUS_LABEL[status]}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
