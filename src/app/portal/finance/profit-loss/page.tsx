import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { ArrowLeft, Info } from 'lucide-react'
import { isAdminUser } from '@/lib/is-admin'
import { notFound } from 'next/navigation'
import { PeriodFilter } from '../_components/PeriodFilter'
import { resolvePeriod } from '../_lib/periods'
import { buildProfitLoss } from '../_lib/profit-loss'
import clsx from 'clsx'

export const dynamic = 'force-dynamic'

function fmt(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

function fmtRange(from: string, to: string) {
  const f = new Date(from).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
  const t = new Date(to).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${f} – ${t}`
}

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: { period?: string; from?: string; to?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const periodKey = searchParams.period ?? 'ytd'
  const { from, to } = resolvePeriod(periodKey, searchParams.from, searchParams.to)

  // Cash basis: income from paid invoices, all cost out from the Expenses
  // table (which reconciles to the ASB bank export). The builder owns the
  // basis + bucketing logic for testability. Volumes are small.
  const [{ data: invoices }, { data: expenses }] = await Promise.all([
    supabase
      .from('invoices')
      .select('base_price, discount, date_paid, invoice_items ( price )')
      .eq('status', 'paid')
      .is('deleted_at', null)
      .not('is_test', 'is', true),
    supabase
      .from('expenses')
      .select('amount, category, expense_date'),
  ])

  const income = (invoices ?? []).map((i) => {
    const items = (i.invoice_items ?? []) as { price: number }[]
    const addons = items.reduce((s, it) => s + (it.price ?? 0), 0)
    return {
      total: (i.base_price ?? 0) + addons - (i.discount ?? 0),
      datePaid: (i.date_paid as string | null) ?? null,
    }
  })
  const expenseRows = (expenses ?? []).map((e) => ({
    amount: (e.amount as number | null) ?? 0,
    category: (e.category as string | null) ?? null,
    expenseDate: (e.expense_date as string | null) ?? null,
  }))

  const pl = buildProfitLoss({ income, expenses: expenseRows, from, to })

  return (
    <div className="tnum max-w-3xl">
      <Link href="/portal/finance" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Finance</Link>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
        <h1 className="text-3xl tracking-tight font-bold text-sage-800">Profit &amp; Loss</h1>
        <a href={`/api/finance/profit-loss-csv?period=${periodKey}&from=${from}&to=${to}`} className="inline-flex items-center gap-1.5 border border-sage-200 text-sage-700 px-3 py-1.5 rounded-lg hover:bg-sage-50 transition-colors text-sm">Download CSV</a>
      </div>
      <p className="text-sm text-sage-500 mb-6">Cash basis · {fmtRange(from, to)}</p>

      <PeriodFilter current={periodKey} customFrom={searchParams.from} customTo={searchParams.to} basePath="/portal/finance/profit-loss" />

      {/* Money in / out / net — everything marked as paid, at a glance. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Tally label="Money in (received)" value={pl.moneyIn} tone="in" sub={`${pl.incomeCount} paid invoice${pl.incomeCount !== 1 ? 's' : ''}`} />
        <Tally label="Money out (paid)" value={pl.moneyOut} tone="out" sub="contractors + expenses" />
        <Tally label="Net" value={pl.netCash} tone="net" sub={`${pl.netMarginPct}% of income`} />
      </div>

      {/* Statement */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Row label="Income" sub={`${pl.incomeCount} paid invoice${pl.incomeCount !== 1 ? 's' : ''}`} value={pl.income} strong />
        <Row label="Less cost of sales — contractor payments" sub={`${pl.costOfSalesCount} payment${pl.costOfSalesCount !== 1 ? 's' : ''}`} value={-pl.costOfSales} />
        <Row label="Gross profit" value={pl.grossProfit} strong divider sub={`${pl.grossMarginPct}% margin`} />

        {/* Operating expenses */}
        <div className="px-5 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-sage-400">Operating expenses</div>
        {pl.operatingExpenses.length === 0 ? (
          <div className="px-5 py-2 text-sm text-sage-400">None in this period.</div>
        ) : (
          pl.operatingExpenses.map((l) => (
            <Row key={l.category} label={l.label} sub={`${l.count} item${l.count !== 1 ? 's' : ''}`} value={-l.total} indent />
          ))
        )}
        <Row label="Total operating expenses" value={-pl.operatingExpensesTotal} divider />

        <Row label="Net profit / (loss)" value={pl.netProfit} strong xl divider sub={`${pl.netMarginPct}% of income`} />
      </div>

      {/* Below the line — capital / equity / financing */}
      {pl.belowLine.length > 0 && (
        <Note tone="amber">
          <strong>Below the line (not in net profit):</strong> {pl.belowLine.map((l) => `${l.label} (${fmt(l.total)})`).join(', ')}.
          These are capital or owner equity / loan / drawings movements, not operating costs — confirm treatment with your accountant.
        </Note>
      )}

      <p className="text-xs text-sage-400 mt-6">
        Cash basis: income = invoices marked paid (by payment date); cost out = the Expenses table (by expense date), which
        reconciles to the bank. Contractor payments are read from the Wages / payroll expense category. Figures are as-entered and
        GST-inclusive where the source records are. This is a working management view, not a filed financial statement — confirm
        final categories and treatment with your accountant.
      </p>
    </div>
  )
}

function Row({ label, sub, value, strong, xl, indent, divider }: {
  label: string
  sub?: string
  value: number
  strong?: boolean
  xl?: boolean
  indent?: boolean
  divider?: boolean
}) {
  return (
    <div className={clsx('flex items-baseline justify-between px-5 py-2.5', divider && 'border-t border-sage-100', indent && 'pl-9')}>
      <div>
        <span className={clsx(strong ? 'font-semibold text-sage-800' : 'text-sage-600', xl && 'text-lg')}>{label}</span>
        {sub && <span className="text-xs text-sage-400 ml-2">{sub}</span>}
      </div>
      <span className={clsx(
        'tabular-nums',
        xl ? 'text-lg' : 'text-sm',
        strong ? 'font-bold' : 'font-medium',
        value < 0 ? 'text-sage-500' : strong && value >= 0 ? 'text-emerald-700' : 'text-sage-800',
      )}>
        {value < 0 ? `(${fmt(Math.abs(value))})` : fmt(value)}
      </span>
    </div>
  )
}

function Tally({ label, value, tone, sub }: { label: string; value: number; tone: 'in' | 'out' | 'net'; sub?: string }) {
  const negative = value < 0
  return (
    <div className={clsx(
      'rounded-xl border p-4',
      tone === 'in' ? 'bg-emerald-50 border-emerald-100' : tone === 'out' ? 'bg-white border-gray-100 shadow-sm' : 'bg-sage-50 border-sage-100',
    )}>
      <p className="text-xs font-semibold uppercase tracking-wide text-sage-500">{label}</p>
      <p className={clsx(
        'text-2xl font-bold mt-1 tabular-nums',
        tone === 'in' ? 'text-emerald-700' : tone === 'net' ? (negative ? 'text-red-600' : 'text-sage-800') : 'text-sage-700',
      )}>
        {tone === 'out' ? fmt(value) : negative ? `(${fmt(Math.abs(value))})` : fmt(value)}
      </p>
      {sub && <p className="text-xs text-sage-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function Note({ tone, children }: { tone: 'sage' | 'amber'; children: React.ReactNode }) {
  return (
    <div className={clsx(
      'flex gap-2 rounded-xl border p-4 mt-4 text-sm',
      tone === 'amber' ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-sage-50 border-sage-100 text-sage-700',
    )}>
      <Info size={16} className="shrink-0 mt-0.5" />
      <p>{children}</p>
    </div>
  )
}
