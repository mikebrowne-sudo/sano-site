import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { Briefcase, Plus, FlaskConical, Archive } from 'lucide-react'
import { JobFilters } from './_components/JobFilters'
import { StatusBadge } from '../_components/StatusBadge'
import { loadDisplaySettings, JOB_FIELDS } from '@/lib/portal-display-settings'
import { ListLifecycleTabs } from '../_components/ListLifecycleTabs'
import { BulkSelectProvider } from '../_components/BulkSelect'
import { PortalListTable, type ListColumnDef } from '../_components/PortalListTable'
import { PortalPageHeader } from '../_components/PortalPageHeader'
import { buttonClasses } from '../_components/Button'
import { EmptyState } from '../_components/EmptyState'
import { JOBS_LIST_CONFIG, type JobTab } from '../_components/list-config'
import { StatusDot } from '../_components/StatusDot'
import { ListPagination, parsePageParam } from '../_components/ListPagination'
import { parsePerParam } from '../_components/rows-per-page'
import { getJobAttention } from '@/lib/attention-rules'
import { getJobStatus } from '@/lib/job-status'
import { getCleanupAccess } from '@/lib/cleanup-mode'
import { isAdminUser } from '@/lib/is-admin'

// Phase 4C — tabs sourced from list-config. Parser stays here so the
// URL `?tab=` query coerces against the same allowed set.
function parseJobTab(v: string | undefined): JobTab {
  return (JOBS_LIST_CONFIG.tabs.find((t) => t.value === v)?.value as JobTab) ?? JOBS_LIST_CONFIG.defaultTab
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtCurrency(dollars: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function tomorrowStr() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

// Phase 2 — map a settings sortBy + sortDirection onto a Supabase
// query. Allowed sort keys are constrained by JOB_FIELDS.sortable so
// this is always safe. Param typed as `any` because Supabase's chained
// builder types switch shape after .select() — not worth pulling the
// generics through here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyJobSort(query: any, sortBy: string, sortDirection: 'asc' | 'desc') {
  const ascending = sortDirection === 'asc'
  switch (sortBy) {
    case 'scheduled_date': return query.order('scheduled_date', { ascending, nullsFirst: false })
    case 'status':         return query.order('status',         { ascending })
    case 'job_number':     return query.order('job_number',     { ascending })
    // Phase list-view-uxp-2 PR-B: sort by Value (job_price). Null
    // prices sink so unpriced jobs don't push priced ones off-screen.
    case 'value':          return query.order('job_price',      { ascending, nullsFirst: false })
    default:               return query.order('scheduled_date', { ascending: true, nullsFirst: false })
  }
}

// URL `?sort=` overrides settings — operator can re-sort interactively
// without losing the saved default.
function urlSortToSettings(s: string | undefined): { sortBy: string; sortDirection: 'asc' | 'desc' } | null {
  if (!s) return null
  if (s === 'scheduled_asc')  return { sortBy: 'scheduled_date', sortDirection: 'asc' }
  if (s === 'scheduled_desc') return { sortBy: 'scheduled_date', sortDirection: 'desc' }
  if (s === 'created_desc')   return { sortBy: 'job_number',     sortDirection: 'desc' }
  if (s === 'created_asc')    return { sortBy: 'job_number',     sortDirection: 'asc' }
  return null
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { view?: string; contractor?: string; sort?: string; q?: string; tab?: string; show_archived?: string; page?: string; per?: string }
}) {
  const supabase = createClient()

  const view = searchParams.view ?? ''
  const contractorFilter = searchParams.contractor ?? ''
  const search = searchParams.q?.trim() ?? ''
  // Perf — cleanup gate + display settings are independent reads, so run
  // them concurrently (round-trips overlap instead of stacking). cleanup
  // mode still gates the show-archived toggle and the bulk-select UI
  // (canCleanup === admin AND cleanup-mode-enabled).
  const [cleanup, display] = await Promise.all([
    getCleanupAccess(supabase),
    loadDisplaySettings(supabase),
  ])
  const canCleanup = cleanup.canCleanup
  const activeTab    = parseJobTab(searchParams.tab)
  const showArchived = canCleanup && searchParams.show_archived === '1'

  const today = todayStr()
  const tomorrow = tomorrowStr()

  // Phase 2 — resolve the active sort from (URL override → settings →
  // fallback default).
  const jobsList = display.jobs.list
  const activeSort = urlSortToSettings(searchParams.sort) ?? {
    sortBy: jobsList.sortBy,
    sortDirection: jobsList.sortDirection,
  }
  const visible = new Set(jobsList.visibleFields)

  // Build query — keep the same select shape so the underlying data
  // never changes. Settings only controls which columns we render.
  // Phase D.2 — exclude soft-deleted rows from every jobs query so
  // archived jobs never appear in any list or count.
  // Phase quote-flow-clarity: join the source quote + linked invoice
  // so the list can render "From QUO-XXXX" and "Invoice INV-XXXX"
  // badges per row. The aliases (quotes:quote_id / invoices:invoice_id)
  // pin the FK direction so PostgREST resolves the right relationship.
  // Phase list-view-uxp-2 PR-B: select job_price so the new Value
  // column has data to render. Embedded source_quote / linked_invoice
  // also extended with the foreign-key id so the linked-record chips
  // can navigate straight to the right detail page.
  // Phase 4D — pagination via .range(). Page is 1-indexed in URL;
  // supabase range is 0-indexed inclusive. count: 'exact' adds a
  // separate COUNT(*) on the same WHERE chain so the footer can
  // render "Showing N to M of T". Cheap at 100-row caps; we'd revisit
  // if the cap ever grows past a few thousand.
  // Phase 4E — page size now sourced from URL ?per= (validated
  // against the allowed [25, 50, 100] set), defaulting to the
  // config value when missing.
  const pageNum     = parsePageParam(searchParams.page)
  const rowsPerPage = parsePerParam(searchParams.per, JOBS_LIST_CONFIG.rowsPerPage)
  const from = (pageNum - 1) * rowsPerPage
  const to   = from + rowsPerPage - 1

  let query = supabase
    .from('jobs')
    .select('id, job_number, title, address, status, scheduled_date, scheduled_time, assigned_to, contractor_id, quote_id, invoice_id, job_price, completed_at, started_at, created_at, is_test, deleted_at, clients ( name, company_name ), source_quote:quotes!quote_id ( id, quote_number ), linked_invoice:invoices!invoice_id ( id, invoice_number, status )', { count: 'exact' })

  // Live record rule: deleted_at IS NULL AND is_test = false unless
  // the operator has explicitly enabled show-archived/test.
  if (!showArchived) {
    query = query.is('deleted_at', null).eq('is_test', false)
  }

  if (view === 'today') query = query.eq('scheduled_date', today)
  else if (view === 'tomorrow') query = query.eq('scheduled_date', tomorrow)

  // Phase 5.5.14 — lifecycle tab applies on top of `view` (date filter)
  // and `contractor` so the URL can carry all three. Tab semantics:
  //   needs_attention  = pre-filter to non-invoiced, then the per-row
  //                      attention rules decide what stays.
  //   needs_scheduling = no scheduled_date OR no contractor_id, AND
  //                      status is draft/assigned (not yet active)
  //   scheduled        = scheduled_date >= today AND assigned
  //   in_progress      = status='in_progress'
  //   completed        = status='completed'
  // Invoiced is excluded from every operational tab (Part 6).
  if (activeTab === 'needs_scheduling') {
    query = query.or(`scheduled_date.is.null,contractor_id.is.null`).in('status', ['draft', 'assigned'])
  } else if (activeTab === 'scheduled') {
    query = query.gte('scheduled_date', today).not('contractor_id', 'is', null).in('status', ['assigned', 'draft'])
  } else if (activeTab === 'in_progress') {
    query = query.eq('status', 'in_progress')
  } else if (activeTab === 'completed') {
    query = query.eq('status', 'completed')
  } else if (activeTab === 'needs_attention') {
    query = query.in('status', ['draft', 'assigned', 'in_progress', 'completed'])
  }

  if (contractorFilter) query = query.eq('contractor_id', contractorFilter)

  if (search) {
    // Phase quote-flow-clarity: extend search to include the source
    // quote's quote_number. PostgREST's `or` clause can't filter on
    // an embedded relation, so we do a side-query for matching quote
    // IDs first, then fold them into the main OR. Empty result → no
    // ids appended (the existing job-field matches still apply).
    const { data: quoteMatches } = await supabase
      .from('quotes')
      .select('id')
      .ilike('quote_number', `%${search}%`)
      .limit(50)
    const quoteIds = (quoteMatches ?? []).map((q) => q.id as string)
    const orClauses = [
      `job_number.ilike.%${search}%`,
      `title.ilike.%${search}%`,
      `address.ilike.%${search}%`,
      `assigned_to.ilike.%${search}%`,
    ]
    if (quoteIds.length > 0) {
      orClauses.push(`quote_id.in.(${quoteIds.join(',')})`)
    }
    query = query.or(orClauses.join(','))
  }

  query = applyJobSort(query, activeSort.sortBy, activeSort.sortDirection)
  // Phase 4D — range supersedes .limit() now that pagination is real.
  query = query.range(from, to)

  const [{ data: jobs, count, error }, { data: contractors }] = await Promise.all([
    query,
    supabase.from('contractors').select('id, full_name').eq('status', 'active').order('full_name'),
  ])

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-8">Jobs</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
          Failed to load jobs: {error.message}
        </div>
      </div>
    )
  }

  const allRows = (jobs ?? []).map((j) => {
    const client = j.clients as unknown as { name: string; company_name: string | null } | null
    // PostgREST returns embedded relations as arrays unless the FK is
    // declared one-to-one. We pick element [0] for both source_quote
    // and linked_invoice, since each is a true 1:1 from the job side.
    const sourceQuoteRaw = (j as unknown as { source_quote?: Array<{ id: string; quote_number: string | null }> | { id: string; quote_number: string | null } | null }).source_quote ?? null
    const sourceQuote = Array.isArray(sourceQuoteRaw) ? sourceQuoteRaw[0] ?? null : sourceQuoteRaw
    const linkedInvoiceRaw = (j as unknown as { linked_invoice?: Array<{ id: string; invoice_number: string | null; status: string | null }> | { id: string; invoice_number: string | null; status: string | null } | null }).linked_invoice ?? null
    const linkedInvoice = Array.isArray(linkedInvoiceRaw) ? linkedInvoiceRaw[0] ?? null : linkedInvoiceRaw
    const attention = getJobAttention({
      status: j.status,
      scheduled_date: j.scheduled_date as string | null,
      contractor_id: j.contractor_id as string | null,
      assigned_to: j.assigned_to as string | null,
    })
    // Phase list-view-uxp-2 PR-B: derived display status. The DB
    // continues to store low-level transitions ('draft' / 'assigned'
    // / 'in_progress' / 'completed' / 'invoiced'); the UI shows the
    // operationally-honest equivalent ('Needs scheduling' / 'Scheduled'
    // / 'In progress' / 'Completed' / 'Invoiced') via getJobStatus().
    const displayStatus = getJobStatus({
      scheduled_date: j.scheduled_date as string | null,
      contractor_id: j.contractor_id as string | null,
      assigned_to: j.assigned_to as string | null,
      started_at: (j as { started_at?: string | null }).started_at ?? null,
      completed_at: (j as { completed_at?: string | null }).completed_at ?? null,
      invoice_id: (j as { invoice_id?: string | null }).invoice_id ?? null,
    })
    // Phase list-view-uxp-2 PR-B: customer-first label rule. Show
    // company_name when present (B2B identity is more useful);
    // fall back to the individual's name. Operators who want both
    // can re-enable the 'company' column from /portal/settings/display.
    const customerLabel = (client?.company_name && client.company_name.trim())
      ? client.company_name
      : (client?.name ?? '—')
    return {
      id: j.id,
      job_number: j.job_number ?? '—',
      title: j.title ?? '—',
      client: client?.name ?? '—',
      customerLabel,
      company: client?.company_name ?? '—',
      address: j.address ?? '',
      assigned_to: j.assigned_to ?? '',
      status: j.status ?? 'draft',
      displayStatus,
      jobPrice: (j as { job_price?: number | null }).job_price ?? null,
      scheduled_date: j.scheduled_date,
      scheduledTime: j.scheduled_time as string | null,
      isTest: !!(j as { is_test?: boolean }).is_test,
      isArchived: !!(j as { deleted_at?: string | null }).deleted_at,
      createdAt: j.created_at,
      attention,
      // Phase quote-flow-clarity: source quote + linked invoice for
      // the "From QUO-XXXX" / "Invoice INV-XXXX" badges. Both nullable.
      // Phase list-view-uxp-2 PR-B: ids included so the chip cells
      // can deep-link to the related record.
      quote_id: sourceQuote?.id ?? (j as { quote_id?: string | null }).quote_id ?? null,
      quote_number: sourceQuote?.quote_number ?? null,
      invoice_id: linkedInvoice?.id ?? (j as { invoice_id?: string | null }).invoice_id ?? null,
      invoice_number: linkedInvoice?.invoice_number ?? null,
      invoice_status: linkedInvoice?.status ?? null,
    }
  })

  // Needs-attention is a virtual tab — narrow to flagged rows only.
  const rows = activeTab === 'needs_attention'
    ? allRows.filter((r) => r.attention.needsAttention)
    : allRows

  // Phase 5A — strict single-line cell renderers.
  // No inner anchors (the row-href Link in <PortalListTable> handles
  // navigation), no pill chrome on linked records, no content that
  // can grow row height. Truncate where text could otherwise wrap.
  function cell(row: typeof rows[number], key: string): React.ReactNode {
    switch (key) {
      case 'job_number':     return (
        <span className="font-medium text-sage-800 inline-flex items-center gap-1.5 whitespace-nowrap">
          {row.job_number}
          {row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-amber-800 bg-amber-100 rounded-full px-1.5 py-0.5"><FlaskConical size={9} /> Test</span>}
          {row.isArchived && !row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-sage-600 bg-sage-100 rounded-full px-1.5 py-0.5"><Archive size={9} /> Archived</span>}
        </span>
      )
      case 'title':          return <span className="block max-w-[220px] truncate">{row.title}</span>
      case 'client':         return row.customerLabel === '—'
                                  ? <span className="text-sage-400">—</span>
                                  : <span className="block max-w-[200px] truncate" title={row.customerLabel}>{row.customerLabel}</span>
      case 'company':        return row.company === '—' ? <span className="text-sage-400">—</span> : <span className="block max-w-[180px] truncate" title={row.company}>{row.company}</span>
      case 'address':        return row.address ? <span className="block max-w-[220px] truncate" title={row.address}>{row.address}</span> : <span className="text-sage-400">—</span>
      case 'value':          return row.jobPrice != null
                                  ? <span className="font-medium text-sage-800 whitespace-nowrap tabular-nums">{fmtCurrency(row.jobPrice)}</span>
                                  : <span className="text-sage-400">—</span>
      case 'assigned_to':    return row.assigned_to
                                  ? <span className="whitespace-nowrap">{row.assigned_to}</span>
                                  : <span className="text-sage-300 whitespace-nowrap">Unassigned</span>
      case 'status':         return <StatusBadge kind="job" status={row.displayStatus} />
      case 'scheduled_date': return row.scheduled_date
                                  ? <span className="whitespace-nowrap">{fmtDate(row.scheduled_date)}{row.scheduledTime ? <span className="text-sage-400 ml-1.5">{row.scheduledTime}</span> : ''}</span>
                                  : <span className="text-sage-400">—</span>
      // Phase 5A — linked records render as plain inline text. The
      // row's wrapping Link opens THIS job's detail; from there the
      // operator can click through to the linked record.
      case 'linked_quote':
        return row.quote_number
          ? <span className="whitespace-nowrap text-sage-700">{row.quote_number}</span>
          : <span className="text-sage-400">—</span>
      case 'linked_invoice':
        if (row.invoice_number) {
          return (
            <span className="whitespace-nowrap text-sage-700">
              {row.invoice_number}
              {row.invoice_status && <span className="text-sage-500"> · {row.invoice_status}</span>}
            </span>
          )
        }
        return <span className="text-sage-400">—</span>
      default:               return null
    }
  }

  function alignFor(key: string): 'left' | 'right' {
    return key === 'value' ? 'right' : 'left'
  }

  // Resolve the visible-fields list against the registry order so
  // columns render in a predictable order regardless of save order.
  const orderedVisible = JOB_FIELDS
    .filter((f) => f.contexts.includes('list') && visible.has(f.key))
    .map((f) => f.key)

  // Mobile card uses primary + secondary explicitly.
  const primaryKey = jobsList.primaryField
  const secondaryKey = jobsList.secondaryField

  function rawCell(row: typeof rows[number], key: string): string {
    switch (key) {
      case 'job_number':     return row.job_number
      case 'title':          return row.title
      // Phase list-view-uxp-2 PR-B: mobile card 'client' slot also
      // honours the customer-first label rule.
      case 'client':         return row.customerLabel
      case 'company':        return row.company
      case 'address':        return row.address || '—'
      case 'value':          return row.jobPrice != null ? fmtCurrency(row.jobPrice) : '—'
      case 'assigned_to':    return row.assigned_to || 'Unassigned'
      case 'status':         return row.displayStatus
      case 'scheduled_date': return fmtDate(row.scheduled_date)
      default:               return ''
    }
  }

  // Phase 4B — empty-state copy resolved before the return so the
  // <EmptyState> primitive gets simple string props.
  const hasFilters = !!(view || search || contractorFilter)
  let emptyTitle: string
  if (hasFilters) emptyTitle = 'No jobs match your filters.'
  else if (activeTab === 'needs_attention')  emptyTitle = 'Nothing needs your attention right now.'
  else if (activeTab === 'needs_scheduling') emptyTitle = 'No jobs needing scheduling.'
  else if (activeTab === 'scheduled')        emptyTitle = 'No jobs scheduled yet.'
  else if (activeTab === 'in_progress')      emptyTitle = 'No jobs in progress right now.'
  else if (activeTab === 'completed')        emptyTitle = 'No completed jobs.'
  else                                       emptyTitle = 'No jobs yet.'
  let emptyDescription: string | undefined
  if (activeTab === 'needs_attention') emptyDescription = 'Unassigned, unscheduled, at-risk, and ready-to-invoice jobs surface here.'
  else if (activeTab === 'needs_scheduling') emptyDescription = 'Accepted quotes with job setup complete will appear here.'

  // Phase 4C — admin gate is needed for any future adminOnly actions
  // declared in the config. None on jobs today, but the filter keeps
  // the rendering symmetric with invoices.
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = isAdminUser(user)
  const headerActions = JOBS_LIST_CONFIG.actions
    .filter((a) => !a.adminOnly || isAdmin)

  return (
    <BulkSelectProvider entity="job" ids={rows.map((r) => r.id as string)} canCleanup={canCleanup}>
      <PortalListTable<typeof rows[number]>
        header={
          <PortalPageHeader
            title={JOBS_LIST_CONFIG.pageTitle}
            actions={headerActions.map((a) => {
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
            basePath="/portal/jobs"
            tabs={JOBS_LIST_CONFIG.tabs}
            activeTab={activeTab}
            showArchived={showArchived}
            canCleanup={canCleanup}
            preservedParams={{
              view: view || undefined,
              contractor: contractorFilter || undefined,
              q: search || undefined,
            }}
          />
        }
        filters={<JobFilters contractors={contractors ?? []} />}
        emptyState={
          <EmptyState
            icon={Briefcase}
            title={emptyTitle}
            description={emptyDescription}
            action={!hasFilters ? (
              <Link href="/portal/jobs/new" className={buttonClasses({ variant: 'primary' })}>
                <Plus size={16} />
                New job
              </Link>
            ) : undefined}
          />
        }
        rows={rows}
        columns={orderedVisible.map<ListColumnDef<typeof rows[number]>>((k) => ({
          key: k,
          label: JOB_FIELDS.find((f) => f.key === k)?.label ?? k,
          align: alignFor(k),
          cell: (row) => cell(row, k),
        }))}
        bulkSelect={{ canCleanup }}
        rowHref={(row) => `/portal/jobs/${row.id}`}
        rowLabel={(row) => `job ${row.job_number}`}
        isDimmed={(row) => row.isTest || row.isArchived}
        statusDot={(row) => <StatusDot kind="job" status={row.displayStatus} />}
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
            defaultRowsPerPage={JOBS_LIST_CONFIG.rowsPerPage}
            basePath="/portal/jobs"
            preservedParams={{
              tab: activeTab !== JOBS_LIST_CONFIG.defaultTab ? activeTab : undefined,
              view: view || undefined,
              contractor: contractorFilter || undefined,
              q: search || undefined,
              sort: searchParams.sort,
              per: rowsPerPage !== JOBS_LIST_CONFIG.rowsPerPage ? rowsPerPage : undefined,
              show_archived: showArchived ? '1' : undefined,
            }}
            visibleCount={rows.length}
          />
        }
        mobile={{
              label: (row) => `job ${row.job_number}`,
              primary: (row) => (
                <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                  <span className="font-medium text-sage-800 inline-flex items-center gap-1.5">
                    {rawCell(row, primaryKey)}
                    {row.isTest && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-amber-800 bg-amber-100 rounded-full px-1.5 py-0.5">
                        <FlaskConical size={9} /> Test
                      </span>
                    )}
                    {row.isArchived && !row.isTest && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-sage-600 bg-sage-100 rounded-full px-1.5 py-0.5">
                        <Archive size={9} /> Archived
                      </span>
                    )}
                  </span>
                  <StatusBadge kind="job" status={row.displayStatus} />
                </div>
              ),
              secondary: (row) => <span className="text-sage-700">{rawCell(row, secondaryKey)}</span>,
              extra: (row) => (
                <>
                  {visible.has('address') && primaryKey !== 'address' && secondaryKey !== 'address' && row.address && (
                    <div className="text-sage-500 text-xs mt-1">{row.address}</div>
                  )}
                  {(row.quote_number || row.invoice_number) && (
                    <div className="mt-1.5 inline-flex flex-wrap gap-1.5 text-[11px] text-sage-600">
                      {row.quote_number && (
                        <span className="inline-flex items-center gap-1 bg-sage-50 border border-sage-100 rounded-full px-2 py-0.5">
                          From <span className="font-medium text-sage-800">{row.quote_number}</span>
                        </span>
                      )}
                      {row.invoice_number && (
                        <span className="inline-flex items-center gap-1 bg-sage-50 border border-sage-100 rounded-full px-2 py-0.5">
                          Invoice <span className="font-medium text-sage-800">{row.invoice_number}</span>
                          {row.invoice_status && <span className="text-sage-500">· {row.invoice_status}</span>}
                        </span>
                      )}
                    </div>
                  )}
                </>
              ),
        meta: (row) => (
          <>
            <span>{row.assigned_to || 'Unassigned'}</span>
            <span>
              {fmtDate(row.scheduled_date)}
              {row.scheduledTime ? ` ${row.scheduledTime}` : ''}
              {row.jobPrice != null && <span className="ml-2 text-sage-700 font-medium">{fmtCurrency(row.jobPrice)}</span>}
            </span>
          </>
        ),
      }}
      />
      {jobsList.groupBy !== 'none' && (
        <p className="text-[11px] text-sage-400 mt-2 italic">
          Group-by ({jobsList.groupBy}) will be wired in the next phase. Setting persists.
        </p>
      )}
    </BulkSelectProvider>
  )
}
