import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Download, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { isFinanceUser } from '@/lib/is-admin'
import { accountantPackPeriods, nzToday, resolveAccountantPackPeriod } from '../_lib/periods'
import { buildAccountantPack } from '../_lib/accountant-pack'
import { loadAccountantPackRaw } from '../_lib/accountant-pack-data'

export const dynamic = 'force-dynamic'

function fmt(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export default async function AccountantPackPage({
  searchParams,
}: {
  searchParams: { period?: string; from?: string; to?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isFinanceUser(user)) notFound()

  const today = nzToday()
  const presets = accountantPackPeriods(today)
  const { key, from, to } = resolveAccountantPackPeriod(today, searchParams.period, searchParams.from, searchParams.to)

  // Service-role read AFTER the finance check — see accountant-pack-data.ts.
  const pack = buildAccountantPack(await loadAccountantPackRaw(getServiceSupabase()), from, to, today)
  const q = `from=${from}&to=${to}`
  const netGst = pack.gst.reduce((s, g) => s + g.netPaymentsBasis, 0)

  return (
    <div className="tnum max-w-4xl">
      <Link href="/portal/reports" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Reports</Link>
      <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-1">Accountant pack</h1>
      <p className="text-sm text-sage-500 mb-6">
        Everything the accountant needs for a period, in one Excel workbook — sales, payments, who owes what,
        expenses, contractor payments, payroll, GST, bank and mileage.
      </p>

      {/* Period */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <p className="text-sm font-semibold text-sage-800 mb-3">Period</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map((p) => (
            <Link
              key={p.key}
              href={`/portal/finance/accountant-pack?period=${p.key}`}
              className={clsx(
                'px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
                key === p.key ? 'bg-sage-500 text-white' : 'bg-sage-100 text-sage-600 hover:bg-sage-200',
              )}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <form method="get" action="/portal/finance/accountant-pack" className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-sage-600">
            <span className="block mb-1 font-medium">From</span>
            <input name="from" type="date" defaultValue={from} required className="rounded-lg border border-sage-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-sm text-sage-600">
            <span className="block mb-1 font-medium">To</span>
            <input name="to" type="date" defaultValue={to} required className="rounded-lg border border-sage-200 px-3 py-2 text-sm" />
          </label>
          <button type="submit" className={clsx(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            key === 'custom' ? 'bg-sage-500 text-white hover:bg-sage-700' : 'bg-sage-100 text-sage-700 hover:bg-sage-200',
          )}>
            Use these dates
          </button>
        </form>
        <p className="text-sm text-sage-500 mt-4">Showing <strong className="text-sage-800">{fmtDate(from)} – {fmtDate(to)}</strong></p>
      </div>

      {/* Download */}
      <a
        href={`/api/finance/accountant-pack?${q}`}
        className="flex items-center justify-center gap-2 w-full sm:w-auto sm:inline-flex bg-sage-500 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-sage-700 transition-colors mb-8"
      >
        <FileSpreadsheet size={18} /> Download Excel workbook (.xlsx)
      </a>

      {/* Headline figures */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Stat label="Sales invoiced (incl GST)" value={pack.totals.salesInclGst} sub={`${pack.sales.length} invoices`} />
        <Stat label="Received from customers" value={pack.totals.receivedInclGst} sub={`${pack.received.length} payments`} />
        <Stat label={`Owed to Sano at ${fmtDate(pack.asAt)}`} value={pack.totals.receivablesInclGst} sub={`${pack.receivables.length} invoices`} />
        <Stat label="Net profit (cash basis)" value={pack.pl.netProfit} sub={`${pack.pl.netMarginPct}% of income`} />
        <Stat label="Contractor remittances paid" value={pack.pl.remittancesTotal} sub={`${pack.contractorPayments.length} lines`} />
        <Stat label="Expenses recorded" value={pack.expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0)} sub={`${pack.expenses.length} items`} />
        <Stat label="Payroll (gross)" value={pack.payroll.reduce((s, p) => s + Number(p.gross ?? 0), 0)} sub={`${pack.payroll.length} pay lines`} />
        <Stat label="Net GST (payments basis)" value={netGst} sub="+ to pay / − refund" />
      </div>

      {/* Needs attention */}
      <h2 className="text-lg font-semibold text-sage-800 mb-3">Before you send it</h2>
      {pack.attention.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800 mb-8">
          <CheckCircle2 size={16} /> Nothing outstanding for this period.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-sage-100 mb-8">
          {pack.attention.map((a, i) => (
            <div key={i} className="flex gap-3 px-5 py-3.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-sage-800">
                  <span className="text-xs font-semibold uppercase tracking-wide text-sage-400 mr-2">{a.area}</span>
                  {a.issue}
                  <span className="text-sage-500"> — {a.count}{a.amount != null ? ` · ${fmt(a.amount)}` : ''}</span>
                </p>
                <p className="text-xs text-sage-500 mt-0.5">{a.action}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Single CSVs */}
      <h2 className="text-lg font-semibold text-sage-800 mb-3">Single reports (CSV)</h2>
      <div className="flex flex-wrap gap-2 mb-6">
        <CsvLink href={`/api/finance/invoices-csv?${q}`} label="Invoice register" />
        <CsvLink href={`/api/finance/contractor-payments-csv?${q}`} label="Contractor payments" />
        <CsvLink href={`/portal/expenses/csv?${q}`} label="Expenses" />
        <CsvLink href={`/api/finance/profit-loss-csv?period=custom&${q}`} label="Profit & loss" />
        <CsvLink href={`/api/finance/job-margins-csv?period=custom&${q}`} label="Job margins" />
      </div>

      <p className="text-xs text-sage-400">
        P&amp;L is cash basis and GST-inclusive (a management view, not a filed statement). Sales GST is shown on both invoice and
        payments basis so the accountant can use whichever Sano files on. Contractor GST is only counted where the contractor’s GST
        registration has been verified.
      </p>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-sage-500">{label}</p>
      <p className={clsx('text-xl font-bold mt-1 tabular-nums', value < 0 ? 'text-red-600' : 'text-sage-800')}>{fmt(value)}</p>
      {sub && <p className="text-xs text-sage-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function CsvLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="inline-flex items-center gap-1.5 border border-sage-200 text-sage-700 px-3 py-1.5 rounded-lg hover:bg-sage-50 transition-colors text-sm">
      <Download size={14} /> {label}
    </a>
  )
}
