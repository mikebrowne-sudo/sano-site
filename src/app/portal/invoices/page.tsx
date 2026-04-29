import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { Receipt, FlaskConical, Archive } from 'lucide-react'
import { StatusBadge } from '../_components/StatusBadge'
import { computeInvoiceDisplayStatus } from '@/lib/quote-status'
import { ListLifecycleTabs } from '../_components/ListLifecycleTabs'
import { BulkSelectProvider } from '../_components/BulkSelect'
import { PortalListTable, type ListColumnDef } from '../_components/PortalListTable'
import { getInvoiceAttention } from '@/lib/attention-rules'
import { getCleanupAccess } from '@/lib/cleanup-mode'
import { loadDisplaySettings, INVOICE_FIELDS } from '@/lib/portal-display-settings'
import { InvoiceFilters } from './_components/InvoiceFilters'

function fmt(dollars: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Phase 5.5.14 — finance-focused invoice tabs.
type InvoiceTab = 'needs_attention' | 'outstanding' | 'paid' | 'draft' | 'all'
const INVOICE_TABS: readonly { value: InvoiceTab; label: string }[] = [
  { value: 'needs_attention', label: 'Needs attention' },
  { value: 'outstanding',     label: 'Outstanding' },
  { value: 'paid',            label: 'Paid' },
  { value: 'draft',           label: 'Draft' },
  { value: 'all',             label: 'All' },
]
function parseInvoiceTab(v: string | undefined): InvoiceTab {
  return (INVOICE_TABS.find((t) => t.value === v)?.value as InvoiceTab) ?? 'needs_attention'
}

// Phase list-view-uxp-1 — sort key → Supabase order. Allowed keys
// constrained by the SORT_OPTIONS in InvoiceFilters; anything else
// falls through to the registry default.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyInvoiceSort(query: any, sortKey: string | undefined) {
  switch (sortKey) {
    case 'created_asc':   return query.order('created_at',  { ascending: true })
    case 'due_asc':       return query.order('due_date',    { ascending: true,  nullsFirst: false })
    case 'due_desc':      return query.order('due_date',    { ascending: false, nullsFirst: false })
    case 'issued_desc':   return query.order('date_issued', { ascending: false, nullsFirst: false })
    case 'invoice_asc':   return query.order('invoice_number', { ascending: true })
    case 'invoice_desc':  return query.order('invoice_number', { ascending: false })
    case 'created_desc':
    default:              return query.order('created_at',  { ascending: false })
  }
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { tab?: string; show_archived?: string; q?: string; sort?: string }
}) {
  const supabase = createClient()

  // Phase 5.5.14 — cleanup-mode gate.
  const cleanup = await getCleanupAccess(supabase)
  const canCleanup = cleanup.canCleanup
  const activeTab    = parseInvoiceTab(searchParams?.tab)
  const showArchived = canCleanup && searchParams?.show_archived === '1'
  const search       = searchParams?.q?.trim() ?? ''
  const sort         = searchParams?.sort ?? undefined

  // Phase list-view-uxp-1 — display settings drive column visibility,
  // mobile primary/secondary fields, and the default sort.
  const display = await loadDisplaySettings(supabase)
  const invoicesList = display.invoices.list
  const visible = new Set(invoicesList.visibleFields)

  // Phase list-view-uxp-1 — embed source quote + source job so the
  // list can render clickable linked-record chips. Aliases pin the
  // FK direction (quotes!quote_id, jobs!job_id) so PostgREST picks
  // the right relationship.
  let query = supabase
    .from('invoices')
    .select(`
      id, invoice_number, status, base_price, discount,
      service_address, payment_type, client_reference,
      date_issued, due_date, created_at,
      is_test, deleted_at,
      clients ( name, company_name ),
      invoice_items ( price ),
      source_quote:quotes!quote_id ( id, quote_number ),
      source_job:jobs!job_id ( id, job_number, status )
    `)

  if (!showArchived) {
    query = query.is('deleted_at', null).eq('is_test', false)
  }

  if (activeTab === 'outstanding') {
    query = query.in('status', ['sent'])
  } else if (activeTab === 'paid') {
    query = query.eq('status', 'paid')
  } else if (activeTab === 'draft') {
    query = query.eq('status', 'draft')
  } else if (activeTab === 'needs_attention') {
    query = query.in('status', ['draft', 'sent'])
  }

  if (search) {
    // Phase 1 follow-up: side-queries resolve matching client / quote
    // / job IDs first, then fold them into the OR clause. This is
    // the same pattern the Jobs search uses for quote-number matches.
    // Without it, the previous narrower OR (invoice_number /
    // service_address / client_reference) dropped rows whose only
    // match was on the embedded clients table — e.g. searching "Ghe"
    // wouldn't find an invoice for "Ghee Cariappa".
    const [{ data: clientMatches }, { data: quoteMatches }, { data: jobMatches }] = await Promise.all([
      supabase
        .from('clients')
        .select('id')
        .or(`name.ilike.%${search}%,company_name.ilike.%${search}%`)
        .limit(50),
      supabase
        .from('quotes')
        .select('id')
        .ilike('quote_number', `%${search}%`)
        .limit(50),
      supabase
        .from('jobs')
        .select('id')
        .ilike('job_number', `%${search}%`)
        .limit(50),
    ])

    const clientIds = (clientMatches ?? []).map((c) => c.id as string)
    const quoteIds  = (quoteMatches  ?? []).map((q) => q.id as string)
    const jobIds    = (jobMatches    ?? []).map((j) => j.id as string)

    const orClauses = [
      `invoice_number.ilike.%${search}%`,
      `service_address.ilike.%${search}%`,
      `client_reference.ilike.%${search}%`,
    ]
    if (clientIds.length > 0) orClauses.push(`client_id.in.(${clientIds.join(',')})`)
    if (quoteIds.length > 0)  orClauses.push(`quote_id.in.(${quoteIds.join(',')})`)
    if (jobIds.length > 0)    orClauses.push(`job_id.in.(${jobIds.join(',')})`)

    query = query.or(orClauses.join(','))
  }

  query = applyInvoiceSort(query, sort)

  const { data: invoices, error } = await query

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-8">Invoices</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
          Failed to load invoices: {error.message}
        </div>
      </div>
    )
  }

  const allRows = (invoices ?? []).map((inv) => {
    const client = inv.clients as unknown as { name: string; company_name: string | null } | null
    const items = (inv.invoice_items ?? []) as { price: number }[]
    const addOns = items.reduce((sum, i) => sum + (i.price ?? 0), 0)
    const total = (inv.base_price ?? 0) + addOns - (inv.discount ?? 0)

    // PostgREST returns embedded relations as arrays unless the FK
    // is declared 1:1 — pick element [0] for both. Same defensive
    // pattern as the jobs list.
    const sourceQuoteRaw = (inv as unknown as { source_quote?: Array<{ id: string; quote_number: string | null }> | { id: string; quote_number: string | null } | null }).source_quote ?? null
    const sourceQuote = Array.isArray(sourceQuoteRaw) ? sourceQuoteRaw[0] ?? null : sourceQuoteRaw
    const sourceJobRaw = (inv as unknown as { source_job?: Array<{ id: string; job_number: string | null; status: string | null }> | { id: string; job_number: string | null; status: string | null } | null }).source_job ?? null
    const sourceJob = Array.isArray(sourceJobRaw) ? sourceJobRaw[0] ?? null : sourceJobRaw

    const attention = getInvoiceAttention({
      status: inv.status,
      due_date: inv.due_date as string | null,
      created_at: inv.created_at as string | null,
      date_issued: inv.date_issued as string | null,
    })

    return {
      id: inv.id as string,
      invoiceNumber: (inv.invoice_number as string | null) ?? '—',
      clientName: client?.name ?? 'No client',
      companyName: client?.company_name ?? '—',
      address: (inv.service_address as string | null) ?? '',
      clientReference: (inv.client_reference as string | null) ?? null,
      status: computeInvoiceDisplayStatus(inv.status, inv.due_date),
      rawStatus: inv.status as string | null,
      dateIssued: (inv.date_issued as string | null) ?? null,
      dueDate: (inv.due_date as string | null) ?? null,
      createdAt: (inv.created_at as string | null) ?? null,
      total,
      isTest: !!(inv as { is_test?: boolean }).is_test,
      isArchived: !!(inv as { deleted_at?: string | null }).deleted_at,
      attention,
      // Linked records (chips render when these are non-null).
      linkedQuoteId: sourceQuote?.id ?? null,
      linkedQuoteNumber: sourceQuote?.quote_number ?? null,
      linkedJobId: sourceJob?.id ?? null,
      linkedJobNumber: sourceJob?.job_number ?? null,
      linkedJobStatus: sourceJob?.status ?? null,
    }
  })

  // Phase 1 follow-up — the post-fetch client-name filter is no longer
  // needed: the DB query above pre-resolves matching client / quote /
  // job IDs and folds them into the OR clause, so any row that should
  // match has already arrived.
  const rows = activeTab === 'needs_attention'
    ? allRows.filter((r) => r.attention.needsAttention)
    : allRows

  const emptyCopy: Record<InvoiceTab, { title: string; sub: string }> = {
    needs_attention: { title: 'Nothing needs your attention right now.', sub: 'Drafts, overdue, and outstanding invoices surface here.' },
    outstanding:     { title: 'No outstanding invoices.', sub: 'Paid invoices can be viewed under Paid.' },
    paid:            { title: 'No paid invoices yet.', sub: '' },
    draft:           { title: 'No draft invoices.', sub: 'Drafts appear here until they’re sent.' },
    all:             { title: 'No invoices yet.', sub: 'Convert a quote to create the first one.' },
  }

  // Resolve the ordered visible-fields list against the registry so
  // columns render in a predictable order regardless of save order.
  const orderedVisible = INVOICE_FIELDS
    .filter((f) => f.contexts.includes('list') && visible.has(f.key))
    .map((f) => f.key)

  const primaryKey = invoicesList.primaryField
  const secondaryKey = invoicesList.secondaryField

  function alignFor(key: string): string {
    return key === 'total' ? 'text-right' : 'text-left'
  }

  // Render-time helper: each cell returns its inner content for the
  // chosen field. Phase list-view-uxp-1 — cells are no longer wrapped
  // in a row-spanning <Link>; instead, the invoice number cell is
  // its own clickable link, linked records carry their own anchors,
  // and a final "Open →" cell handles the row-action affordance.
  // eslint-disable-next-line react/display-name
  function cell(row: typeof rows[number], key: string): React.ReactNode {
    switch (key) {
      case 'invoice_number':
        return (
          <Link
            href={`/portal/invoices/${row.id}`}
            className="font-medium text-sage-800 hover:underline inline-flex items-center gap-1.5"
          >
            {row.invoiceNumber}
            {row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-amber-800 bg-amber-100 rounded-full px-1.5 py-0.5"><FlaskConical size={9} /> Test</span>}
            {row.isArchived && !row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-sage-600 bg-sage-100 rounded-full px-1.5 py-0.5"><Archive size={9} /> Archived</span>}
          </Link>
        )
      case 'client':           return row.clientName
      case 'company':          return row.companyName === '—' ? <span className="text-sage-400">—</span> : row.companyName
      case 'address':          return row.address ? <span className="block max-w-[220px] truncate" title={row.address}>{row.address}</span> : <span className="text-sage-400">—</span>
      case 'status':           return <StatusBadge kind="invoice" status={row.status} />
      case 'total':            return <span className="font-medium text-sage-800">{fmt(row.total)}</span>
      case 'date_issued':      return <span className="text-sage-600">{fmtDate(row.dateIssued)}</span>
      case 'due_date':         return <span className="text-sage-600">{fmtDate(row.dueDate)}</span>
      case 'created_at':       return <span className="text-sage-600">{fmtDate(row.createdAt)}</span>
      case 'linked_quote':
        if (row.linkedQuoteId && row.linkedQuoteNumber) {
          return (
            <Link
              href={`/portal/quotes/${row.linkedQuoteId}`}
              className="inline-flex items-center gap-1 bg-sage-50 border border-sage-100 hover:border-sage-200 hover:bg-sage-100 transition-colors rounded-full px-2 py-0.5 text-[12px] text-sage-700"
            >
              <span className="font-medium">{row.linkedQuoteNumber}</span>
            </Link>
          )
        }
        return <span className="text-sage-400 text-[12px]">No quote</span>
      case 'linked_job':
        if (row.linkedJobId && row.linkedJobNumber) {
          return (
            <Link
              href={`/portal/jobs/${row.linkedJobId}`}
              className="inline-flex items-center gap-1 bg-sage-50 border border-sage-100 hover:border-sage-200 hover:bg-sage-100 transition-colors rounded-full px-2 py-0.5 text-[12px] text-sage-700"
            >
              <span className="font-medium">{row.linkedJobNumber}</span>
              {row.linkedJobStatus && <span className="text-sage-500">· {row.linkedJobStatus.replace('_', ' ')}</span>}
            </Link>
          )
        }
        return <span className="text-sage-400 text-[12px]">Not created</span>
      default:                 return null
    }
  }

  // Mobile card renders primary + secondary directly. We don't
  // hyperlink the primary inside the card — the whole card is a link
  // (preserves single-tap target on small screens).
  function rawCell(row: typeof rows[number], key: string): string {
    switch (key) {
      case 'invoice_number':   return row.invoiceNumber
      case 'client':           return row.clientName
      case 'company':          return row.companyName
      case 'address':          return row.address || '—'
      case 'status':           return row.status
      case 'total':            return fmt(row.total)
      case 'date_issued':      return fmtDate(row.dateIssued)
      case 'due_date':         return fmtDate(row.dueDate)
      case 'created_at':       return fmtDate(row.createdAt)
      default:                 return ''
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Invoices</h1>
      </div>

      <ListLifecycleTabs
        basePath="/portal/invoices"
        tabs={INVOICE_TABS}
        activeTab={activeTab}
        showArchived={showArchived}
        canCleanup={canCleanup}
        preservedParams={{ q: search || undefined, sort: sort || undefined }}
      />

      <InvoiceFilters />

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <Receipt size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-800 font-medium mb-1">{emptyCopy[activeTab].title}</p>
          {emptyCopy[activeTab].sub && (
            <p className="text-sage-600 text-sm mb-4">{emptyCopy[activeTab].sub}</p>
          )}
          <Link
            href="/portal/quotes"
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors mt-2"
          >
            View quotes
          </Link>
        </div>
      ) : (
        <BulkSelectProvider entity="invoice" ids={rows.map((r) => r.id as string)} canCleanup={canCleanup}>
          <PortalListTable<typeof rows[number]>
            rows={rows}
            columns={orderedVisible.map<ListColumnDef<typeof rows[number]>>((k) => ({
              key: k,
              label: INVOICE_FIELDS.find((f) => f.key === k)?.label ?? k,
              align: alignFor(k) === 'text-right' ? 'right' : 'left',
              cell: (row) => cell(row, k),
            }))}
            bulkSelect={{ canCleanup }}
            rowHref={(row) => `/portal/invoices/${row.id}`}
            rowLabel={(row) => `invoice ${row.invoiceNumber}`}
            isDimmed={(row) => row.isTest || row.isArchived}
            attention={(row) =>
              (row.attention.reasons.length > 0 || row.attention.nextStep)
                ? { reasons: row.attention.reasons, nextStep: row.attention.nextStep }
                : null
            }
            mobile={{
              label: (row) => `invoice ${row.invoiceNumber}`,
              primary: (row) => (
                <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                  <span className="font-medium text-sage-800 inline-flex items-center gap-1.5">
                    {rawCell(row, primaryKey)}
                    {row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-amber-800 bg-amber-100 rounded-full px-1.5 py-0.5"><FlaskConical size={9} /> Test</span>}
                    {row.isArchived && !row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-sage-600 bg-sage-100 rounded-full px-1.5 py-0.5"><Archive size={9} /> Archived</span>}
                  </span>
                  <StatusBadge kind="invoice" status={row.status} />
                </div>
              ),
              secondary: (row) => rawCell(row, secondaryKey),
              extra: (row) =>
                (row.linkedQuoteNumber || row.linkedJobNumber)
                  ? (
                    <div className="text-[11px] text-sage-500 mt-1">
                      {row.linkedQuoteNumber && <>From <span className="font-medium text-sage-700">{row.linkedQuoteNumber}</span></>}
                      {row.linkedQuoteNumber && row.linkedJobNumber && <span> · </span>}
                      {row.linkedJobNumber && <>Job <span className="font-medium text-sage-700">{row.linkedJobNumber}</span></>}
                    </div>
                  )
                  : null,
              meta: (row) => (
                <>
                  <span>{fmtDate(row.dateIssued)}</span>
                  <span className="font-medium text-sage-800 text-sm">{fmt(row.total)}</span>
                </>
              ),
            }}
          />
        </BulkSelectProvider>
      )}
    </div>
  )
}
