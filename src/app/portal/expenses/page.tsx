// Expenses — admin-only simple expense capture + totals by category.
//
// Manual expense records entered from bank transactions. Period filter,
// totals by category, and accountant-friendly CSV export. No GST math, no
// tax treatment (capital / owner-equity categories are flagged).

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser, isFinanceUser } from '@/lib/is-admin'
import { getPeriods, resolvePeriod } from '../finance/_lib/periods'
import { expenseCategoryLabel, isAccountantConfirmCategory } from '@/lib/expense-categories'
import { Wallet2, Plus, Download } from 'lucide-react'

export const dynamic = 'force-dynamic'

function fmt(d: number | null) {
  if (d == null) return '—'
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(d)
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface ExpenseRow {
  id: string
  expense_date: string | null
  amount: number | null
  category: string | null
  vendor: string | null
  description: string | null
  payment_reference: string | null
  gst_inclusive: boolean | null
}

type SP = { period?: string; from?: string; to?: string }

export default async function ExpensesPage({ searchParams }: { searchParams?: SP }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isFinanceUser(user)) notFound()
  const canEdit = isAdminUser(user) // accountants are read-only

  const f = searchParams ?? {}
  const periodKey = f.period ?? 'all'
  const range = periodKey === 'all' ? null : resolvePeriod(periodKey, f.from, f.to)

  let query = supabase
    .from('expenses')
    .select('id, expense_date, amount, category, vendor, description, payment_reference, gst_inclusive')
    .order('expense_date', { ascending: false })
  if (range) query = query.gte('expense_date', range.from).lte('expense_date', range.to)

  const { data: rows, error } = await query

  if (error) {
    return (
      <div>
        <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-8">Expenses</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
          {error.message}
          <p className="text-red-500 text-xs mt-2">If this mentions a missing table, the expenses migration has not been run yet.</p>
        </div>
      </div>
    )
  }

  const expenses = (rows as unknown as ExpenseRow[] ?? [])
  const total = Math.round(expenses.reduce((s, e) => s + (e.amount ?? 0), 0) * 100) / 100

  // Totals by category.
  const byCat = new Map<string, { total: number; n: number }>()
  for (const e of expenses) {
    const c = e.category ?? 'other'
    const cur = byCat.get(c) ?? { total: 0, n: 0 }
    cur.total += e.amount ?? 0
    cur.n += 1
    byCat.set(c, cur)
  }
  const categoryTotals = Array.from(byCat.entries())
    .map(([category, v]) => ({ category, total: Math.round(v.total * 100) / 100, n: v.n }))
    .sort((a, b) => b.total - a.total)

  const csvQuery = range ? `?from=${range.from}&to=${range.to}` : ''
  const input = 'rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Wallet2 className="text-sage-500" size={26} />
          <h1 className="text-3xl tracking-tight font-bold text-sage-800">Expenses</h1>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/portal/expenses/csv${csvQuery}`} className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors">
            <Download size={16} /> Export CSV
          </a>
          {canEdit && (
            <Link href="/portal/expenses/new" className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors">
              <Plus size={16} /> Add expense
            </Link>
          )}
        </div>
      </div>

      {/* Period filter — plain GET form */}
      <form method="get" className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Period</span>
          <select name="period" defaultValue={periodKey} className={input}>
            <option value="all">All time</option>
            {getPeriods().map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            <option value="custom">Custom…</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">From</span>
          <input type="date" name="from" defaultValue={f.from ?? ''} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">To</span>
          <input type="date" name="to" defaultValue={f.to ?? ''} className={input} />
        </label>
        <button type="submit" className="bg-sage-500 text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-sage-700 transition-colors">Apply</button>
        <Link href="/portal/expenses" className="text-sm text-sage-500 hover:text-sage-700">Clear</Link>
        <span className="ml-auto text-sm text-sage-600">Total: <span className="font-bold text-sage-800 tnum">{fmt(total)}</span> <span className="text-sage-400">({expenses.length})</span></span>
      </form>

      {/* Totals by category */}
      {categoryTotals.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
          <h2 className="text-sm font-semibold text-sage-700 mb-3">Totals by category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 tnum">
            {categoryTotals.map((c) => (
              <div key={c.category} className="rounded-lg border border-sage-100 p-3">
                <div className="text-[11px] text-sage-500 font-medium flex items-center gap-1">
                  {expenseCategoryLabel(c.category)}
                  {isAccountantConfirmCategory(c.category) && <span className="text-amber-600" title="Confirm treatment with accountant">*</span>}
                </div>
                <div className="text-lg font-bold text-sage-800 mt-0.5">{fmt(c.total)}</div>
                <div className="text-[10px] text-sage-400">{c.n} item{c.n === 1 ? '' : 's'}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-sage-400 mt-3">* Capital expense and owner loan / contribution / drawings are captured for reference and need accountant confirmation — they are not treated as ordinary expenses.</p>
        </div>
      )}

      {/* Detail table */}
      {expenses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <Wallet2 size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm">No expenses recorded for this period.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden tnum">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Vendor</th>
                  <th className="px-5 py-3 font-semibold">Description</th>
                  <th className="px-5 py-3 font-semibold">Reference</th>
                  <th className="px-5 py-3 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 align-top whitespace-nowrap text-sage-700">{fmtDate(e.expense_date)}</td>
                    <td className="px-5 py-3 align-top">
                      <Link href={`/portal/expenses/${e.id}/edit`} className="font-medium text-sage-800 hover:underline">
                        {expenseCategoryLabel(e.category)}
                      </Link>
                      {isAccountantConfirmCategory(e.category) && <span className="text-amber-600 ml-1" title="Confirm with accountant">*</span>}
                      {e.gst_inclusive === false && <span className="ml-1.5 text-[10px] text-sage-400">(GST excl)</span>}
                    </td>
                    <td className="px-5 py-3 align-top text-sage-700">{e.vendor ?? '—'}</td>
                    <td className="px-5 py-3 align-top text-sage-600">{e.description ?? '—'}</td>
                    <td className="px-5 py-3 align-top text-sage-400">{e.payment_reference ?? '—'}</td>
                    <td className="px-5 py-3 align-top text-right font-medium text-sage-800">{fmt(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
