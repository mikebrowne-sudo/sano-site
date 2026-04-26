// Phase 5.5.2 — Staff detail page.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { ArrowLeft, Pencil } from 'lucide-react'
import clsx from 'clsx'
import {
  InviteActions,
  staffAccessStatus,
  STATUS_LABEL,
  STATUS_BADGE,
} from '../_components/InviteActions'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const ROLE_LABEL: Record<string, string> = { admin: 'Admin', staff: 'Staff' }

const ACTION_LABELS: Record<string, string> = {
  'staff.created':           'Created',
  'staff.updated':           'Updated',
  'staff.invite_sent':       'Invite sent',
  'staff.access_disabled':   'Access disabled',
  'staff.access_enabled':    'Access re-enabled',
}

type AuditEntry = {
  id: string
  action: string
  created_at: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

export default async function StaffDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: s, error } = await supabase
    .from('staff')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  if (error || !s) notFound()

  const { data: auditRows } = await supabase
    .from('audit_log')
    .select('id, action, created_at, before, after')
    .eq('entity_table', 'staff')
    .eq('entity_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50)
  const audit: AuditEntry[] = (auditRows ?? []) as AuditEntry[]

  const status = staffAccessStatus(s as never)

  return (
    <div className="max-w-3xl">
      <Link
        href="/portal/staff"
        className="inline-flex items-center gap-1 text-sm text-sage-600 hover:text-sage-800 mb-4"
      >
        <ArrowLeft size={14} /> All staff
      </Link>

      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl tracking-tight font-bold text-sage-800">{s.full_name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium', STATUS_BADGE[status])}>
              {STATUS_LABEL[status]}
            </span>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-sage-50 text-sage-700">
              {ROLE_LABEL[s.role as string] ?? s.role}
            </span>
          </div>
        </div>
        <Link
          href={`/portal/staff/${params.id}/edit`}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-sage-700 transition-colors"
        >
          <Pencil size={14} />
          Edit
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-sage-800 mb-3">Contact</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-sage-500 mb-0.5">Email</dt>
            <dd><a href={`mailto:${s.email}`} className="text-sage-800 font-medium hover:underline underline-offset-2">{s.email}</a></dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-sage-500 mb-0.5">Role</dt>
            <dd className="text-sage-800 font-medium">{ROLE_LABEL[s.role as string] ?? s.role}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-sage-800 mb-3">Portal access</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-5">
          <div>
            <dt className="text-xs uppercase tracking-wide text-sage-500 mb-0.5">Status</dt>
            <dd className="text-sage-800 font-medium">{STATUS_LABEL[status]}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-sage-500 mb-0.5">Invite sent</dt>
            <dd className="text-sage-800 font-medium">{fmtDate(s.invite_sent_at)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-sage-500 mb-0.5">Invite accepted</dt>
            <dd className="text-sage-800 font-medium">{fmtDate(s.invite_accepted_at)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-sage-500 mb-0.5">Auth user linked</dt>
            <dd className="text-sage-800 font-medium">{s.auth_user_id ? 'Yes' : 'No'}</dd>
          </div>
          {s.access_disabled_at && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-sage-500 mb-0.5">Disabled</dt>
              <dd className="text-red-700 font-medium">{fmtDate(s.access_disabled_at)} — {s.access_disabled_reason || '(no reason)'}</dd>
            </div>
          )}
        </dl>
        <InviteActions staffId={s.id as string} status={status} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-sage-800 mb-3">Activity</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-sage-500">No history yet.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {audit.map((e) => (
              <li key={e.id} className="py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-sage-800">{ACTION_LABELS[e.action] ?? e.action}</p>
                  <p className="text-[11px] text-sage-500 whitespace-nowrap">{fmtDateTime(e.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
