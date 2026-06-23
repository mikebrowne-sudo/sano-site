// Cash-basis Profit & Loss builder.
//
// "Cash basis" = we count money when it actually moves, not when it is
// invoiced/incurred:
//   • Income      → invoices marked paid, by their date_paid
//   • Cost of sales → contractor payments marked paid, by their date_paid
//   • Operating   → expenses, by their expense_date
//
// Two deliberate exclusions from net profit, both surfaced separately so the
// statement is transparent rather than silently trimmed:
//
//   1. DOUBLE-COUNT categories (wages_payroll) — these expense entries are the
//      same money already captured as contractor cost of sales. Counting them
//      again would double-count the cost. Confirmed with the owner that the
//      wages/payroll entries are the contractors. Shown as an excluded note.
//
//   2. accountantConfirm categories (capital_expense, owner equity/drawings) —
//      not ordinary operating expenses (an asset, or equity movement). Shown
//      "below the line", never in net profit.
//
// No tax treatment is implied. Figures are as-entered (GST-inclusive where the
// underlying records are GST-inclusive). This is a working management P&L, not
// a filed financial statement.

import { expenseCategoryLabel, isAccountantConfirmCategory } from '@/lib/expense-categories'

/** Expense categories whose money is already counted elsewhere in the P&L. */
export const DOUBLE_COUNT_EXPENSE_CATEGORIES: readonly string[] = ['wages_payroll']

export interface PLIncomeRow {
  total: number
  datePaid: string | null
}
export interface PLContractorRow {
  amount: number
  datePaid: string | null
}
export interface PLExpenseRow {
  amount: number
  category: string | null
  expenseDate: string | null
}

export interface PLCategoryLine {
  category: string
  label: string
  total: number
  count: number
}

export interface ProfitLoss {
  income: number
  incomeCount: number
  costOfSales: number
  costOfSalesCount: number
  grossProfit: number
  operatingExpenses: PLCategoryLine[]
  operatingExpensesTotal: number
  netProfit: number
  excludedDoubleCount: PLCategoryLine[]
  excludedDoubleCountTotal: number
  belowLine: PLCategoryLine[]
  belowLineTotal: number
  grossMarginPct: number
  netMarginPct: number
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function inRange(d: string | null, from: string, to: string): boolean {
  return !!d && d >= from && d <= to
}

function toLines(map: Map<string, { total: number; count: number }>): PLCategoryLine[] {
  return Array.from(map.entries())
    .map(([category, v]) => ({ category, label: expenseCategoryLabel(category), total: round2(v.total), count: v.count }))
    .sort((a, b) => b.total - a.total)
}

export function buildProfitLoss(args: {
  income: PLIncomeRow[]
  contractors: PLContractorRow[]
  expenses: PLExpenseRow[]
  from: string
  to: string
}): ProfitLoss {
  const { from, to } = args

  const income = args.income.filter((r) => inRange(r.datePaid, from, to))
  const incomeTotal = round2(income.reduce((s, r) => s + (r.total ?? 0), 0))

  const contractors = args.contractors.filter((r) => inRange(r.datePaid, from, to))
  const costOfSales = round2(contractors.reduce((s, r) => s + (r.amount ?? 0), 0))

  const grossProfit = round2(incomeTotal - costOfSales)

  // Bucket expenses by category into operating / excluded-double-count / below-line.
  const operating = new Map<string, { total: number; count: number }>()
  const excluded = new Map<string, { total: number; count: number }>()
  const below = new Map<string, { total: number; count: number }>()

  for (const e of args.expenses) {
    if (!inRange(e.expenseDate, from, to)) continue
    const cat = e.category ?? 'other'
    const amt = e.amount ?? 0
    const bucket = isAccountantConfirmCategory(cat)
      ? below
      : DOUBLE_COUNT_EXPENSE_CATEGORIES.includes(cat)
        ? excluded
        : operating
    const prev = bucket.get(cat) ?? { total: 0, count: 0 }
    bucket.set(cat, { total: prev.total + amt, count: prev.count + 1 })
  }

  const operatingExpenses = toLines(operating)
  const operatingExpensesTotal = round2(operatingExpenses.reduce((s, l) => s + l.total, 0))
  const netProfit = round2(grossProfit - operatingExpensesTotal)

  const excludedDoubleCount = toLines(excluded)
  const excludedDoubleCountTotal = round2(excludedDoubleCount.reduce((s, l) => s + l.total, 0))

  const belowLine = toLines(below)
  const belowLineTotal = round2(belowLine.reduce((s, l) => s + l.total, 0))

  return {
    income: incomeTotal,
    incomeCount: income.length,
    costOfSales,
    costOfSalesCount: contractors.length,
    grossProfit,
    operatingExpenses,
    operatingExpensesTotal,
    netProfit,
    excludedDoubleCount,
    excludedDoubleCountTotal,
    belowLine,
    belowLineTotal,
    grossMarginPct: incomeTotal > 0 ? Math.round((grossProfit / incomeTotal) * 100) : 0,
    netMarginPct: incomeTotal > 0 ? Math.round((netProfit / incomeTotal) * 100) : 0,
  }
}
