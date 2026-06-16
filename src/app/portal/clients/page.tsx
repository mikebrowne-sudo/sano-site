import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { Users, Plus, Archive, ListChecks } from 'lucide-react'
import { ClientSearch } from './_components/ClientSearch'
import { PortalPageHeader } from '../_components/PortalPageHeader'
import { buttonClasses } from '../_components/Button'
import { EmptyState } from '../_components/EmptyState'
import { PortalListTable, type ListColumnDef } from '../_components/PortalListTable'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string; archived?: string }
}) {
  const supabase = createClient()
  const q = searchParams.q?.trim() ?? ''
  // Phase 5.5.10 — archived clients are hidden by default. Toggle via
  // ?archived=1 on the list URL.
  const showArchived = searchParams.archived === '1'

  let query = supabase
    .from('clients')
    .select('id, name, company_name, phone, email, is_archived')
    .order('name')

  if (!showArchived) {
    query = query.eq('is_archived', false)
  }
  if (q) {
    query = query.ilike('name', `%${q}%`)
  }
  // Phase 3 perf — bounded list (real pagination is a future phase).
  query = query.limit(100)

  const { data: clients, error } = await query

  // Phase 5.5.10 — flag rows that share an email or phone (case-insensitive
  // for email, normalised digits for phone). Lightweight client-side pass
  // — at 23 rows today this is cheap, and the cleanup dashboard handles
  // the heavy detection.
  const dupKeys = new Map<string, number>()
  function bump(k: string) { dupKeys.set(k, (dupKeys.get(k) ?? 0) + 1) }
  for (const c of (clients ?? []) as { email: string | null; phone: string | null }[]) {
    if (c.email && c.email.trim()) bump('e:' + c.email.trim().toLowerCase())
    const digits = (c.phone ?? '').replace(/\D+/g, '')
    if (digits.length >= 6) bump('p:' + digits)
  }
  function isDupe(c: { email: string | null; phone: string | null }) {
    if (c.email && c.email.trim() && (dupKeys.get('e:' + c.email.trim().toLowerCase()) ?? 0) > 1) return true
    const digits = (c.phone ?? '').replace(/\D+/g, '')
    if (digits.length >= 6 && (dupKeys.get('p:' + digits) ?? 0) > 1) return true
    return false
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-8">Clients</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
          Failed to load clients: {error.message}
        </div>
      </div>
    )
  }

  // Phase 4B — migrate to <PortalListTable>. Row type narrows the
  // raw supabase row so the column dispatcher stays simple.
  type ClientRow = {
    id: string
    name: string
    company_name: string | null
    phone: string | null
    email: string | null
    is_archived?: boolean
  }
  const rows = (clients ?? []) as ClientRow[]

  const archivedToggleHref = showArchived
    ? `/portal/clients${q ? `?q=${encodeURIComponent(q)}` : ''}`
    : `/portal/clients?archived=1${q ? `&q=${encodeURIComponent(q)}` : ''}`

  function NameCell({ c }: { c: ClientRow }) {
    return (
      <span className="inline-flex items-center gap-2 flex-wrap">
        <span className="font-medium text-sage-800">{c.name}</span>
        {c.is_archived && (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold text-sage-600 bg-sage-100 rounded-full px-2 py-0.5">
            <Archive size={10} /> Archived
          </span>
        )}
        {isDupe(c) && (
          <span className="inline-block text-[10px] uppercase tracking-wide font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
            Possible duplicate
          </span>
        )}
      </span>
    )
  }

  const columns: ListColumnDef<ClientRow>[] = [
    { key: 'name',         label: 'Name',    cell: (c) => <NameCell c={c} /> },
    { key: 'company_name', label: 'Company', cell: (c) => <span className="text-sage-600">{c.company_name || '—'}</span> },
    { key: 'phone',        label: 'Phone',   cell: (c) => <span className="text-sage-600">{c.phone || '—'}</span> },
    { key: 'email',        label: 'Email',   cell: (c) => <span className="text-sage-600">{c.email || '—'}</span> },
  ]

  return (
    <PortalListTable<ClientRow>
      header={
        <PortalPageHeader
          title="Clients"
          actions={
            <div className="flex items-center gap-2">
              <Link href="/portal/clients/cleanup" className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors">
                <ListChecks size={16} />
                Cleanup review
              </Link>
              <Link href="/portal/clients/new" className={buttonClasses({ variant: 'primary' })}>
                <Plus size={16} />
                New Client
              </Link>
            </div>
          }
        />
      }
      filters={
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <ClientSearch defaultValue={q} />
          <Link
            href={archivedToggleHref}
            className="inline-flex items-center gap-1.5 text-xs text-sage-600 hover:text-sage-800 transition-colors"
          >
            <Archive size={12} />
            {showArchived ? 'Hide archived' : 'Show archived'}
          </Link>
        </div>
      }
      emptyState={
        <EmptyState
          icon={Users}
          title={q ? `No clients matching "${q}".` : 'No clients yet.'}
          action={!q ? (
            <Link href="/portal/clients/new" className={buttonClasses({ variant: 'primary' })}>
              <Plus size={16} />
              Add your first client
            </Link>
          ) : undefined}
        />
      }
      rows={rows}
      columns={columns}
      rowHref={(c) => `/portal/clients/${c.id}`}
      rowLabel={(c) => `client ${c.name}`}
      isDimmed={(c) => !!c.is_archived}
      mobile={{
        label: (c) => `client ${c.name}`,
        primary: (c) => (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sage-800">{c.name}</span>
            {c.is_archived && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold text-sage-600 bg-sage-100 rounded-full px-2 py-0.5">
                <Archive size={10} /> Archived
              </span>
            )}
            {isDupe(c) && (
              <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                Possible duplicate
              </span>
            )}
          </div>
        ),
        secondary: (c) => c.company_name ?? null,
        meta: (c) => (
          <>
            <span>{c.phone || ''}</span>
            <span>{c.email || ''}</span>
          </>
        ),
      }}
    />
  )
}
