// Cash-basis Profit & Loss builder.
//
// "Cash basis" = we count money when it actually moves. Both sides are driven
// off the records that match the bank:
//   • Income → invoices marked paid, by their date_paid
//   • Cost out → the Expenses table, by expense_date
//
// The Expenses table is the single source of truth for money out, because its
// entries reconcile to the ASB bank export (each carries the real bank
// payment reference). That includes contractor payments, which are entered as
// expenses under the `wages_payroll` category as they're paid — so the
// contractor cost of sales is read straight from there, NOT from the separate
// contractor-invoice approval system (which can lag actual payments).
//
// Expenses are bucketed three ways:
//   1. CONTRACTOR_COST_CATEGORY (wages_payroll) → cost of sales (above gross profit)
//   2. accountantConfirm categories (capital_expense, owner equity/loan/drawings)
//      → "below the line": not operating expenses (an asset, or a financing /
//      equity movement). Never in net profit.
//   3. everything else → operating expenses
//
// No tax treatment is implied. Figures are as-entered (GST-inclusive where the
// underlying records are). This is a working management P&L, not a filed
// financial statement.

import { expenseCategoryLabel, isAccountantConfirmCategory } from '@/lib/expense-categories'

/** Expense category whose entries are contractor payments (cost of sales). */
export const CONTRACTOR_COST_CATEGORY = 'wages_payroll'

export interface PLIncomeRow {
  total: number
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
  // "Everything marked as paid" cash tally — mirrors the statement:
  moneyIn: number
  moneyOut: number
  netCash: number
  // Surfaced separately, never in net profit:
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
  expenses: PLExpenseRow[]
  from: string
  to: string
}): ProfitLoss {
  const { from, to } = args

  const income = args.income.filter((r) => inRange(r.datePaid, from, to))
  const incomeTotal = round2(income.reduce((s, r) => s + (r.total ?? 0), 0))

  // Bucket in-range expenses: cost of sales / operating / below-line.
  const cogs = new Map<string, { total: number; count: number }>()
  const operating = new Map<string, { total: number; count: number }>()
  const below = new Map<string, { total: number; count: number }>()

  for (const e of args.expenses) {
    if (!inRange(e.expenseDate, from, to)) continue
    const cat = e.category ?? 'other'
    const amt = e.amount ?? 0
    const bucket = cat === CONTRACTOR_COST_CATEGORY
      ? cogs
      : isAccountantConfirmCategory(cat)
        ? below
        : operating
    const prev = bucket.get(cat) ?? { total: 0, count: 0 }
    bucket.set(cat, { total: prev.total + amt, count: prev.count + 1 })
  }

  const costOfSalesLines = toLines(cogs)
  const costOfSales = round2(costOfSalesLines.reduce((s, l) => s + l.total, 0))
  const costOfSalesCount = costOfSalesLines.reduce((s, l) => s + l.count, 0)
  const grossProfit = round2(incomeTotal - costOfSales)

  const operatingExpenses = toLines(operating)
  const operatingExpensesTotal = round2(operatingExpenses.reduce((s, l) => s + l.total, 0))
  const netProfit = round2(grossProfit - operatingExpensesTotal)

  const belowLine = toLines(below)
  const belowLineTotal = round2(belowLine.reduce((s, l) => s + l.total, 0))

  const moneyOut = round2(costOfSales + operatingExpensesTotal)

  return {
    income: incomeTotal,
    incomeCount: income.length,
    costOfSales,
    costOfSalesCount,
    grossProfit,
    operatingExpenses,
    operatingExpensesTotal,
    netProfit,
    moneyIn: incomeTotal,
    moneyOut,
    netCash: round2(incomeTotal - moneyOut),
    belowLine,
    belowLineTotal,
    grossMarginPct: incomeTotal > 0 ? Math.round((grossProfit / incomeTotal) * 100) : 0,
    netMarginPct: incomeTotal > 0 ? Math.round((netProfit / incomeTotal) * 100) : 0,
  }
}
