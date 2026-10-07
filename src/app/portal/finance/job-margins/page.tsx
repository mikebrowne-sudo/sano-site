import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { ArrowLeft, Info, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { notFound } from 'next/navigation'
import { isFinanceUser } from '@/lib/is-admin'
import { PeriodFilter } from '../_components/PeriodFilter'
import { resolvePeriod } from '../_lib/periods'
import { buildJobMarginReport, type InvoicedFilter, type MarginSort } from '../_lib/job-margins'
import { MarginFilters } from './_components/MarginFilters'

export const dynamic = 'force-dynamic'

function fmt(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function JobMarginsPage({
  searchParams,
}: {
  searchParams: { period?: string; from?: string; to?: string; invoiced?: string; customer?: string; sort?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isFinanceUser(user)) notFound()

  const periodKey = searchParams.period ?? 'ytd'
  const { from, to } = resolvePeriod(periodKey, searchParams.from, searchParams.to)
  const invoiced: InvoicedFilter = searchParams.invoiced === 'invoiced' || searchParams.invoiced === 'not_invoiced' ? searchParams.invoiced : 'all'
  const sort: MarginSort = searchParams.sort === 'margin_desc' || searchParams.sort === 'margin_asc' ? searchParams.sort : 'default'
  const customerId = searchParams.customer || null

  const { rows, totals, customers } = await buildJobMarginReport(supabase, { from, to, invoiced, customerId, sort })

  const q = new URLSearchParams({
    period: periodKey,
    ...(searchParams.from ? { from: searchParams.from } : {}),
    ...(searchParams.to ? { to: searchParams.to } : {}),
    ...(invoiced !== 'all' ? { invoiced } : {}),
    ...(customerId ? { customer: customerId } : {}),
    ...(sort !== 'default' ? { sort } : {}),
  }).toString()

  return (
    <div className="max-w-6xl">
      <Link href="/portal/finance" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4"><ArrowLeft size={14} /> Finance</Link>
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Job margins</h1>
        <a href={`/api/finance/job-margins-csv?${q}`} className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-700 hover:bg-sage-50">Download CSV</a>
      </div>
      <p className="text-sm text-sage-500 mb-5 max-w-3xl">
        Gross margin per completed job — job price minus labour and ACC on-cost. Same figure shown on each job&apos;s
        detail page. Thinnest and loss-making jobs are listed first. Materials/expenses are not deducted here.
      </p>

      <PeriodFilter current={periodKey} customFrom={searchParams.from} customTo={searchParams.to} basePath="/portal/finance/job-margins" />
      <MarginFilters invoiced={invoiced} customerId={customerId} sort={sort} customers={customers} />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-6 max-w-4xl">
        <Stat label="Jobs" value={String(totals.jobs)} />
        <Stat label="Total price" value={fmt(totals.price)} />
        <Stat label="Labour cost" value={fmt(totals.labourCost)} />
        <Stat label="Gross profit" value={fmt(totals.grossProfit)} sub={`${totals.marginPercent}% blended`} tone={totals.grossProfit >= 0 ? 'good' : 'bad'} />
        <Stat label="Need review" value={String(totals.needsReview)} tone={totals.needsReview > 0 ? 'warn' : undefined} />
      </div>

      <div className="mb-4 rounded-lg border border-sage-100 bg-sage-50/60 px-4 py-3 text-xs text-sage-600 flex gap-2 max-w-3xl">
        <Info size={15} className="shrink-0 mt-0.5" />
        <span>Labour-based gross margin. Contractor cost + ACC only — client price is the job&apos;s recorded value. A <strong>100%</strong> margin usually means <strong>no worker cost is recorded yet</strong> — click the row to open the job and assign a contractor / set hours.</span>
      </div>

      {totals.needsReview > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2 max-w-3xl">
          <AlertTriangle size={16} className="shrink-0" />
          <span><strong>{totals.needsReview}</strong> job{totals.needsReview === 1 ? '' : 's'} show 100% because no labour cost is recorded. They&apos;re listed first — click one to fix it on the job page.</span>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sage-400 shadow-sm">No completed jobs with a price in this period.</div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-left text-xs text-sage-400 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Job</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Completed</th>
                  <th className="px-4 py-3 font-medium text-right">Price</th>
                  <th className="px-4 py-3 font-medium text-right">Labour</th>
                  <th className="px-4 py-3 font-medium text-right">Gross profit</th>
                  <th className="px-4 py-3 font-medium text-right">Margin / status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={clsx('border-b border-gray-50 last:border-0 hover:bg-sage-50/50 transition-colors', r.needsCostReview && 'bg-amber-50/40')}>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <Link href={`/portal/jobs/${r.id}`} className="font-medium text-sage-700 hover:text-sage-900 hover:underline">{r.jobNumber ?? '—'}</Link>
                      {r.title && <span className="block max-w-[220px] truncate text-xs text-sage-400">{r.title}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-sage-600 max-w-[200px] truncate">{r.client ?? '—'}</td>
                    <td className="px-4 py-2.5 text-sage-500 whitespace-nowrap">{fmtDate(r.completedAt)}</td>
                    <td className="px-4 py-2.5 text-right text-sage-700">{fmt(r.jobPrice)}</td>
                    <td className="px-4 py-2.5 text-right text-sage-500">{fmt(r.labourCost)}</td>
                    <td className={clsx('px-4 py-2.5 text-right font-medium', r.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600')}>{fmt(r.grossProfit)}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {r.needsCostReview ? (
                        <Link href={`/portal/jobs/${r.id}`} className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium hover:bg-amber-200">
                          <AlertTriangle size={11} /> {r.workerCount === 0 ? 'No contractor' : 'No hours/rate'} — fix
                        </Link>
                      ) : (
                        <span className={clsx('font-semibold', r.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600')}>{r.marginPercent}%</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-sage-200 font-semibold text-sage-800">
                  <td className="px-4 py-3" colSpan={3}>Total ({totals.jobs} jobs)</td>
                  <td className="px-4 py-3 text-right">{fmt(totals.price)}</td>
                  <td className="px-4 py-3 text-right">{fmt(totals.labourCost)}</td>
                  <td className={clsx('px-4 py-3 text-right', totals.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600')}>{fmt(totals.grossProfit)}</td>
                  <td className={clsx('px-4 py-3 text-right', totals.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600')}>{totals.marginPercent}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className={clsx('text-2xl font-bold tabular-nums', tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-700' : 'text-sage-800')}>{value}</div>
      <div className="text-xs text-sage-500 mt-0.5">{label}{sub ? <span className="text-sage-400"> · {sub}</span> : ''}</div>
    </div>
  )
}
