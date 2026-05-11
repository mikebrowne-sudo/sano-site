import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { FileText, Plus, FileSearch, FlaskConical, Archive } from 'lucide-react'
import { StatusBadge } from '../_components/StatusBadge'
import { PortalPageHeader } from '../_components/PortalPageHeader'
import { buttonClasses } from '../_components/Button'
import { EmptyState } from '../_components/EmptyState'
import { PortalListTable, type ListColumnDef } from '../_components/PortalListTable'
import { loadDisplaySettings, QUOTE_FIELDS } from '@/lib/portal-display-settings'
import { ListLifecycleTabs } from '../_components/ListLifecycleTabs'
import { BulkSelectProvider } from '../_components/BulkSelect'
import { getQuoteAttention } from '@/lib/attention-rules'
import { getCleanupAccess } from '@/lib/cleanup-mode'
import { formatCurrency, formatDate } from '@/lib/format'

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

// Phase 5.5.14 — workflow tabs. Default 'needs_attention' uses the
// shared attention-rules logic instead of a hard status filter, so a
// row appears the moment the operator has work to do (e.g. a sent
// quote that's gone unanswered for 3+ days, an accepted quote that
// hasn't yet been turned into a job).
type QuoteTab = 'needs_attention' | 'sent' | 'accepted' | 'all'
const QUOTE_TABS: readonly { value: QuoteTab; label: string }[] = [
  { value: 'needs_attention', label: 'Needs attention' },
  { value: 'sent',            label: 'Sent' },
  { value: 'accepted',        label: 'Accepted' },
  { value: 'all',             label: 'All' },
]

function parseTab(v: string | undefined): QuoteTab {
  return (QUOTE_TABS.find((t) => t.value === v)?.value as QuoteTab) ?? 'needs_attention'
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

  // Phase 5.5.14 — cleanup mode is the master gate for bulk actions,
  // the show-archived toggle, and per-row test/archive controls.
  // canCleanup === (admin AND cleanup-mode-enabled).
  const cleanup = await getCleanupAccess(supabase)
  const canCleanup = cleanup.canCleanup

  const activeTab    = parseTab(searchParams?.tab)
  // show_archived is ignored when cleanup mode is off — operational
  // users never see archived/test rows.
  const showArchived = canCleanup && searchParams?.show_archived === '1'

  // Live record rule: deleted_at IS NULL AND is_test = false.
  // Show-archived toggle disables BOTH filters so the operator can
  // see the full set when they need to.
  // Phase 3 perf — `quote_items(price)` previously embedded as an
  // array purely so the row mapper could sum it into `total`. The full
  // child rows traveled with every list payload. We now fetch a flat
  // {quote_id, price} side query alongside the linked jobs/invoices
  // batch below and roll it up into `addOnsByQuoteId`.
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
      clients ( name, company_name )
    `)
    .eq('is_latest_version', true)

  if (!showArchived) {
    query = query.is('deleted_at', null).eq('is_test', false)
  }

  if (activeTab === 'sent') {
    query = query.eq('status', 'sent')
  } else if (activeTab === 'accepted') {
    query = query.eq('status', 'accepted')
  } else if (activeTab === 'needs_attention') {
    // Pre-filter at the DB level — only statuses that the attention
    // rules can flag. Final per-row filter happens after we resolve
    // which accepted quotes have a job/invoice already.
    query = query.in('status', ['draft', 'sent', 'accepted'])
  }
  // 'all' applies no extra status filter.

  query = applyQuoteSort(query, quotesList.sortBy, quotesList.sortDirection)
  // Phase 3 perf — cap the list at a sane default so the query stays
  // bounded as the business grows. Real pagination (page-number or
  // cursor) is a separate phase; this limit just prevents unbounded
  // fetches today.
  query = query.limit(100)

  const { data: quotes, error } = await query

  // Phase quote-flow-clarity: pull the linked job + invoice for every
  // quote on the page (not just accepted ones), so the list can render
  // a clickable "Job · INV" badge alongside the attention chips. The
  // attention rules still need a "has a downstream record?" check —
  // that's now derived from the same map.
  const allQuoteIds = (quotes ?? []).map((q) => q.id as string)

  const [{ data: relatedJobs }, { data: relatedInvoices }, { data: relatedItems }] = allQuoteIds.length > 0
    ? await Promise.all([
        supabase
          .from('jobs')
          .select('id, quote_id, job_number, status, scheduled_date')
          .in('quote_id', allQuoteIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('invoices')
          .select('id, quote_id, invoice_number, status, due_date')
          .in('quote_id', allQuoteIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('quote_items')
          .select('quote_id, price')
          .in('quote_id', allQuoteIds),
      ])
    : [{ data: [] as Array<{ id: string; quote_id: string | null; job_number: string | null; status: string | null; scheduled_date: string | null }> },
       { data: [] as Array<{ id: string; quote_id: string | null; invoice_number: string | null; status: string | null; due_date: string | null }> },
       { data: [] as Array<{ quote_id: string | null; price: number | null }> }]

  // First-write-wins per quote_id (the order_by created_at desc on
  // the queries means the most-recent live record is the one we
  // surface — typically the operator's working copy).
  const jobByQuoteId = new Map<string, { id: string; job_number: string | null; status: string | null; scheduled_date: string | null }>()
  for (const j of (relatedJobs ?? [])) {
    if (j.quote_id && !jobByQuoteId.has(j.quote_id)) {
      jobByQuoteId.set(j.quote_id, { id: j.id, job_number: j.job_number, status: j.status, scheduled_date: j.scheduled_date })
    }
  }
  const invoiceByQuoteId = new Map<string, { id: string; invoice_number: string | null; status: string | null; due_date: string | null }>()
  for (const i of (relatedInvoices ?? [])) {
    if (i.quote_id && !invoiceByQuoteId.has(i.quote_id)) {
      invoiceByQuoteId.set(i.quote_id, { id: i.id, invoice_number: i.invoice_number, status: i.status, due_date: i.due_date })
    }
  }

  // Roll quote_items into an addOns total keyed by quote_id. Matches
  // the legacy `items.reduce(...)` semantics — null prices coerce to 0.
  const addOnsByQuoteId = new Map<string, number>()
  for (const row of (relatedItems ?? [])) {
    if (!row.quote_id) continue
    addOnsByQuoteId.set(row.quote_id, (addOnsByQuoteId.get(row.quote_id) ?? 0) + (row.price ?? 0))
  }

  // Attention-rule helpers (preserved): just boolean lookups.
  const quotesWithJob = new Set(jobByQuoteId.keys())
  const quotesWithInvoice = new Set(invoiceByQuoteId.keys())

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

  const allRows = (quotes ?? []).map((q) => {
    const client = q.clients as unknown as { name: string; company_name: string | null } | null
    const addOns = addOnsByQuoteId.get(q.id as string) ?? 0
    const total = (q.base_price ?? 0) + addOns - (q.discount ?? 0)

    const versionNumber = (q.version_number as number | null) ?? 1
    const displayNumber = versionNumber > 1
      ? `${q.quote_number}-v${versionNumber}`
      : q.quote_number

    const attention = getQuoteAttention({
      status: q.status,
      created_at: q.created_at as string | null,
      date_issued: q.date_issued as string | null,
      hasJob: quotesWithJob.has(q.id as string),
      hasInvoice: quotesWithInvoice.has(q.id as string),
    })

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
      attention,
      linkedJob: jobByQuoteId.get(q.id as string) ?? null,
      linkedInvoice: invoiceByQuoteId.get(q.id as string) ?? null,
    }
  })

  // For Needs attention tab, drop rows where the attention rules
  // didn't flag anything (e.g. a recently-sent quote inside the
  // follow-up grace period, an accepted quote that already has a job).
  const rows = activeTab === 'needs_attention'
    ? allRows.filter((r) => r.attention.needsAttention)
    : allRows

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
    needs_attention: { title: 'Nothing needs your attention right now.', sub: 'Drafts, follow-ups, and accepted-not-converted quotes will appear here.' },
    sent:            { title: 'No sent quotes awaiting response.', sub: 'Either nothing is out, or every reply is in.' },
    accepted:        { title: 'No accepted quotes.', sub: 'Accepted quotes appear here until they convert into a job.' },
    all:             { title: 'No quotes yet.', sub: 'Create the first quote to get going.' },
  }

  // Phase 4B — linked-record chips appear under the FIRST visible
  // column's cell content, after the attention chips. We bake them
  // into a helper that the column-0 cell renders alongside its value.
  function LinkedChips({ row }: { row: typeof rows[number] }) {
    if (!row.linkedJob && !row.linkedInvoice) return null
    return (
      <div className="mt-1.5 inline-flex flex-wrap gap-1.5 text-[11px] text-sage-600">
        {row.linkedJob && (
          <span className="inline-flex items-center gap-1 bg-sage-50 border border-sage-100 rounded-full px-2 py-0.5">
            <span className="font-medium text-sage-800">Job {row.linkedJob.job_number ?? '—'}</span>
            {row.linkedJob.status && <span className="text-sage-500">· {row.linkedJob.status.replace('_', ' ')}</span>}
          </span>
        )}
        {row.linkedInvoice && (
          <span className="inline-flex items-center gap-1 bg-sage-50 border border-sage-100 rounded-full px-2 py-0.5">
            <span className="font-medium text-sage-800">Invoice {row.linkedInvoice.invoice_number ?? '—'}</span>
            {row.linkedInvoice.status && <span className="text-sage-500">· {row.linkedInvoice.status}</span>}
          </span>
        )}
      </div>
    )
  }

  const columns: ListColumnDef<typeof rows[number]>[] = orderedVisible.map((k, idx) => ({
    key: k,
    label: QUOTE_FIELDS.find((f) => f.key === k)?.label ?? k,
    align: alignFor(k) === 'text-right' ? 'right' : 'left',
    cell: (row) => idx === 0
      ? <>{cell(row, k)}<LinkedChips row={row} /></>
      : cell(row, k),
  }))

  return (
    <BulkSelectProvider entity="quote" ids={rows.map((r) => r.id as string)} canCleanup={canCleanup}>
      <PortalListTable<typeof rows[number]>
        header={
          <PortalPageHeader
            title="Quotes"
            actions={
              <Link href="/portal/quotes/new" className={buttonClasses({ variant: 'primary' })}>
                <Plus size={16} />
                New Quote
              </Link>
            }
          />
        }
        tabs={
          <ListLifecycleTabs
            basePath="/portal/quotes"
            tabs={QUOTE_TABS}
            activeTab={activeTab}
            showArchived={showArchived}
            canCleanup={canCleanup}
          />
        }
        emptyState={
          <EmptyState
            icon={FileText}
            title={emptyCopy[activeTab].title}
            description={emptyCopy[activeTab].sub}
            action={
              <Link href="/portal/quotes/new" className={buttonClasses({ variant: 'primary' })}>
                <Plus size={16} />
                New quote
              </Link>
            }
          />
        }
        rows={rows}
        columns={columns}
        bulkSelect={{ canCleanup }}
        rowHref={(row) => `/portal/quotes/${row.id}`}
        rowLabel={(row) => `quote ${row.quote_number}`}
        isDimmed={(row) => row.isTest || row.isArchived}
        attention={(row) =>
          (row.attention.reasons.length > 0 || row.attention.nextStep)
            ? { reasons: row.attention.reasons, nextStep: row.attention.nextStep }
            : null
        }
        rowExtraActions={(row) => row.isCommercial ? (
          <Link
            href={`/portal/quotes/${row.id}/proposal`}
            target="_blank"
            rel="noopener noreferrer"
            title="View Commercial Proposal"
            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-sage-500 hover:text-sage-800 hover:bg-sage-100 transition-colors"
          >
            <FileSearch size={15} />
          </Link>
        ) : null}
        mobile={{
          label: (row) => `quote ${row.quote_number}`,
          primary: (row) => (
            <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
              <span className="font-medium text-sage-800 inline-flex items-center gap-1.5">
                {rawCell(row, primaryKey)}
                {row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-amber-800 bg-amber-100 rounded-full px-1.5 py-0.5"><FlaskConical size={9} /> Test</span>}
                {row.isArchived && !row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-sage-600 bg-sage-100 rounded-full px-1.5 py-0.5"><Archive size={9} /> Archived</span>}
              </span>
              <StatusBadge kind="quote" status={row.status} />
            </div>
          ),
          secondary: (row) => rawCell(row, secondaryKey),
          extra: (row) => (
            <>
              {visible.has('address') && primaryKey !== 'address' && secondaryKey !== 'address' && row.address && (
                <div className="text-sage-500 text-xs truncate">{row.address}</div>
              )}
            </>
          ),
          meta: (row) => (
            <>
              <span>{formatDate(row.date_issued)}</span>
              <span className="font-medium text-sage-800 text-sm">{formatCurrency(row.total)}</span>
            </>
          ),
        }}
      />
      {quotesList.groupBy !== 'none' && (
        <p className="text-[11px] text-sage-400 mt-3 italic">
          Group-by ({quotesList.groupBy}) will be wired in the next phase. Setting persists.
        </p>
      )}
    </BulkSelectProvider>
  )
}
