import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { FileText, Plus, FileSearch, FlaskConical, Archive } from 'lucide-react'
import clsx from 'clsx'
import { StatusBadge } from '../_components/StatusBadge'
import { loadDisplaySettings, QUOTE_FIELDS } from '@/lib/portal-display-settings'
import { ListLifecycleTabs } from '../_components/ListLifecycleTabs'

function formatCurrency(dollars: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Phase 2 — sort key → Supabase order. Allowed keys constrained by
// QUOTE_FIELDS.sortable, so this is always safe.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyQuoteSort(query: any, sortBy: string, sortDirection: 'asc' | 'desc') {
  const ascending = sortDirection === 'asc'
  switch (sortBy) {
    case 'created_at':   return query.order('created_at',   { ascending })
    case 'date_issued':  return query.order('date_issued',  { ascending, nullsFirst: false })
    case 'valid_until':  return query.order('valid_until',  { ascending, nullsFirst: false })
    case 'status':       return query.order('status',       { ascending })
    case 'quote_number': return query.order('quote_number', { ascending })
    case 'total':        return query.order('created_at',   { ascending: false })
    default:             return query.order('created_at',   { ascending: false })
  }
}

// Phase 5.5.13 — quote workflow tabs. Default 'needs_action' surfaces
// the rows that need an operator's attention right now.
type QuoteTab = 'needs_action' | 'sent' | 'accepted' | 'all'
const QUOTE_TABS: readonly { value: QuoteTab; label: string }[] = [
  { value: 'needs_action', label: 'Needs action' },
  { value: 'sent',         label: 'Sent' },
  { value: 'accepted',     label: 'Accepted' },
  { value: 'all',          label: 'All' },
]
const NEEDS_ACTION_STATUSES = ['draft', 'expired'] as const

function parseTab(v: string | undefined): QuoteTab {
  return (QUOTE_TABS.find((t) => t.value === v)?.value as QuoteTab) ?? 'needs_action'
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: { tab?: string; show_archived?: string }
}) {
  const supabase = createClient()

  const display = await loadDisplaySettings(supabase)
  const quotesList = display.quotes.list
  const visible = new Set(quotesList.visibleFields)

  const activeTab    = parseTab(searchParams?.tab)
  const showArchived = searchParams?.show_archived === '1'

  // Live record rule: deleted_at IS NULL AND is_test = false.
  // Show-archived toggle disables BOTH filters so the operator can
  // see the full set when they need to.
  let query = supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      status,
      base_price,
      discount,
      date_issued,
      valid_until,
      created_at,
      service_address,
      service_category,
      version_number,
      client_reference,
      is_test,
      deleted_at,
      clients ( name, company_name ),
      quote_items ( price )
    `)
    .eq('is_latest_version', true)

  if (!showArchived) {
    query = query.is('deleted_at', null).eq('is_test', false)
  }

  if (activeTab === 'sent') {
    query = query.eq('status', 'sent')
  } else if (activeTab === 'accepted') {
    query = query.eq('status', 'accepted')
  } else if (activeTab === 'needs_action') {
    query = query.in('status', NEEDS_ACTION_STATUSES as unknown as string[])
  }
  // 'all' applies no extra status filter.

  query = applyQuoteSort(query, quotesList.sortBy, quotesList.sortDirection)

  const { data: quotes, error } = await query

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-8">Quotes</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
          Failed to load quotes: {error.message}
        </div>
      </div>
    )
  }

  const rows = (quotes ?? []).map((q) => {
    const client = q.clients as unknown as { name: string; company_name: string | null } | null
    const items = (q.quote_items ?? []) as { price: number }[]
    const addOns = items.reduce((sum, i) => sum + (i.price ?? 0), 0)
    const total = (q.base_price ?? 0) + addOns - (q.discount ?? 0)

    const versionNumber = (q.version_number as number | null) ?? 1
    const displayNumber = versionNumber > 1
      ? `${q.quote_number}-v${versionNumber}`
      : q.quote_number

    return {
      id: q.id,
      quote_number: displayNumber,
      versionNumber,
      client: client?.name ?? 'No client',
      company: client?.company_name ?? '—',
      address: q.service_address ?? null,
      status: q.status ?? 'draft',
      total,
      date_issued: q.date_issued,
      valid_until: q.valid_until,
      created_at: q.created_at,
      client_reference: q.client_reference ?? null,
      isCommercial: q.service_category === 'commercial',
      isTest: !!(q as { is_test?: boolean }).is_test,
      isArchived: !!(q as { deleted_at?: string | null }).deleted_at,
    }
  })

  // Render-time helpers
  function cell(row: typeof rows[number], key: string): React.ReactNode {
    switch (key) {
      case 'quote_number':     return (
        <span className="font-medium text-sage-800 inline-flex items-center gap-1.5">
          {row.quote_number}
          {row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-amber-800 bg-amber-100 rounded-full px-1.5 py-0.5"><FlaskConical size={9} /> Test</span>}
          {row.isArchived && !row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-sage-600 bg-sage-100 rounded-full px-1.5 py-0.5"><Archive size={9} /> Archived</span>}
        </span>
      )
      case 'client':           return row.client
      case 'company':          return row.company === '—' ? <span className="text-sage-400">—</span> : row.company
      case 'address':          return row.address ? <span className="block max-w-[200px] truncate" title={row.address}>{row.address}</span> : <span className="text-sage-400">—</span>
      case 'status':           return <StatusBadge kind="quote" status={row.status} />
      case 'total':            return <span className="font-medium text-sage-800">{formatCurrency(row.total)}</span>
      case 'date_issued':      return formatDate(row.date_issued)
      case 'valid_until':      return formatDate(row.valid_until)
      case 'created_at':       return formatDate(row.created_at)
      case 'client_reference': return row.client_reference || <span className="text-sage-400">—</span>
      default:                 return null
    }
  }

  function rawCell(row: typeof rows[number], key: string): string {
    switch (key) {
      case 'quote_number':     return row.quote_number
      case 'client':           return row.client
      case 'company':          return row.company
      case 'address':          return row.address || '—'
      case 'status':           return row.status
      case 'total':            return formatCurrency(row.total)
      case 'date_issued':      return formatDate(row.date_issued)
      case 'valid_until':      return formatDate(row.valid_until)
      case 'created_at':       return formatDate(row.created_at)
      case 'client_reference': return row.client_reference || '—'
      default:                 return ''
    }
  }

  const orderedVisible = QUOTE_FIELDS
    .filter((f) => f.contexts.includes('list') && visible.has(f.key))
    .map((f) => f.key)

  const primaryKey = quotesList.primaryField
  const secondaryKey = quotesList.secondaryField

  function alignFor(key: string): string {
    return key === 'total' ? 'text-right' : 'text-left'
  }

  // Empty-state copy depends on which tab the operator is on, so
  // they get a useful next-step instead of a generic "no quotes".
  const emptyCopy: Record<QuoteTab, { title: string; sub: string }> = {
    needs_action: { title: 'No quotes need action.', sub: 'Create a new quote or check the Sent tab to follow up.' },
    sent:         { title: 'No sent quotes awaiting response.', sub: 'Either nothing is out, or every reply is in.' },
    accepted:     { title: 'No accepted quotes.', sub: 'Accepted quotes appear here until they convert into a job.' },
    all:          { title: 'No quotes yet.', sub: 'Create the first quote to get going.' },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Quotes</h1>
        <Link
          href="/portal/quotes/new"
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
        >
          <Plus size={16} />
          New Quote
        </Link>
      </div>

      <ListLifecycleTabs
        basePath="/portal/quotes"
        tabs={QUOTE_TABS}
        activeTab={activeTab}
        showArchived={showArchived}
      />

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <FileText size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-800 font-medium mb-1">{emptyCopy[activeTab].title}</p>
          <p className="text-sage-600 text-sm mb-4">{emptyCopy[activeTab].sub}</p>
          <Link
            href="/portal/quotes/new"
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
          >
            <Plus size={16} />
            New quote
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  {orderedVisible.map((k) => (
                    <th key={k} className={`px-5 py-3 font-semibold ${alignFor(k)}`}>
                      {QUOTE_FIELDS.find((f) => f.key === k)?.label ?? k}
                    </th>
                  ))}
                  <th className="px-3 py-3 font-semibold text-right" aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={clsx('border-b border-gray-50 last:border-0 group', (row.isTest || row.isArchived) && 'opacity-60')}>
                    {orderedVisible.map((k) => (
                      <td key={k} className="p-0">
                        <Link href={`/portal/quotes/${row.id}`} className={`block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-700 ${alignFor(k)}`}>
                          {cell(row, k)}
                        </Link>
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right">
                      {row.isCommercial && (
                        <Link
                          href={`/portal/quotes/${row.id}/proposal`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View Commercial Proposal"
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-sage-500 hover:text-sage-800 hover:bg-sage-100 transition-colors"
                        >
                          <FileSearch size={15} />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-gray-100">
            {rows.map((row) => (
              <Link key={row.id} href={`/portal/quotes/${row.id}`} className={clsx('block px-4 py-4 hover:bg-gray-50 transition-colors', (row.isTest || row.isArchived) && 'opacity-60')}>
                <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                  <span className="font-medium text-sage-800 inline-flex items-center gap-1.5">
                    {rawCell(row, primaryKey)}
                    {row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-amber-800 bg-amber-100 rounded-full px-1.5 py-0.5"><FlaskConical size={9} /> Test</span>}
                    {row.isArchived && !row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-sage-600 bg-sage-100 rounded-full px-1.5 py-0.5"><Archive size={9} /> Archived</span>}
                  </span>
                  <StatusBadge kind="quote" status={row.status} />
                </div>
                <div className="text-sage-600 text-sm">{rawCell(row, secondaryKey)}</div>
                {visible.has('address') && primaryKey !== 'address' && secondaryKey !== 'address' && row.address && (
                  <div className="text-sage-500 text-xs truncate">{row.address}</div>
                )}
                <div className="flex items-center justify-between mt-2 text-xs text-sage-500">
                  <span>{formatDate(row.date_issued)}</span>
                  <span className="font-medium text-sage-800 text-sm">{formatCurrency(row.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {quotesList.groupBy !== 'none' && (
        <p className="text-[11px] text-sage-400 mt-3 italic">
          Group-by ({quotesList.groupBy}) will be wired in the next phase. Setting persists.
        </p>
      )}
    </div>
  )
}
