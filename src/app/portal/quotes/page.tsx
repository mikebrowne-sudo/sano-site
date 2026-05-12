import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { FileText, Plus, FileSearch, FlaskConical, Archive } from 'lucide-react'
import { StatusBadge } from '../_components/StatusBadge'
import { PortalPageHeader } from '../_components/PortalPageHeader'
import { buttonClasses } from '../_components/Button'
import { EmptyState } from '../_components/EmptyState'
import { PortalListTable, type ListColumnDef } from '../_components/PortalListTable'
import { QUOTES_LIST_CONFIG, type QuoteTab } from '../_components/list-config'
import { StatusDot } from '../_components/StatusDot'
import { ListPagination, parsePageParam } from '../_components/ListPagination'
import { parsePerParam } from '../_components/rows-per-page'
import { QuoteFilters } from './_components/QuoteFilters'
import { loadDisplaySettings, QUOTE_FIELDS } from '@/lib/portal-display-settings'
import { ListLifecycleTabs } from '../_components/ListLifecycleTabs'
import { BulkSelectProvider } from '../_components/BulkSelect'
import { getQuoteAttention } from '@/lib/attention-rules'
import { getQuoteListStatus } from '@/lib/quote-status'
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

// Phase 4E — URL ?sort= override → (sortBy, sortDirection). Mirrors
// the jobs page's pattern so the QuoteFilters dropdown can drive
// sort interactively without modifying display-settings.
function urlSortToSettings(s: string | undefined): { sortBy: string; sortDirection: 'asc' | 'desc' } | null {
  if (!s) return null
  if (s === 'created_desc')      return { sortBy: 'created_at',   sortDirection: 'desc' }
  if (s === 'created_asc')       return { sortBy: 'created_at',   sortDirection: 'asc' }
  if (s === 'date_issued_desc')  return { sortBy: 'date_issued',  sortDirection: 'desc' }
  if (s === 'date_issued_asc')   return { sortBy: 'date_issued',  sortDirection: 'asc' }
  if (s === 'valid_until_asc')   return { sortBy: 'valid_until',  sortDirection: 'asc' }
  if (s === 'quote_number_asc')  return { sortBy: 'quote_number', sortDirection: 'asc' }
  if (s === 'quote_number_desc') return { sortBy: 'quote_number', sortDirection: 'desc' }
  return null
}

// Phase 5.5.14 — workflow tabs. Default 'needs_attention' uses the
// shared attention-rules logic instead of a hard status filter, so a
// row appears the moment the operator has work to do (e.g. a sent
// quote that's gone unanswered for 3+ days, an accepted quote that
// hasn't yet been turned into a job).
function parseTab(v: string | undefined): QuoteTab {
  return (QUOTES_LIST_CONFIG.tabs.find((t) => t.value === v)?.value as QuoteTab) ?? QUOTES_LIST_CONFIG.defaultTab
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: { tab?: string; show_archived?: string; page?: string; q?: string; sort?: string; per?: string }
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
  const search       = searchParams?.q?.trim() ?? ''
  // Phase 4E — URL ?sort= overrides the saved display-settings sort;
  // fall back to settings when the URL is empty.
  const activeSort = urlSortToSettings(searchParams?.sort) ?? {
    sortBy: quotesList.sortBy,
    sortDirection: quotesList.sortDirection,
  }

  // Live record rule: deleted_at IS NULL AND is_test = false.
  // Show-archived toggle disables BOTH filters so the operator can
  // see the full set when they need to.
  // Phase 3 perf — `quote_items(price)` previously embedded as an
  // array purely so the row mapper could sum it into `total`. The full
  // child rows traveled with every list payload. We now fetch a flat
  // {quote_id, price} side query alongside the linked jobs/invoices
  // batch below and roll it up into `addOnsByQuoteId`.
  // Phase 4D — pagination via .range(). Page is 1-indexed; supabase
  // is 0-indexed inclusive. count: 'exact' attaches a COUNT(*) on the
  // same filter chain so the footer can render "Showing N to M of T".
  // Phase 4E — page size sourced from URL ?per=.
  const pageNum     = parsePageParam(searchParams.page)
  const rowsPerPage = parsePerParam(searchParams.per, QUOTES_LIST_CONFIG.rowsPerPage)
  const from = (pageNum - 1) * rowsPerPage
  const to   = from + rowsPerPage - 1

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
    `, { count: 'exact' })
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

  // Phase 4E — search across quote_number / service_address /
  // client_reference, and fold a side-query against clients for name /
  // company matches. Same pattern as the invoices page.
  if (search) {
    const { data: clientMatches } = await supabase
      .from('clients')
      .select('id')
      .or(`name.ilike.%${search}%,company_name.ilike.%${search}%`)
      .limit(50)
    const clientIds = (clientMatches ?? []).map((c) => c.id as string)
    const orClauses = [
      `quote_number.ilike.%${search}%`,
      `service_address.ilike.%${search}%`,
      `client_reference.ilike.%${search}%`,
    ]
    if (clientIds.length > 0) orClauses.push(`client_id.in.(${clientIds.join(',')})`)
    query = query.or(orClauses.join(','))
  }

  query = applyQuoteSort(query, activeSort.sortBy, activeSort.sortDirection)
  // Phase 4D — range supersedes .limit() now that pagination is real.
  query = query.range(from, to)

  const { data: quotes, count, error } = await query

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

    // Phase 4D — list-facing display status carries the operator's
    // next-step semantics ("Follow up" / "Expired"). Stored status
    // unchanged; this is purely the chip label.
    const displayStatus = getQuoteListStatus({
      status: q.status,
      date_issued: q.date_issued as string | null,
      valid_until: q.valid_until as string | null,
      created_at: q.created_at as string | null,
    })

    return {
      id: q.id,
      quote_number: displayNumber,
      versionNumber,
      client: client?.name ?? 'No client',
      company: client?.company_name ?? '—',
      address: q.service_address ?? null,
      status: q.status ?? 'draft',
      displayStatus,
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
        <span className="font-medium text-sage-800 inline-flex items-center gap-1.5 whitespace-nowrap">
          {row.quote_number}
          {row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-amber-800 bg-amber-100 rounded-full px-1.5 py-0.5"><FlaskConical size={9} /> Test</span>}
          {row.isArchived && !row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-sage-600 bg-sage-100 rounded-full px-1.5 py-0.5"><Archive size={9} /> Archived</span>}
        </span>
      )
      case 'client':           return <span className="block max-w-[200px] truncate" title={row.client}>{row.client}</span>
      case 'company':          return row.company === '—' ? <span className="text-sage-400">—</span> : <span className="block max-w-[180px] truncate" title={row.company}>{row.company}</span>
      case 'address':          return row.address ? <span className="block max-w-[220px] truncate" title={row.address}>{row.address}</span> : <span className="text-sage-400">—</span>
      // Phase 4D — pill carries the enriched displayStatus (follow_up,
      // expired) computed by getQuoteListStatus above.
      case 'status':           return <StatusBadge kind="quote" status={row.displayStatus} />
      case 'total':            return <span className="font-medium text-sage-800 whitespace-nowrap tabular-nums">{formatCurrency(row.total)}</span>
      case 'date_issued':      return <span className="whitespace-nowrap">{formatDate(row.date_issued)}</span>
      case 'valid_until':      return <span className="whitespace-nowrap">{formatDate(row.valid_until)}</span>
      case 'created_at':       return <span className="whitespace-nowrap">{formatDate(row.created_at)}</span>
      case 'client_reference': return row.client_reference || <span className="text-sage-400">—</span>
      // Phase 5A — linked records render as plain inline text in their
      // OWN columns (not as a stacked sub-line under the first column).
      // Strict single-line, dot separator for the linked record's
      // status. The row's wrapping Link opens THIS quote; from there
      // operators can click through to the linked job / invoice.
      case 'linked_job':
        if (row.linkedJob && row.linkedJob.job_number) {
          return (
            <span className="whitespace-nowrap text-sage-700">
              {row.linkedJob.job_number}
              {row.linkedJob.status && <span className="text-sage-500"> · {row.linkedJob.status.replace('_', ' ')}</span>}
            </span>
          )
        }
        return <span className="text-sage-400">—</span>
      case 'linked_invoice':
        if (row.linkedInvoice && row.linkedInvoice.invoice_number) {
          return (
            <span className="whitespace-nowrap text-sage-700">
              {row.linkedInvoice.invoice_number}
              {row.linkedInvoice.status && <span className="text-sage-500"> · {row.linkedInvoice.status}</span>}
            </span>
          )
        }
        return <span className="text-sage-400">—</span>
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

  // Phase 5A — the prior <LinkedChips> sub-line that rendered Job +
  // Invoice rounded-full pills underneath the first column has been
  // removed. It was the single biggest row-height-expander on this
  // page. Linked records now render in their OWN `linked_job` /
  // `linked_invoice` columns as plain dot-separated inline text via
  // the cell() dispatcher above.
  const columns: ListColumnDef<typeof rows[number]>[] = orderedVisible.map((k) => ({
    key: k,
    label: QUOTE_FIELDS.find((f) => f.key === k)?.label ?? k,
    align: alignFor(k) === 'text-right' ? 'right' : 'left',
    cell: (row) => cell(row, k),
  }))

  return (
    <BulkSelectProvider entity="quote" ids={rows.map((r) => r.id as string)} canCleanup={canCleanup}>
      <PortalListTable<typeof rows[number]>
        header={
          <PortalPageHeader
            title={QUOTES_LIST_CONFIG.pageTitle}
            actions={QUOTES_LIST_CONFIG.actions.map((a) => {
              const Icon = a.icon
              return (
                <Link key={a.href} href={a.href} className={buttonClasses({ variant: a.variant })}>
                  <Icon size={16} />
                  {a.label}
                </Link>
              )
            })}
          />
        }
        tabs={
          <ListLifecycleTabs
            basePath="/portal/quotes"
            tabs={QUOTES_LIST_CONFIG.tabs}
            activeTab={activeTab}
            showArchived={showArchived}
            canCleanup={canCleanup}
            preservedParams={{ q: search || undefined, sort: searchParams.sort }}
          />
        }
        filters={<QuoteFilters />}
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
        statusDot={(row) => <StatusDot kind="quote" status={row.displayStatus} />}
        attention={(row) =>
          (row.attention.reasons.length > 0 || row.attention.nextStep)
            ? { reasons: row.attention.reasons, nextStep: row.attention.nextStep }
            : null
        }
        footer={
          <ListPagination
            total={activeTab === 'needs_attention' ? null : (count ?? null)}
            page={pageNum}
            rowsPerPage={rowsPerPage}
            defaultRowsPerPage={QUOTES_LIST_CONFIG.rowsPerPage}
            basePath="/portal/quotes"
            preservedParams={{
              tab: activeTab !== QUOTES_LIST_CONFIG.defaultTab ? activeTab : undefined,
              q: search || undefined,
              sort: searchParams.sort,
              per: rowsPerPage !== QUOTES_LIST_CONFIG.rowsPerPage ? rowsPerPage : undefined,
              show_archived: showArchived ? '1' : undefined,
            }}
            visibleCount={rows.length}
          />
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
              <StatusBadge kind="quote" status={row.displayStatus} />
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
