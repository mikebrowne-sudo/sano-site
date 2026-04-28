import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { Briefcase, Plus, CalendarDays, FlaskConical, Archive } from 'lucide-react'
import clsx from 'clsx'
import { JobFilters } from './_components/JobFilters'
import { StatusBadge } from '../_components/StatusBadge'
import { loadDisplaySettings, JOB_FIELDS } from '@/lib/portal-display-settings'
import { ListLifecycleTabs } from '../_components/ListLifecycleTabs'
import { AttentionChips } from '../_components/AttentionChips'
import { BulkSelectProvider, BulkSelectCheckbox, BulkSelectHeader } from '../_components/BulkSelect'
import { getJobAttention } from '@/lib/attention-rules'
import { getCleanupAccess } from '@/lib/cleanup-mode'

// Phase 5.5.14 — job workflow tabs. Default 'needs_attention' is the
// operator's hot list; the four lifecycle tabs let them drill into
// each phase. Invoiced jobs are intentionally excluded from every tab
// other than (eventually) a dedicated archive view — see Part 6.
type JobTab = 'needs_attention' | 'needs_scheduling' | 'scheduled' | 'in_progress' | 'completed'
const JOB_TABS: readonly { value: JobTab; label: string }[] = [
  { value: 'needs_attention',  label: 'Needs attention' },
  { value: 'needs_scheduling', label: 'Needs scheduling' },
  { value: 'scheduled',        label: 'Scheduled' },
  { value: 'in_progress',      label: 'In progress' },
  { value: 'completed',        label: 'Completed' },
]
function parseJobTab(v: string | undefined): JobTab {
  return (JOB_TABS.find((t) => t.value === v)?.value as JobTab) ?? 'needs_attention'
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
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
  searchParams: { view?: string; contractor?: string; sort?: string; q?: string; tab?: string; show_archived?: string }
}) {
  const supabase = createClient()

  const view = searchParams.view ?? ''
  const contractorFilter = searchParams.contractor ?? ''
  const search = searchParams.q?.trim() ?? ''
  // Phase 5.5.14 — cleanup mode gates the show-archived toggle and
  // the bulk-select UI. canCleanup === (admin AND cleanup-mode-enabled).
  const cleanup = await getCleanupAccess(supabase)
  const canCleanup = cleanup.canCleanup
  const activeTab    = parseJobTab(searchParams.tab)
  const showArchived = canCleanup && searchParams.show_archived === '1'

  const today = todayStr()
  const tomorrow = tomorrowStr()

  // Phase 2 — load display settings, then resolve the active sort from
  // (URL override → settings → fallback default).
  const display = await loadDisplaySettings(supabase)
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
  let query = supabase
    .from('jobs')
    .select('id, job_number, title, address, status, scheduled_date, scheduled_time, assigned_to, contractor_id, quote_id, invoice_id, created_at, is_test, deleted_at, clients ( name, company_name ), source_quote:quotes!quote_id ( quote_number ), linked_invoice:invoices!invoice_id ( invoice_number, status )')

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

  const [{ data: jobs, error }, { data: contractors }] = await Promise.all([
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
    const sourceQuoteRaw = (j as unknown as { source_quote?: Array<{ quote_number: string | null }> | { quote_number: string | null } | null }).source_quote ?? null
    const sourceQuote = Array.isArray(sourceQuoteRaw) ? sourceQuoteRaw[0] ?? null : sourceQuoteRaw
    const linkedInvoiceRaw = (j as unknown as { linked_invoice?: Array<{ invoice_number: string | null; status: string | null }> | { invoice_number: string | null; status: string | null } | null }).linked_invoice ?? null
    const linkedInvoice = Array.isArray(linkedInvoiceRaw) ? linkedInvoiceRaw[0] ?? null : linkedInvoiceRaw
    const attention = getJobAttention({
      status: j.status,
      scheduled_date: j.scheduled_date as string | null,
      contractor_id: j.contractor_id as string | null,
      assigned_to: j.assigned_to as string | null,
    })
    return {
      id: j.id,
      job_number: j.job_number ?? '—',
      title: j.title ?? '—',
      client: client?.name ?? '—',
      company: client?.company_name ?? '—',
      address: j.address ?? '',
      assigned_to: j.assigned_to ?? '',
      status: j.status ?? 'draft',
      scheduled_date: j.scheduled_date,
      scheduledTime: j.scheduled_time as string | null,
      isTest: !!(j as { is_test?: boolean }).is_test,
      isArchived: !!(j as { deleted_at?: string | null }).deleted_at,
      createdAt: j.created_at,
      attention,
      // Phase quote-flow-clarity: source quote + linked invoice for
      // the "From QUO-XXXX" / "Invoice INV-XXXX" badges. Both nullable.
      quote_id: (j as { quote_id?: string | null }).quote_id ?? null,
      quote_number: sourceQuote?.quote_number ?? null,
      invoice_id: (j as { invoice_id?: string | null }).invoice_id ?? null,
      invoice_number: linkedInvoice?.invoice_number ?? null,
      invoice_status: linkedInvoice?.status ?? null,
    }
  })

  // Needs-attention is a virtual tab — narrow to flagged rows only.
  const rows = activeTab === 'needs_attention'
    ? allRows.filter((r) => r.attention.needsAttention)
    : allRows

  // Render-time helper: get cell text for a field key.
  function cell(row: typeof rows[number], key: string): React.ReactNode {
    switch (key) {
      case 'job_number':     return (
        <span className="font-medium text-sage-800 inline-flex items-center gap-1.5">
          {row.job_number}
          {row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-amber-800 bg-amber-100 rounded-full px-1.5 py-0.5"><FlaskConical size={9} /> Test</span>}
          {row.isArchived && !row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-sage-600 bg-sage-100 rounded-full px-1.5 py-0.5"><Archive size={9} /> Archived</span>}
        </span>
      )
      case 'title':          return <span className="block max-w-[220px] truncate">{row.title}</span>
      case 'client':         return row.client
      case 'company':        return row.company === '—' ? <span className="text-sage-400">—</span> : row.company
      case 'address':        return row.address ? <span className="block max-w-[220px] truncate">{row.address}</span> : <span className="text-sage-400">—</span>
      case 'assigned_to':    return row.assigned_to || <span className="text-sage-300">Unassigned</span>
      case 'status':         return <StatusBadge kind="job" status={row.status} />
      case 'scheduled_date': return <>{fmtDate(row.scheduled_date)}{row.scheduledTime ? <span className="text-sage-400 ml-1.5">{row.scheduledTime}</span> : ''}</>
      default:               return null
    }
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
      case 'client':         return row.client
      case 'company':        return row.company
      case 'address':        return row.address || '—'
      case 'assigned_to':    return row.assigned_to || 'Unassigned'
      case 'status':         return row.status
      case 'scheduled_date': return fmtDate(row.scheduled_date)
      default:               return ''
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Jobs</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/portal/jobs/calendar"
            className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
          >
            <CalendarDays size={16} />
            Calendar
          </Link>
          <Link
            href="/portal/jobs/new"
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
          >
            <Plus size={16} />
            New Job
          </Link>
        </div>
      </div>

      <ListLifecycleTabs
        basePath="/portal/jobs"
        tabs={JOB_TABS}
        activeTab={activeTab}
        showArchived={showArchived}
        canCleanup={canCleanup}
        preservedParams={{
          view: view || undefined,
          contractor: contractorFilter || undefined,
          q: search || undefined,
        }}
      />

      <JobFilters contractors={contractors ?? []} />

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <Briefcase size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-800 font-medium mb-1">
            {(() => {
              if (view || search || contractorFilter) return 'No jobs match your filters.'
              if (activeTab === 'needs_attention')  return 'Nothing needs your attention right now.'
              if (activeTab === 'needs_scheduling') return 'No jobs needing scheduling.'
              if (activeTab === 'scheduled')        return 'No jobs scheduled yet.'
              if (activeTab === 'in_progress')      return 'No jobs in progress right now.'
              if (activeTab === 'completed')        return 'No completed jobs.'
              return 'No jobs yet.'
            })()}
          </p>
          {activeTab === 'needs_attention' && (
            <p className="text-sage-500 text-xs mt-1">Unassigned, unscheduled, at-risk, and ready-to-invoice jobs surface here.</p>
          )}
          {activeTab === 'needs_scheduling' && (
            <p className="text-sage-500 text-xs mt-1">Accepted quotes with job setup complete will appear here.</p>
          )}
          {!view && !search && !contractorFilter && (
            <Link
              href="/portal/jobs/new"
              className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors mt-3"
            >
              <Plus size={16} />
              New job
            </Link>
          )}
        </div>
      ) : (
        <BulkSelectProvider entity="job" ids={rows.map((r) => r.id as string)} canCleanup={canCleanup}>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop table — visible columns driven by display settings */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  {canCleanup && (
                    <th className="pl-5 pr-2 py-3 w-8">
                      <BulkSelectHeader />
                    </th>
                  )}
                  {orderedVisible.map((k) => (
                    <th key={k} className="px-5 py-3 font-semibold">
                      {JOB_FIELDS.find((f) => f.key === k)?.label ?? k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={clsx('border-b border-gray-50 last:border-0 group', (row.isTest || row.isArchived) && 'opacity-60')}>
                    {canCleanup && (
                      <td className="pl-5 pr-2 py-3 align-top">
                        <BulkSelectCheckbox id={row.id as string} label={`Select job ${row.job_number}`} />
                      </td>
                    )}
                    {orderedVisible.map((k, idx) => (
                      <td key={k} className="p-0 align-top">
                        <Link href={`/portal/jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-700">
                          {cell(row, k)}
                          {idx === 0 && (row.attention.reasons.length > 0 || row.attention.nextStep) && (
                            <div className="mt-1.5">
                              <AttentionChips reasons={row.attention.reasons} nextStep={row.attention.nextStep} size="xs" />
                            </div>
                          )}
                          {idx === 0 && (row.quote_number || row.invoice_number) && (
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
                        </Link>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — primary + secondary from settings */}
          <div className="md:hidden divide-y divide-gray-100">
            {rows.map((row) => (
              <div key={row.id} className={clsx('flex items-start gap-3 px-4 py-4 hover:bg-gray-50 transition-colors', (row.isTest || row.isArchived) && 'opacity-60')}>
                {canCleanup && (
                  <div className="pt-1">
                    <BulkSelectCheckbox id={row.id as string} label={`Select job ${row.job_number}`} />
                  </div>
                )}
                <Link href={`/portal/jobs/${row.id}`} className="block flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sage-800">{rawCell(row, primaryKey)}</span>
                  <StatusBadge kind="job" status={row.status} />
                </div>
                {(row.attention.reasons.length > 0 || row.attention.nextStep) && (
                  <div className="mb-1">
                    <AttentionChips reasons={row.attention.reasons} nextStep={row.attention.nextStep} size="xs" />
                  </div>
                )}
                <div className="text-sage-700 text-sm">{rawCell(row, secondaryKey)}</div>
                {visible.has('address') && primaryKey !== 'address' && secondaryKey !== 'address' && row.address && (
                  <div className="text-sage-500 text-xs mt-1">{row.address}</div>
                )}
                <div className="flex items-center justify-between mt-2 text-xs text-sage-500">
                  <span>{row.assigned_to || 'Unassigned'}</span>
                  <span>{fmtDate(row.scheduled_date)}{row.scheduledTime ? ` ${row.scheduledTime}` : ''}</span>
                </div>
              </Link>
              </div>
            ))}
          </div>
        </div>
        </BulkSelectProvider>
      )}

      <p className="text-xs text-sage-400 mt-4">{rows.length} job{rows.length !== 1 ? 's' : ''}</p>

      {jobsList.groupBy !== 'none' && (
        <p className="text-[11px] text-sage-400 mt-2 italic">
          Group-by ({jobsList.groupBy}) will be wired in the next phase. Setting persists.
        </p>
      )}
    </div>
  )
}
