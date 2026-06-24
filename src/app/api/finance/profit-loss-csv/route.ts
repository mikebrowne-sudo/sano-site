// Cash-basis Profit & Loss CSV — admin-only. Mirrors the on-screen P&L
// statement at /portal/finance/profit-loss for the same period so the
// accountant gets a single tidy summary. Read-only.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isAdminEmail } from '@/lib/is-admin'
import { buildCsv, csvResponse } from '@/lib/csv'
import { resolvePeriod } from '@/app/portal/finance/_lib/periods'
import { buildProfitLoss } from '@/app/portal/finance/_lib/profit-loss'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const sp = new URL(request.url).searchParams
  const { from, to } = resolvePeriod(sp.get('period') ?? 'ytd', sp.get('from') ?? undefined, sp.get('to') ?? undefined)

  const [{ data: invoices }, { data: expenses }] = await Promise.all([
    supabase.from('invoices').select('base_price, discount, date_paid, invoice_items ( price )').eq('status', 'paid').is('deleted_at', null).not('is_test', 'is', true),
    supabase.from('expenses').select('amount, category, expense_date'),
  ])

  const income = (invoices ?? []).map((i) => {
    const items = (i.invoice_items ?? []) as { price: number }[]
    const addons = items.reduce((s, it) => s + (it.price ?? 0), 0)
    return { total: (i.base_price ?? 0) + addons - (i.discount ?? 0), datePaid: (i.date_paid as string | null) ?? null }
  })
  const expenseRows = (expenses ?? []).map((e) => ({ amount: (e.amount as number | null) ?? 0, category: (e.category as string | null) ?? null, expenseDate: (e.expense_date as string | null) ?? null }))

  const pl = buildProfitLoss({ income, expenses: expenseRows, from, to })

  const rows: Array<Array<string | number>> = [
    ['Period', `${from} to ${to}`],
    ['Basis', 'Cash (received / paid)'],
    [],
    ['Money in (received)', `${pl.incomeCount} paid invoices`, pl.moneyIn.toFixed(2)],
    ['Money out (paid)', 'contractors + expenses', (-pl.moneyOut).toFixed(2)],
    ['Net', `${pl.netMarginPct}% of income`, pl.netCash.toFixed(2)],
    [],
    ['Line', 'Detail', 'Amount (NZD)'],
    ['Income', `${pl.incomeCount} paid invoices`, pl.income.toFixed(2)],
    ['Less cost of sales — contractor payments', `${pl.costOfSalesCount} payments`, (-pl.costOfSales).toFixed(2)],
    ['Gross profit', `${pl.grossMarginPct}% margin`, pl.grossProfit.toFixed(2)],
    [],
    ['Operating expenses', '', ''],
    ...pl.operatingExpenses.map((l) => [l.label, `${l.count} items`, (-l.total).toFixed(2)]),
    ['Total operating expenses', '', (-pl.operatingExpensesTotal).toFixed(2)],
    [],
    ['Net profit / (loss)', `${pl.netMarginPct}% of income`, pl.netProfit.toFixed(2)],
  ]

  if (pl.belowLine.length > 0) {
    rows.push([], ['Below the line — capital / owner equity (not in net profit)', '', ''])
    for (const l of pl.belowLine) rows.push([l.label, `${l.count} items`, l.total.toFixed(2)])
  }

  const csv = buildCsv(rows[0].map(String), rows.slice(1))
  return csvResponse(csv, `sano-profit-loss-${from}-to-${to}.csv`)
}
