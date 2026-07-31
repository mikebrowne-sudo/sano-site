// Dashboard financial series — the data engine for the hero net-position figure
// and the month-on-month income-vs-expenses graph. Reuses the SAME income /
// expense definitions as the P&L (buildProfitLoss), so the dashboard can never
// disagree with the P&L statement. Admin-only caller; read-only.

import type { SupabaseClient } from '@supabase/supabase-js'
import { buildProfitLoss, type PLIncomeRow, type PLExpenseRow } from '@/app/portal/finance/_lib/profit-loss'

export interface MonthPoint {
  /** Month key 'YYYY-MM'. */
  month: string
  /** e.g. 'Aug' (short) for axis labels. */
  label: string
  income: number     // money in (paid invoices) that month
  expenses: number   // money out (all expenses) that month
  net: number        // income − expenses
  /** True for the current, still-in-progress month (its figures are partial). */
  partial: boolean
}

export interface DashboardFinance {
  months: MonthPoint[]
  /** Cumulative net position across the whole window (running money in − out). */
  netPosition: number
  /** This month's net (income − expenses). */
  thisMonthNet: number
  /** Last month's net, for the trend arrow. */
  lastMonthNet: number
  /** This month's income (money received). */
  thisMonthIncome: number
  /** % change in net vs last month (null when last month was 0). */
  netChangePct: number | null
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthKey(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}`
}
function monthBounds(y: number, m: number): { from: string; to: string } {
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { from: `${monthKey(y, m)}-01`, to: `${monthKey(y, m)}-${String(last).padStart(2, '0')}` }
}

/**
 * Build the trailing `count`-month finance series ending in the month containing
 * `today` (a 'YYYY-MM-DD' string, passed in so this stays testable). Loads paid
 * invoices + expenses once, then computes each month's money-in / money-out via
 * buildProfitLoss (moneyIn / moneyOut) — identical to the P&L.
 */
export async function buildDashboardFinance(
  supabase: SupabaseClient,
  today: string,
  count = 12,
): Promise<DashboardFinance> {
  const [ty, tm] = today.slice(0, 7).split('-').map(Number)

  // Walk back count-1 months from (ty, tm) → the ordered month list + query window.
  const months: { y: number; m: number }[] = []
  let cy = ty, cm = tm
  for (let i = 0; i < count; i++) {
    months.unshift({ y: cy, m: cm })
    cm -= 1
    if (cm === 0) { cm = 12; cy -= 1 }
  }
  const windowStart = monthBounds(months[0].y, months[0].m).from
  const windowEnd = monthBounds(months[months.length - 1].y, months[months.length - 1].m).to

  const [{ data: invRaw }, { data: expRaw }] = await Promise.all([
    supabase.from('invoices')
      .select('base_price, discount, date_paid, invoice_items ( price )')
      .eq('status', 'paid')
      .gte('date_paid', windowStart).lte('date_paid', windowEnd),
    supabase.from('expenses')
      .select('amount, category, expense_date')
      .gte('expense_date', windowStart).lte('expense_date', windowEnd),
  ])

  const income: PLIncomeRow[] = ((invRaw ?? []) as Array<Record<string, unknown>>).map((i) => {
    const items = (i.invoice_items ?? []) as Array<{ price: number | null }>
    const itemsTotal = items.reduce((s, it) => s + (it.price ?? 0), 0)
    const base = (i.base_price as number | null) ?? 0
    const discount = (i.discount as number | null) ?? 0
    return { total: base + itemsTotal - discount, datePaid: (i.date_paid as string | null) ?? null }
  })
  const expenses: PLExpenseRow[] = ((expRaw ?? []) as Array<Record<string, unknown>>).map((e) => ({
    amount: (e.amount as number | null) ?? 0,
    category: (e.category as string | null) ?? null,
    expenseDate: (e.expense_date as string | null) ?? null,
  }))

  const currentKey = monthKey(ty, tm)
  const points: MonthPoint[] = months.map(({ y, m }) => {
    const { from, to } = monthBounds(y, m)
    const pl = buildProfitLoss({ income, expenses, from, to })
    const key = monthKey(y, m)
    return {
      month: key,
      label: MONTH_LABELS[m - 1],
      income: pl.moneyIn,
      expenses: pl.moneyOut,
      net: Math.round((pl.moneyIn - pl.moneyOut) * 100) / 100,
      partial: key === currentKey,   // the trailing month is still in progress
    }
  })

  const netPosition = Math.round(points.reduce((s, p) => s + p.net, 0) * 100) / 100
  const thisMonthNet = points[points.length - 1]?.net ?? 0
  const lastMonthNet = points[points.length - 2]?.net ?? 0
  const thisMonthIncome = points[points.length - 1]?.income ?? 0
  const netChangePct = lastMonthNet !== 0
    ? Math.round(((thisMonthNet - lastMonthNet) / Math.abs(lastMonthNet)) * 100)
    : null

  return { months: points, netPosition, thisMonthNet, lastMonthNet, thisMonthIncome, netChangePct }
}
