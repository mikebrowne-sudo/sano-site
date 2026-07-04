import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { Megaphone, Plus } from 'lucide-react'
import { PortalPageHeader } from '../_components/PortalPageHeader'
import { buttonClasses } from '../_components/Button'
import { EmptyState } from '../_components/EmptyState'
import { PortalListTable, type ListColumnDef } from '../_components/PortalListTable'

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-sage-100 text-sage-700',
  sending: 'bg-amber-100 text-amber-700',
  sent: 'bg-green-100 text-green-700',
  archived: 'bg-gray-200 text-gray-600',
}

export default async function CampaignsPage() {
  const supabase = createClient()

  const [{ data: campaigns, error }, { data: recipients }] = await Promise.all([
    supabase
      .from('sales_campaigns')
      .select('id, name, subject, status, created_at, sent_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('sales_campaign_recipients')
      .select('campaign_id, status, opened_at, first_clicked_at, responded_at'),
  ])

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-8">Campaigns</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800 text-sm">
          Could not load campaigns: {error.message}. If the sales tables have not been created yet,
          run <code className="font-mono">docs/db/2026-07-05-sales-campaigns.sql</code> in Supabase first.
        </div>
      </div>
    )
  }

  // Aggregate per-campaign stats in one pass.
  const stats = new Map<string, { total: number; sent: number; opened: number; clicked: number; replied: number }>()
  for (const r of recipients ?? []) {
    const s = stats.get(r.campaign_id) ?? { total: 0, sent: 0, opened: 0, clicked: 0, replied: 0 }
    s.total++
    if (r.status === 'sent') s.sent++
    if (r.opened_at) s.opened++
    if (r.first_clicked_at) s.clicked++
    if (r.responded_at) s.replied++
    stats.set(r.campaign_id, s)
  }

  type Row = { id: string; name: string; subject: string; status: string; created_at: string; sent_at: string | null }
  const rows = (campaigns ?? []) as Row[]

  const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '—')

  const columns: ListColumnDef<Row>[] = [
    {
      key: 'name',
      label: 'Campaign',
      cell: (c) => (
        <div>
          <span className="font-medium text-sage-800">{c.name}</span>
          <p className="text-[11px] text-sage-400 mt-0.5 truncate max-w-[280px]">{c.subject}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      cell: (c) => (
        <span className={`inline-block text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${STATUS_BADGE[c.status] ?? STATUS_BADGE.draft}`}>
          {c.status}
        </span>
      ),
    },
    {
      key: 'recipients',
      label: 'Sent',
      cell: (c) => {
        const s = stats.get(c.id)
        return <span className="text-sage-600">{s ? `${s.sent}/${s.total}` : '0'}</span>
      },
    },
    {
      key: 'opens',
      label: 'Opens',
      cell: (c) => {
        const s = stats.get(c.id)
        return <span className="text-sage-600">{s ? `${s.opened} (${pct(s.opened, s.sent)})` : '—'}</span>
      },
    },
    {
      key: 'clicks',
      label: 'Clicks',
      cell: (c) => {
        const s = stats.get(c.id)
        return <span className="text-sage-600">{s ? s.clicked : '—'}</span>
      },
    },
    {
      key: 'replies',
      label: 'Replies',
      cell: (c) => {
        const s = stats.get(c.id)
        return <span className={s && s.replied > 0 ? 'text-green-700 font-semibold' : 'text-sage-600'}>{s ? s.replied : '—'}</span>
      },
    },
  ]

  return (
    <PortalListTable<Row>
      header={
        <PortalPageHeader
          title="Campaigns"
          actions={
            <Link href="/portal/campaigns/new" className={buttonClasses({ variant: 'primary' })}>
              <Plus size={16} />
              New Campaign
            </Link>
          }
        />
      }
      emptyState={
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet."
          action={
            <Link href="/portal/campaigns/new" className={buttonClasses({ variant: 'primary' })}>
              <Plus size={16} />
              Create your first campaign
            </Link>
          }
        />
      }
      rows={rows}
      columns={columns}
      rowHref={(c) => `/portal/campaigns/${c.id}`}
      rowLabel={(c) => `campaign ${c.name}`}
      mobile={{
        label: (c) => `campaign ${c.name}`,
        primary: (c) => <span className="font-medium text-sage-800">{c.name}</span>,
        secondary: (c) => c.subject,
        meta: (c) => {
          const s = stats.get(c.id)
          return (
            <>
              <span>{c.status}</span>
              <span>{s ? `${s.sent} sent · ${s.opened} opened · ${s.replied} replied` : ''}</span>
            </>
          )
        },
      }}
    />
  )
}
