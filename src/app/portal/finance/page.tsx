import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { DollarSign, TrendingUp, Receipt, Briefcase, AlertTriangle } from 'lucide-react'
import { PeriodFilter } from './_components/PeriodFilter'
import { resolvePeriod, getMonthsBetween } from './_lib/periods'
import clsx from 'clsx'

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

  // Load invoices and jobs for the period
  const [{ data: invoices }, { data: jobs }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, status, base_price, discount, date_issued, due_date, date_paid, created_at, clients ( name ), invoice_items ( price )')
      .neq('status', 'cancelled')
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`)
      .order('created_at', { ascending: false }),
    supabase
      .from('jobs')
      .select('id, job_number, title, scheduled_date, status, contractor_price, assigned_to, invoice_id')
      .not('contractor_price', 'is', null)
      .gt('contractor_price', 0)
      .gte('scheduled_date', from)
      .lte('scheduled_date', to)
      .order('scheduled_date', { ascending: false }),
  ])

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

  const totalRevenue = invoiceRows.reduce((s, i) => s + i.total, 0)
  const paidRevenue = invoiceRows.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const unpaidRevenue = totalRevenue - paidRevenue
  const paidCount = invoiceRows.filter((i) => i.status === 'paid').length
  const unpaidCount = invoiceRows.filter((i) => i.status !== 'paid').length

  const today = new Date().toISOString().slice(0, 10)
  const overdueInvoices = invoiceRows.filter((i) => i.status === 'sent' && i.dueDate && i.dueDate < today)

  // Contractor costs
  const jobRows = (jobs ?? []).map((j) => ({
    id: j.id,
    jobNumber: j.job_number,
    title: j.title ?? '—',
    scheduledDate: j.scheduled_date,
    status: j.status,
    contractorPrice: j.contractor_price ?? 0,
    assignedTo: j.assigned_to ?? '—',
    invoiceId: j.invoice_id,
  }))

  const totalCost = jobRows.reduce((s, j) => s + j.contractorPrice, 0)
  const estimatedMargin = totalRevenue - totalCost
  const marginPercent = totalRevenue > 0 ? Math.round((estimatedMargin / totalRevenue) * 100) : 0

  // Monthly breakdown
  const months = getMonthsBetween(from, to)
  const monthlyData = months.map((m) => {
    const monthInvoices = invoiceRows.filter((i) => i.dateIssued && i.dateIssued >= m.from && i.dateIssued <= m.to)
    const monthJobs = jobRows.filter((j) => j.scheduledDate && j.scheduledDate >= m.from && j.scheduledDate <= m.to)
    const rev = monthInvoices.reduce((s, i) => s + i.total, 0)
    const paid = monthInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0)
    const cost = monthJobs.reduce((s, j) => s + j.contractorPrice, 0)
    return {
      label: m.label,
      revenue: rev,
      paid,
      cost,
      margin: rev - cost,
      invoiceCount: monthInvoices.length,
      paidCount: monthInvoices.filter((i) => i.status === 'paid').length,
      jobCount: monthJobs.length,
    }
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-sage-800 mb-6">Finance</h1>

      <PeriodFilter current={periodKey} customFrom={searchParams.from} customTo={searchParams.to} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        <Card icon={Receipt} label="Invoiced" value={fmt(totalRevenue)} />
        <Card icon={DollarSign} label="Paid" value={fmt(paidRevenue)} accent="emerald" sub={`${paidCount} invoice${paidCount !== 1 ? 's' : ''}`} />
        <Card icon={AlertTriangle} label="Unpaid" value={fmt(unpaidRevenue)} accent={unpaidRevenue > 0 ? 'amber' : undefined} sub={`${unpaidCount} invoice${unpaidCount !== 1 ? 's' : ''}${overdueInvoices.length > 0 ? ` (${overdueInvoices.length} overdue)` : ''}`} />
        <Card icon={Briefcase} label="Contractor cost" value={fmt(totalCost)} />
        <Card icon={TrendingUp} label="Est. margin" value={fmt(estimatedMargin)} accent={estimatedMargin >= 0 ? 'emerald' : 'red'} sub={`${marginPercent}%`} />
      </div>

      {/* Monthly breakdown */}
      {monthlyData.length > 1 && (
        <Section title="Monthly Breakdown">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sage-100 text-left text-sage-600">
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
                  <tr key={m.label} className="border-b border-sage-50">
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

      {/* Revenue detail */}
      <Section title={`Invoices (${invoiceRows.length})`}>
        {invoiceRows.length === 0 ? (
          <p className="text-sage-500 text-sm">No invoices in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sage-100 text-left text-sage-600">
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
                  <tr key={inv.id} className="border-b border-sage-50 group">
                    <td className="p-0"><Link href={`/portal/invoices/${inv.id}`} className="block px-4 py-2.5 group-hover:bg-sage-50/50 transition-colors font-medium text-sage-800">{inv.invoiceNumber}</Link></td>
                    <td className="p-0"><Link href={`/portal/invoices/${inv.id}`} className="block px-4 py-2.5 group-hover:bg-sage-50/50 transition-colors text-sage-700">{inv.clientName}</Link></td>
                    <td className="p-0"><Link href={`/portal/invoices/${inv.id}`} className="block px-4 py-2.5 group-hover:bg-sage-50/50 transition-colors text-sage-600">{fmtDate(inv.dateIssued)}</Link></td>
                    <td className="p-0"><Link href={`/portal/invoices/${inv.id}`} className="block px-4 py-2.5 group-hover:bg-sage-50/50 transition-colors text-sage-600">{fmtDate(inv.dueDate)}</Link></td>
                    <td className="p-0"><Link href={`/portal/invoices/${inv.id}`} className="block px-4 py-2.5 group-hover:bg-sage-50/50 transition-colors"><InvStatus status={inv.status} dueDate={inv.dueDate} today={today} /></Link></td>
                    <td className="p-0"><Link href={`/portal/invoices/${inv.id}`} className="block px-4 py-2.5 group-hover:bg-sage-50/50 transition-colors text-sage-600">{fmtDate(inv.datePaid)}</Link></td>
                    <td className="p-0"><Link href={`/portal/invoices/${inv.id}`} className="block px-4 py-2.5 group-hover:bg-sage-50/50 transition-colors text-right font-medium text-sage-800">{fmt(inv.total)}</Link></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-sage-200">
                  <td colSpan={6} className="px-4 py-2.5 font-semibold text-sage-800">Total</td>
                  <td className="px-4 py-2.5 text-right font-bold text-sage-800">{fmt(totalRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

      {/* Contractor costs */}
      <Section title={`Contractor Costs (${jobRows.length} jobs)`}>
        {jobRows.length === 0 ? (
          <p className="text-sage-500 text-sm">No contractor costs in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sage-100 text-left text-sage-600">
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
                  <tr key={j.id} className="border-b border-sage-50 group">
                    <td className="p-0"><Link href={`/portal/jobs/${j.id}`} className="block px-4 py-2.5 group-hover:bg-sage-50/50 transition-colors font-medium text-sage-800">{j.jobNumber}</Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${j.id}`} className="block px-4 py-2.5 group-hover:bg-sage-50/50 transition-colors text-sage-700 max-w-[180px] truncate">{j.title}</Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${j.id}`} className="block px-4 py-2.5 group-hover:bg-sage-50/50 transition-colors text-sage-600">{fmtDate(j.scheduledDate)}</Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${j.id}`} className="block px-4 py-2.5 group-hover:bg-sage-50/50 transition-colors text-sage-600">{j.assignedTo}</Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${j.id}`} className="block px-4 py-2.5 group-hover:bg-sage-50/50 transition-colors"><JobStatus status={j.status} /></Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${j.id}`} className="block px-4 py-2.5 group-hover:bg-sage-50/50 transition-colors text-right font-medium text-sage-800">{fmt(j.contractorPrice)}</Link></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-sage-200">
                  <td colSpan={5} className="px-4 py-2.5 font-semibold text-sage-800">Total contractor cost</td>
                  <td className="px-4 py-2.5 text-right font-bold text-sage-800">{fmt(totalCost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

      {/* Margin summary */}
      <div className="bg-white rounded-xl border border-sage-100 p-6 mt-6">
        <h2 className="text-sm font-semibold text-sage-500 uppercase tracking-wide mb-4">Estimated Margin Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-sage-500">Total revenue</p>
            <p className="text-xl font-bold text-sage-800">{fmt(totalRevenue)}</p>
          </div>
          <div>
            <p className="text-sm text-sage-500">Total contractor cost</p>
            <p className="text-xl font-bold text-sage-800">{fmt(totalCost)}</p>
          </div>
          <div>
            <p className="text-sm text-sage-500">Estimated gross margin</p>
            <p className={clsx('text-xl font-bold', estimatedMargin >= 0 ? 'text-emerald-700' : 'text-red-600')}>{fmt(estimatedMargin)} <span className="text-sm font-normal">({marginPercent}%)</span></p>
          </div>
        </div>
        <p className="text-xs text-sage-400 mt-4">Margin is estimated from invoice totals minus job contractor costs for the selected period. Some jobs may not have linked invoices.</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-sage-100 p-5 mb-6">
      <h2 className="text-lg font-semibold text-sage-800 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Card({ icon: Icon, label, value, accent, sub }: { icon: React.ElementType; label: string; value: string; accent?: 'emerald' | 'amber' | 'red'; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-sage-100 p-5">
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
  invoiced: 'bg-purple-50 text-purple-700',
}

function JobStatus({ status }: { status: string }) {
  return <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', JOB_STATUS[status] ?? JOB_STATUS.draft)}>{status.replace('_', ' ')}</span>
}
