import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { DollarSign, TrendingUp, Receipt, Briefcase, AlertTriangle, FileText } from 'lucide-react'
import { PeriodFilter } from './_components/PeriodFilter'
import { JobsNeedingAttention } from './_components/JobsNeedingAttention'
import { resolvePeriod, getMonthsBetween } from './_lib/periods'
import { getJobLabourCost } from '@/lib/job-cost'
import {
  buildFinanceAttentionRows,
  type FinanceAttentionJob,
} from '@/lib/finance-attention-data'
import clsx from 'clsx'

const ATTENTION_ROW_LIMIT = 25

function fmt(dollars: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function calcInvoiceTotal(inv: { base_price: number; discount: number; items: { price: number }[] }) {
  const addons = inv.items.reduce((sum, i) => sum + (i.price ?? 0), 0)
  return (inv.base_price ?? 0) + addons - (inv.discount ?? 0)
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: { period?: string; from?: string; to?: string }
}) {
  const supabase = createClient()
  const periodKey = searchParams.period ?? 'this_month'
  const { from, to } = resolvePeriod(periodKey, searchParams.from, searchParams.to)

  // Load invoices and jobs for the period.
  // Exclude archived (soft-deleted) and test invoices — they must never count
  // toward live financial totals. Without these filters the dashboard was
  // counting binned drafts/sent invoices as if they were live money.
  const [{ data: invoices }, { data: jobs }, { data: contractorPaidExpenses }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, status, base_price, discount, date_issued, due_date, date_paid, created_at, clients ( name ), invoice_items ( price )')
      .neq('status', 'cancelled')
      .is('deleted_at', null)
      .not('is_test', 'is', true)
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`)
      .order('created_at', { ascending: false }),
    // Phase G.1 — contractor cost reads from the per-worker
    // snapshotted rates and approved/actual hours on `job_workers`,
    // not the denormalised `jobs.contractor_price` column. This puts
    // the finance dashboard on the same source of truth as the job
    // detail page's Labour & Margin section. The `contractor_price`
    // column is still selected for the time being so the cost-jobs
    // table can keep its row identity even where job_workers data is
    // incomplete; the displayed dollar figure always comes from the
    // canonical helper.
    //
    // Phase G.1 fix — historical rows can have `pay_rate = null`
    // because the assignment-time snapshot is new. The
    // `contractors ( hourly_rate )` join feeds `getJobLabourCost`'s
    // optional fallback so those jobs still show their real cost
    // until the next approval action snapshots a permanent pay_rate.
    //
    // Phase G.2 step 2 — the same query is extended with the columns
    // and joins reconcileJob needs (client name, job_price, scope,
    // allowed_hours, completed_at, per-worker pay_status / approved_at)
    // so the "Jobs needing attention" widget below can run off the
    // same data load without an extra round-trip.
    supabase
      .from('jobs')
      .select(`
        id, job_number, title, scheduled_date, status, contractor_price, assigned_to, invoice_id,
        client_id, job_price, description, scope_snapshot, allowed_hours, completed_at,
        clients ( name ),
        job_workers (
          contractor_id, pay_rate, approved_hours, actual_hours, hours_allocated,
          pay_status, approved_at, extra_hours, extra_hours_status,
          contractors ( hourly_rate )
        )
      `)
      .gte('scheduled_date', from)
      .lte('scheduled_date', to)
      .order('scheduled_date', { ascending: false }),
    // Actual contractor cost = the bank-matched contractor payments recorded
    // as expenses under the wages/payroll category, by expense date. This is
    // the real cash paid (ties to the bank / the P&L), not the per-job
    // hours×rate estimate used in the per-job table further down.
    supabase
      .from('expenses')
      .select('amount, expense_date')
      .eq('category', 'wages_payroll')
      .gte('expense_date', from)
      .lte('expense_date', to),
  ])

  // Phase G.2 step 2 — fan out the supplemental queries reconcileJob
  // needs in parallel: invoice totals for any linked invoices (not
  // already in the period-filtered `invoices` set above), and the
  // contractor_invoices + pay_run_items rows used by the convergence
  // info flag. Each `.in()` query is guarded against empty IDs so the
  // request short-circuits when there are no jobs in the period.
  const jobInvoiceIds = Array.from(
    new Set(
      ((jobs ?? []) as Array<{ invoice_id: string | null }>)
        .map((j) => j.invoice_id)
        .filter((id): id is string => !!id),
    ),
  )
  const jobIds = ((jobs ?? []) as Array<{ id: string }>).map((j) => j.id)

  const [
    { data: jobLinkedInvoices },
    { data: contractorInvoiceRefs },
    { data: payRunItemRefs },
  ] = await Promise.all([
    jobInvoiceIds.length > 0
      ? supabase
          .from('invoices')
          .select('id, base_price, discount, invoice_items ( price )')
          .in('id', jobInvoiceIds)
      : Promise.resolve({ data: [] as Array<{ id: string; base_price: number; discount: number; invoice_items: { price: number }[] }> }),
    jobIds.length > 0
      ? supabase
          .from('contractor_invoices')
          .select('job_id, contractor_id')
          .in('job_id', jobIds)
      : Promise.resolve({ data: [] as Array<{ job_id: string; contractor_id: string }> }),
    jobIds.length > 0
      ? supabase
          .from('pay_run_items')
          .select('job_id, contractor_id')
          .in('job_id', jobIds)
      : Promise.resolve({ data: [] as Array<{ job_id: string; contractor_id: string }> }),
  ])

  const invoiceTotalById = new Map<string, number>()
  for (const inv of (jobLinkedInvoices ?? []) as Array<{
    id: string
    base_price: number
    discount: number
    invoice_items: { price: number }[] | null
  }>) {
    const items = inv.invoice_items ?? []
    const addons = items.reduce((sum, i) => sum + (i.price ?? 0), 0)
    const total = (inv.base_price ?? 0) + addons - (inv.discount ?? 0)
    invoiceTotalById.set(inv.id, total)
  }

  const attentionResult = buildFinanceAttentionRows({
    jobs: (jobs ?? []) as unknown as FinanceAttentionJob[],
    invoiceTotalById,
    contractorInvoices: contractorInvoiceRefs ?? [],
    payRunItems: payRunItemRefs ?? [],
    limit: ATTENTION_ROW_LIMIT,
  })

  // Calculate invoice totals
  const invoiceRows = (invoices ?? []).map((inv) => {
    const client = inv.clients as unknown as { name: string } | null
    const items = (inv.invoice_items ?? []) as { price: number }[]
    const total = calcInvoiceTotal({ base_price: inv.base_price, discount: inv.discount, items })
    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      clientName: client?.name ?? '—',
      status: inv.status,
      dateIssued: inv.date_issued,
      dueDate: inv.due_date,
      datePaid: inv.date_paid,
      total,
    }
  })

  // Revenue split by status. "Outstanding" = genuinely owed = issued-but-unpaid
  // (sent). Drafts are NOT issued yet, so they are reported separately and
  // never counted as outstanding. "Invoiced" = issued = sent + paid.
  const paidRows = invoiceRows.filter((i) => i.status === 'paid')
  const sentRows = invoiceRows.filter((i) => i.status === 'sent')
  const draftRows = invoiceRows.filter((i) => i.status === 'draft')

  const paidRevenue = paidRows.reduce((s, i) => s + i.total, 0)
  const outstandingRevenue = sentRows.reduce((s, i) => s + i.total, 0)
  const draftRevenue = draftRows.reduce((s, i) => s + i.total, 0)
  const issuedRevenue = paidRevenue + outstandingRevenue
  const paidCount = paidRows.length
  const outstandingCount = sentRows.length
  const draftCount = draftRows.length

  const today = new Date().toISOString().slice(0, 10)
  const overdueInvoices = invoiceRows.filter((i) => i.status === 'sent' && i.dueDate && i.dueDate < today)

  // Actual contractor cost (bank-matched, from wages/payroll expenses).
  const contractorActualCost = (contractorPaidExpenses ?? []).reduce((s, e) => s + ((e.amount as number | null) ?? 0), 0)

  // Contractor costs — Phase G.1.
  // Cost is the sum of (rate × payable hours) across all job_workers
  // rows on the job, where rate prefers the snapshotted pay_rate and
  // falls back to the joined contractors.hourly_rate for historical
  // rows that pre-date the assignment-time snapshot. Jobs with neither
  // a rate nor any payable hours resolve to $0 and are filtered out so
  // the Contractor Costs section stays focused on actionable rows.
  // The same canonical helper is used by the job detail page.
  type RawJobWorker = {
    pay_rate: number | null
    approved_hours: number | null
    actual_hours: number | null
    hours_allocated: number | null
    extra_hours: number | null
    extra_hours_status: string | null
    contractors: { hourly_rate: number | null } | null
  }
  const jobRows = (jobs ?? [])
    .map((j) => {
      const rawWorkers = (j.job_workers ?? []) as unknown as RawJobWorker[]
      const workers = rawWorkers.map((w) => ({
        pay_rate: w.pay_rate,
        contractor_hourly_rate: w.contractors?.hourly_rate ?? null,
        approved_hours: w.approved_hours,
        actual_hours: w.actual_hours,
        hours_allocated: w.hours_allocated,
        extra_hours: w.extra_hours ?? 0,
        extra_hours_status: w.extra_hours_status ?? 'none',
      }))
      const contractorPrice = getJobLabourCost(workers)
      return {
        id: j.id,
        jobNumber: j.job_number,
        title: j.title ?? '—',
        scheduledDate: j.scheduled_date,
        status: j.status,
        contractorPrice,
        assignedTo: j.assigned_to ?? '—',
        invoiceId: j.invoice_id,
      }
    })
    .filter((j) => j.contractorPrice > 0)

  // Per-job labour ESTIMATE (hours × rate) — kept for the per-job table only.
  const estimatedJobLabour = jobRows.reduce((s, j) => s + j.contractorPrice, 0)
  // Headline margin is cash-consistent: actual paid income less actual paid
  // contractor cost (gross — excludes operating expenses; see the P&L for net).
  const grossMargin = paidRevenue - contractorActualCost
  const grossMarginPercent = paidRevenue > 0 ? Math.round((grossMargin / paidRevenue) * 100) : 0

  // Monthly breakdown — issued revenue + paid by date_issued / status; cost is
  // actual contractor paid (wages/payroll expenses) bucketed by expense date.
  const months = getMonthsBetween(from, to)
  const monthlyData = months.map((m) => {
    const monthInvoices = invoiceRows.filter((i) => i.status !== 'draft' && i.dateIssued && i.dateIssued >= m.from && i.dateIssued <= m.to)
    const monthJobs = jobRows.filter((j) => j.scheduledDate && j.scheduledDate >= m.from && j.scheduledDate <= m.to)
    const rev = monthInvoices.reduce((s, i) => s + i.total, 0)
    const paid = monthInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0)
    const cost = (contractorPaidExpenses ?? [])
      .filter((e) => { const d = e.expense_date as string | null; return d != null && d >= m.from && d <= m.to })
      .reduce((s, e) => s + ((e.amount as number | null) ?? 0), 0)
    return {
      label: m.label,
      revenue: rev,
      paid,
      cost,
      margin: paid - cost,
      invoiceCount: monthInvoices.length,
      paidCount: monthInvoices.filter((i) => i.status === 'paid').length,
      jobCount: monthJobs.length,
    }
  })

  return (
    <div className="tnum">
      <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-8">Finance</h1>

      <PeriodFilter current={periodKey} customFrom={searchParams.from} customTo={searchParams.to} />

      {/* Accountant exports — CSV for the selected period + expenses link. */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-8 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-sage-500 font-medium mr-1">Exports:</span>
        <a href={`/api/finance/invoices-csv?from=${from}&to=${to}`} className="inline-flex items-center gap-1.5 border border-sage-200 text-sage-700 px-3 py-1.5 rounded-lg hover:bg-sage-50 transition-colors">Invoice register</a>
        <a href={`/api/finance/contractor-payments-csv?from=${from}&to=${to}`} className="inline-flex items-center gap-1.5 border border-sage-200 text-sage-700 px-3 py-1.5 rounded-lg hover:bg-sage-50 transition-colors">Contractor payments</a>
        <a href={`/portal/expenses/csv?from=${from}&to=${to}`} className="inline-flex items-center gap-1.5 border border-sage-200 text-sage-700 px-3 py-1.5 rounded-lg hover:bg-sage-50 transition-colors">Expenses</a>
        <a href={`/api/finance/cash-out-csv?from=${from}&to=${to}`} className="inline-flex items-center gap-1.5 border border-sage-200 text-sage-700 px-3 py-1.5 rounded-lg hover:bg-sage-50 transition-colors">Cash-out (combined)</a>
        <Link href="/portal/finance/profit-loss" className="inline-flex items-center gap-1.5 bg-sage-500 text-white px-3 py-1.5 rounded-lg hover:bg-sage-700 transition-colors">P&amp;L statement →</Link>
        <Link href="/portal/finance/reconcile" className="inline-flex items-center gap-1.5 border border-sage-200 text-sage-700 px-3 py-1.5 rounded-lg hover:bg-sage-50 transition-colors">Bank reconciliation →</Link>
        <Link href="/portal/expenses" className="ml-auto text-sage-500 hover:text-sage-700">Manage expenses →</Link>
      </div>

      {/* Summary cards. Archived + test invoices are excluded. "Invoiced" =
          issued (sent + paid); "Outstanding" = sent only (genuinely owed);
          drafts are reported separately as not-yet-issued. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        <Card icon={Receipt} label="Invoiced" value={fmt(issuedRevenue)} sub={`${paidCount + outstandingCount} issued`} />
        <Card icon={DollarSign} label="Paid" value={fmt(paidRevenue)} accent="emerald" sub={`${paidCount} invoice${paidCount !== 1 ? 's' : ''}`} />
        <Card icon={AlertTriangle} label="Outstanding" value={fmt(outstandingRevenue)} accent={outstandingRevenue > 0 ? 'amber' : undefined} sub={`${outstandingCount} sent${overdueInvoices.length > 0 ? ` · ${overdueInvoices.length} overdue` : ''}`} />
        <Card icon={FileText} label="Draft" value={fmt(draftRevenue)} sub={`${draftCount} not issued`} />
        <Card icon={Briefcase} label="Contractor cost" value={fmt(contractorActualCost)} sub="actual paid" />
        <Card icon={TrendingUp} label="Est. gross margin" value={fmt(grossMargin)} accent={grossMargin >= 0 ? 'emerald' : 'red'} sub={`${grossMarginPercent}% · excl. expenses`} />
      </div>

      {/* Monthly breakdown */}
      {monthlyData.length > 1 && (
        <Section title="Monthly Breakdown">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  <th className="px-4 py-2.5 font-semibold">Month</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Invoiced</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Paid</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Cost</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Margin</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Invoices</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Jobs</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m) => (
                  <tr key={m.label} className="border-b border-gray-50">
                    <td className="px-4 py-2.5 font-medium text-sage-800">{m.label}</td>
                    <td className="px-4 py-2.5 text-right text-sage-700">{fmt(m.revenue)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-700">{fmt(m.paid)}</td>
                    <td className="px-4 py-2.5 text-right text-sage-600">{fmt(m.cost)}</td>
                    <td className={clsx('px-4 py-2.5 text-right font-medium', m.margin >= 0 ? 'text-emerald-700' : 'text-red-600')}>{fmt(m.margin)}</td>
                    <td className="px-4 py-2.5 text-right text-sage-500">{m.invoiceCount} ({m.paidCount} paid)</td>
                    <td className="px-4 py-2.5 text-right text-sage-500">{m.jobCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Overdue invoices */}
      {overdueInvoices.length > 0 && (
        <Section title={`Overdue Invoices (${overdueInvoices.length})`}>
          <div className="space-y-2">
            {overdueInvoices.map((inv) => (
              <Link key={inv.id} href={`/portal/invoices/${inv.id}`} className="flex items-center justify-between bg-amber-50 rounded-lg px-4 py-3 hover:bg-amber-100 transition-colors text-sm">
                <div>
                  <span className="font-medium text-sage-800">{inv.invoiceNumber}</span>
                  <span className="text-sage-600 ml-2">{inv.clientName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-amber-700">Due {fmtDate(inv.dueDate)}</span>
                  <span className="font-medium text-sage-800">{fmt(inv.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Phase G.2 step 2 — finance cleanup visibility. Signal-not-gate:
          surfaces cleanup issues; does not block any existing flow. */}
      <JobsNeedingAttention
        rows={attentionResult.rows}
        totalIssueCount={attentionResult.totalIssueCount}
        limit={ATTENTION_ROW_LIMIT}
        severityCounts={attentionResult.severityCounts}
      />

      {/* Revenue detail */}
      <Section title={`Invoices (${invoiceRows.length})`}>
        {invoiceRows.length === 0 ? (
          <p className="text-sage-500 text-sm">No invoices in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  <th className="px-4 py-2.5 font-semibold">Invoice</th>
                  <th className="px-4 py-2.5 font-semibold">Client</th>
                  <th className="px-4 py-2.5 font-semibold">Issued</th>
                  <th className="px-4 py-2.5 font-semibold">Due</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Paid</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoiceRows.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50 group">
                    <td className="p-0"><Link href={`/portal/invoices/${inv.id}`} className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors font-medium text-sage-800">{inv.invoiceNumber}</Link></td>
                    <td className="p-0"><Link href={`/portal/invoices/${inv.id}`} className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors text-sage-700">{inv.clientName}</Link></td>
                    <td className="p-0"><Link href={`/portal/invoices/${inv.id}`} className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors text-sage-600">{fmtDate(inv.dateIssued)}</Link></td>
                    <td className="p-0"><Link href={`/portal/invoices/${inv.id}`} className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors text-sage-600">{fmtDate(inv.dueDate)}</Link></td>
                    <td className="p-0"><Link href={`/portal/invoices/${inv.id}`} className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors"><InvStatus status={inv.status} dueDate={inv.dueDate} today={today} /></Link></td>
                    <td className="p-0"><Link href={`/portal/invoices/${inv.id}`} className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors text-sage-600">{fmtDate(inv.datePaid)}</Link></td>
                    <td className="p-0"><Link href={`/portal/invoices/${inv.id}`} className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors text-right font-medium text-sage-800">{fmt(inv.total)}</Link></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-sage-200">
                  <td colSpan={6} className="px-4 py-2.5 font-semibold text-sage-800">Total</td>
                  <td className="px-4 py-2.5 text-right font-bold text-sage-800">{fmt(issuedRevenue + draftRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

      {/* Per-job labour estimate — distinct from the actual-paid headline. */}
      <Section title={`Per-job labour — estimated (${jobRows.length} jobs)`}>
        <p className="text-xs text-sage-400 -mt-2 mb-4">Hours × rate estimate per job, for margin analysis. Not the actual paid figure — the headline Contractor cost ({fmt(contractorActualCost)}) is the bank-matched amount paid.</p>
        {jobRows.length === 0 ? (
          <p className="text-sage-500 text-sm">No job-labour estimates in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  <th className="px-4 py-2.5 font-semibold">Job</th>
                  <th className="px-4 py-2.5 font-semibold">Title</th>
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-4 py-2.5 font-semibold">Contractor</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {jobRows.map((j) => (
                  <tr key={j.id} className="border-b border-gray-50 group">
                    <td className="p-0"><Link href={`/portal/jobs/${j.id}`} className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors font-medium text-sage-800">{j.jobNumber}</Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${j.id}`} className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors text-sage-700 max-w-[180px] truncate">{j.title}</Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${j.id}`} className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors text-sage-600">{fmtDate(j.scheduledDate)}</Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${j.id}`} className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors text-sage-600">{j.assignedTo}</Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${j.id}`} className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors"><JobStatus status={j.status} /></Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${j.id}`} className="block px-4 py-2.5 group-hover:bg-gray-50 transition-colors text-right font-medium text-sage-800">{fmt(j.contractorPrice)}</Link></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-sage-200">
                  <td colSpan={5} className="px-4 py-2.5 font-semibold text-sage-800">Total estimated labour</td>
                  <td className="px-4 py-2.5 text-right font-bold text-sage-800">{fmt(estimatedJobLabour)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

      {/* Gross margin summary — cash basis, actual figures. */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mt-6">
        <h2 className="text-sm font-semibold text-sage-500 uppercase tracking-wide mb-4">Gross Margin Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-sage-500">Income received (paid)</p>
            <p className="text-xl font-bold text-sage-800">{fmt(paidRevenue)}</p>
          </div>
          <div>
            <p className="text-sm text-sage-500">Contractor cost (actual paid)</p>
            <p className="text-xl font-bold text-sage-800">{fmt(contractorActualCost)}</p>
          </div>
          <div>
            <p className="text-sm text-sage-500">Gross margin</p>
            <p className={clsx('text-xl font-bold', grossMargin >= 0 ? 'text-emerald-700' : 'text-red-600')}>{fmt(grossMargin)} <span className="text-sm font-normal">({grossMarginPercent}%)</span></p>
          </div>
        </div>
        <p className="text-xs text-sage-400 mt-4">Cash basis: paid income less actual contractor payments for the selected period. This is gross — it excludes operating expenses (the P&amp;L statement shows net profit after all expenses).</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
      <h2 className="text-lg font-semibold text-sage-800 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Card({ icon: Icon, label, value, accent, sub }: { icon: React.ElementType; label: string; value: string; accent?: 'emerald' | 'amber' | 'red'; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={accent === 'emerald' ? 'text-emerald-600' : accent === 'amber' ? 'text-amber-600' : accent === 'red' ? 'text-red-600' : 'text-sage-500'} />
        <span className="text-sm font-medium text-sage-600">{label}</span>
      </div>
      <p className={clsx('text-xl font-bold', accent === 'emerald' ? 'text-emerald-700' : accent === 'amber' ? 'text-amber-700' : accent === 'red' ? 'text-red-600' : 'text-sage-800')}>{value}</p>
      {sub && <p className="text-xs text-sage-500 mt-1">{sub}</p>}
    </div>
  )
}

const INV_STATUS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-amber-50 text-amber-700',
}

function InvStatus({ status, dueDate, today }: { status: string; dueDate: string | null; today: string }) {
  const display = status === 'sent' && dueDate && dueDate < today ? 'overdue' : status
  return <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', INV_STATUS[display] ?? INV_STATUS.draft)}>{display}</span>
}

const JOB_STATUS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  assigned: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  invoiced: 'bg-sage-100 text-sage-700',
}

function JobStatus({ status }: { status: string }) {
  return <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', JOB_STATUS[status] ?? JOB_STATUS.draft)}>{status.replace('_', ' ')}</span>
}
