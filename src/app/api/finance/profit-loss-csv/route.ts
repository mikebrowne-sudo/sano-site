// Cash-basis Profit & Loss CSV — admin-only. Mirrors the on-screen P&L
// statement at /portal/finance/profit-loss for the same period so the
// accountant gets a single tidy summary. Read-only.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isFinanceEmail } from '@/lib/is-admin'
import { buildCsv, csvResponse } from '@/lib/csv'
import { resolvePeriod } from '@/app/portal/finance/_lib/periods'
import { buildProfitLoss } from '@/app/portal/finance/_lib/profit-loss'
import { loadProfitLossInputs } from '@/app/portal/finance/_lib/profit-loss-data'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isFinanceEmail(user.email)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const sp = new URL(request.url).searchParams
  const { from, to } = resolvePeriod(sp.get('period') ?? 'ytd', sp.get('from') ?? undefined, sp.get('to') ?? undefined)

  const inputs = await loadProfitLossInputs(supabase, { from, to })
  const pl = buildProfitLoss({ ...inputs, from, to })

  const rows: Array<Array<string | number>> = [
    ['Period', `${from} to ${to}`],
    ['Basis', 'Cash (received / paid), GST-inclusive'],
    [],
    ['Money in (received)', `${pl.incomeCount} paid invoices`, pl.moneyIn.toFixed(2)],
    ['Money out (paid)', 'contractors + expenses', (-pl.moneyOut).toFixed(2)],
    ['Net', `${pl.netMarginPct}% of income`, pl.netCash.toFixed(2)],
    [],
    ['Line', 'Detail', 'Amount (NZD)'],
    ['Income', `${pl.incomeCount} paid invoices`, pl.income.toFixed(2)],
    ['Less cost of sales — contractor payments', `${pl.costOfSalesCount} payments`, (-pl.costOfSales).toFixed(2)],
    ['   Remittances paid', `${pl.remittancesCount}`, (-pl.remittancesTotal).toFixed(2)],
    ['   Other contractor payments (expenses)', `${pl.otherContractorCount}`, (-pl.otherContractorTotal).toFixed(2)],
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
  if (pl.duplicatesExcludedCount > 0) {
    rows.push([], ['Excluded — contractor-payment expenses duplicating a remittance', `${pl.duplicatesExcludedCount} items`, pl.duplicatesExcludedTotal.toFixed(2)])
  }

  const csv = buildCsv(rows[0].map(String), rows.slice(1))
  return csvResponse(csv, `sano-profit-loss-${from}-to-${to}.csv`)
}
