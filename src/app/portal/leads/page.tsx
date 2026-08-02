import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { Target, Plus, CalendarClock } from 'lucide-react'
import { PortalPageHeader } from '../_components/PortalPageHeader'
import { buttonClasses } from '../_components/Button'
import { EmptyState } from '../_components/EmptyState'
import { PortalListTable, type ListColumnDef } from '../_components/PortalListTable'
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_BADGE,
  QUALITY_RANKS,
  QUALITY_RANK_BADGE,
  type LeadStatus,
  type QualityRank,
  type SalesLead,
} from '@/lib/campaigns/constants'

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; rank?: string }
}) {
  const supabase = createClient()
  const q = searchParams.q?.trim() ?? ''
  const statusFilter = LEAD_STATUSES.includes(searchParams.status as LeadStatus)
    ? (searchParams.status as LeadStatus)
    : null
  const rankFilter = QUALITY_RANKS.includes(searchParams.rank as QualityRank)
    ? (searchParams.rank as QualityRank)
    : null

  let query = supabase
    .from('sales_leads')
    .select('id, company, industry, contact_name, contact_role, email, quality_rank, status, next_follow_up')
    .order('quality_rank')
    .order('company')
    // High cap so no rank is silently truncated. With A→B→C ordering a low
    // limit hid all C (and some B) leads once the list grew past it.
    .limit(1000)

  if (statusFilter) query = query.eq('status', statusFilter)
  if (rankFilter) query = query.eq('quality_rank', rankFilter)
  if (q) query = query.ilike('company', `%${q}%`)

  const { data: leads, error } = await query

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-8">Leads</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800 text-sm">
          Could not load leads: {error.message}. If the sales tables have not been created yet,
          run <code className="font-mono">docs/db/2026-07-05-sales-campaigns.sql</code> in Supabase first.
        </div>
      </div>
    )
  }

  type Row = Pick<SalesLead, 'id' | 'company' | 'industry' | 'contact_name' | 'contact_role' | 'email' | 'quality_rank' | 'status' | 'next_follow_up'>
  const rows = (leads ?? []) as Row[]
  const today = new Date().toISOString().slice(0, 10)

  const columns: ListColumnDef<Row>[] = [
    {
      key: 'company',
      label: 'Company',
      cell: (l) => (
        <span className="inline-flex items-center gap-2">
          <span className={`inline-block text-[10px] font-bold rounded px-1.5 py-0.5 ${QUALITY_RANK_BADGE[l.quality_rank]}`}>
            {l.quality_rank}
          </span>
          <span className="font-medium text-sage-800">{l.company}</span>
        </span>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      cell: (l) => (
        <span className="text-sage-600">
          {l.contact_name || '—'}
          {l.contact_role ? <span className="text-sage-400"> · {l.contact_role}</span> : null}
        </span>
      ),
    },
    { key: 'email', label: 'Email', cell: (l) => <span className="text-sage-600">{l.email || '—'}</span> },
    {
      key: 'status',
      label: 'Status',
      cell: (l) => (
        <span className={`inline-block text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${LEAD_STATUS_BADGE[l.status]}`}>
          {LEAD_STATUS_LABELS[l.status]}
        </span>
      ),
    },
    {
      key: 'follow_up',
      label: 'Follow-up',
      cell: (l) =>
        l.next_follow_up ? (
          <span className={`inline-flex items-center gap-1 text-xs ${l.next_follow_up <= today ? 'text-red-600 font-semibold' : 'text-sage-600'}`}>
            <CalendarClock size={12} />
            {l.next_follow_up}
          </span>
        ) : (
          <span className="text-sage-400">—</span>
        ),
    },
  ]

  // Build a /portal/leads URL preserving the other active filters.
  const buildHref = (next: { status?: LeadStatus | null; rank?: QualityRank | null }) => {
    const params = new URLSearchParams()
    const status = next.status !== undefined ? next.status : statusFilter
    const rank = next.rank !== undefined ? next.rank : rankFilter
    if (status) params.set('status', status)
    if (rank) params.set('rank', rank)
    if (q) params.set('q', q)
    const qs = params.toString()
    return `/portal/leads${qs ? `?${qs}` : ''}`
  }

  const statusTab = (value: LeadStatus | null, label: string) => {
    const active = statusFilter === value
    return (
      <Link
        key={label}
        href={buildHref({ status: value })}
        className={`text-xs font-semibold rounded-full px-3 py-1.5 transition-colors ${
          active ? 'bg-sage-700 text-white' : 'bg-sage-50 text-sage-600 hover:bg-sage-100'
        }`}
      >
        {label}
      </Link>
    )
  }

  const rankTab = (value: QualityRank | null, label: string) => {
    const active = rankFilter === value
    return (
      <Link
        key={`rank-${label}`}
        href={buildHref({ rank: value })}
        className={`text-xs font-semibold rounded-full px-3 py-1.5 transition-colors ${
          active ? 'bg-sage-700 text-white' : 'bg-sage-50 text-sage-600 hover:bg-sage-100'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <PortalListTable<Row>
      header={
        <PortalPageHeader
          title="Leads"
          actions={
            <Link href="/portal/leads/new" className={buttonClasses({ variant: 'primary' })}>
              <Plus size={16} />
              New Lead
            </Link>
          }
        />
      }
      filters={
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {statusTab(null, 'All')}
            {(['new', 'contacted', 'responded', 'meeting', 'quoted', 'won'] as LeadStatus[]).map((s) =>
              statusTab(s, LEAD_STATUS_LABELS[s])
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] uppercase tracking-wide text-sage-400 mr-1">Grade</span>
            {rankTab(null, 'All grades')}
            {QUALITY_RANKS.map((r) => rankTab(r, `${r} grade`))}
            <span className="text-xs text-sage-400 ml-1">{rows.length} shown</span>
          </div>
        </div>
      }
      emptyState={
        <EmptyState
          icon={Target}
          title={q || statusFilter ? 'No leads match this view.' : 'No leads yet.'}
          action={
            <Link href="/portal/leads/new" className={buttonClasses({ variant: 'primary' })}>
              <Plus size={16} />
              Add your first lead
            </Link>
          }
        />
      }
      rows={rows}
      columns={columns}
      rowHref={(l) => `/portal/leads/${l.id}`}
      rowLabel={(l) => `lead ${l.company}`}
      isDimmed={(l) => l.status === 'do_not_contact' || l.status === 'lost'}
      mobile={{
        label: (l) => `lead ${l.company}`,
        primary: (l) => (
          <span className="inline-flex items-center gap-2">
            <span className={`inline-block text-[10px] font-bold rounded px-1.5 py-0.5 ${QUALITY_RANK_BADGE[l.quality_rank]}`}>
              {l.quality_rank}
            </span>
            <span className="font-medium text-sage-800">{l.company}</span>
          </span>
        ),
        secondary: (l) => l.contact_name,
        meta: (l) => (
          <>
            <span>{LEAD_STATUS_LABELS[l.status]}</span>
            <span>{l.next_follow_up ?? ''}</span>
          </>
        ),
      }}
    />
  )
}
