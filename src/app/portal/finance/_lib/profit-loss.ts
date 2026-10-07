// Cash-basis Profit & Loss builder.
//
// "Cash basis" = we count money when it actually moves:
//   • Income → invoices marked paid, by their date_paid, at the GST-inclusive
//     amount actually received (a GST-exclusive invoice adds 15% on top).
//   • Contractor cost → PAID contractor remittances, by payment date. Since
//     Aug 2026 remittances are the record of contractor pay; they are no
//     longer re-keyed as expenses (the reconcile screen marks those bank
//     debits "paid via remittance").
//   • Everything else out → the Expenses table, by expense_date.
//
// Before August many remittances WERE also keyed as `contractor_payment`
// expenses. To avoid double counting, a contractor_payment expense that
// matches a remittance (same amount to the cent, dated within
// REMITTANCE_MATCH_DAYS) is treated as that remittance and dropped. Unmatched
// contractor_payment expenses (people paid outside the remittance flow) still
// count as cost of sales.
//
// Expenses are bucketed three ways:
//   1. contractor_payment (unmatched) → cost of sales, alongside remittances
//   2. accountantConfirm categories (capital_expense, owner equity/loan/drawings,
//      IRD payments) → "below the line": never in net profit.
//   3. everything else → operating expenses (incl. employee wages)
//
// Figures are GST-inclusive (the cash that moved). This is a working
// management P&L, not a filed financial statement.

import { expenseCategoryLabel, isAccountantConfirmCategory } from '@/lib/expense-categories'

/** Expense category whose entries are contractor payments (cost of sales). */
export const CONTRACTOR_COST_CATEGORY = 'contractor_payment'

/** A contractor_payment expense within this many days of a remittance of the
 *  identical amount is the same payment keyed twice. */
export const REMITTANCE_MATCH_DAYS = 5

export interface PLIncomeRow {
  total: number
  datePaid: string | null
}
export interface PLExpenseRow {
  amount: number
  category: string | null
  expenseDate: string | null
}
/** A paid contractor remittance (total of its items, by payment date). */
export interface PLRemittanceRow {
  amount: number
  paymentDate: string | null
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
  /** Contractor remittances paid in the period. */
  remittancesTotal: number
  remittancesCount: number
  /** contractor_payment expenses NOT matched to a remittance. */
  otherContractorTotal: number
  otherContractorCount: number
  /** contractor_payment expenses in the period dropped as duplicates of a remittance. */
  duplicatesExcludedTotal: number
  duplicatesExcludedCount: number
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

function dayDiff(a: string, b: string): number {
  return Math.abs(Date.parse(`${a.slice(0, 10)}T00:00:00Z`) - Date.parse(`${b.slice(0, 10)}T00:00:00Z`)) / 86_400_000
}

function toLines(map: Map<string, { total: number; count: number }>): PLCategoryLine[] {
  return Array.from(map.entries())
    .map(([category, v]) => ({ category, label: expenseCategoryLabel(category), total: round2(v.total), count: v.count }))
    .sort((a, b) => b.total - a.total)
}

/**
 * Indexes (into `expenses`) of contractor_payment expenses that duplicate a
 * remittance. Greedy one-to-one: each remittance absorbs at most one expense,
 * the closest-dated one with the identical amount. Runs over ALL rows (not
 * just the period) so a pair straddling a period boundary still matches.
 */
export function findRemittanceDuplicates(expenses: PLExpenseRow[], remittances: PLRemittanceRow[]): Set<number> {
  const dup = new Set<number>()
  for (const r of remittances) {
    if (!r.paymentDate) continue
    const cents = Math.round(r.amount * 100)
    let best = -1
    let bestDiff = Infinity
    expenses.forEach((e, i) => {
      if (dup.has(i) || e.category !== CONTRACTOR_COST_CATEGORY || !e.expenseDate) return
      if (Math.round(e.amount * 100) !== cents) return
      const diff = dayDiff(e.expenseDate, r.paymentDate as string)
      if (diff <= REMITTANCE_MATCH_DAYS && diff < bestDiff) { best = i; bestDiff = diff }
    })
    if (best >= 0) dup.add(best)
  }
  return dup
}

export function buildProfitLoss(args: {
  income: PLIncomeRow[]
  expenses: PLExpenseRow[]
  remittances?: PLRemittanceRow[]
  from: string
  to: string
}): ProfitLoss {
  const { from, to } = args
  const allRemittances = args.remittances ?? []

  const income = args.income.filter((r) => inRange(r.datePaid, from, to))
  const incomeTotal = round2(income.reduce((s, r) => s + (r.total ?? 0), 0))

  const remittances = allRemittances.filter((r) => inRange(r.paymentDate, from, to))
  const remittancesTotal = round2(remittances.reduce((s, r) => s + (r.amount ?? 0), 0))

  const duplicates = findRemittanceDuplicates(args.expenses, allRemittances)

  // Bucket in-range expenses: cost of sales / operating / below-line.
  let otherContractorTotal = 0
  let otherContractorCount = 0
  let duplicatesExcludedTotal = 0
  let duplicatesExcludedCount = 0
  const operating = new Map<string, { total: number; count: number }>()
  const below = new Map<string, { total: number; count: number }>()

  args.expenses.forEach((e, i) => {
    if (!inRange(e.expenseDate, from, to)) return
    const cat = e.category ?? 'other'
    const amt = e.amount ?? 0
    if (cat === CONTRACTOR_COST_CATEGORY) {
      if (duplicates.has(i)) {
        duplicatesExcludedTotal += amt
        duplicatesExcludedCount += 1
      } else {
        otherContractorTotal += amt
        otherContractorCount += 1
      }
      return
    }
    const bucket = isAccountantConfirmCategory(cat) ? below : operating
    const prev = bucket.get(cat) ?? { total: 0, count: 0 }
    bucket.set(cat, { total: prev.total + amt, count: prev.count + 1 })
  })

  otherContractorTotal = round2(otherContractorTotal)
  const costOfSales = round2(remittancesTotal + otherContractorTotal)
  const costOfSalesCount = remittances.length + otherContractorCount
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
    remittancesTotal,
    remittancesCount: remittances.length,
    otherContractorTotal,
    otherContractorCount,
    duplicatesExcludedTotal: round2(duplicatesExcludedTotal),
    duplicatesExcludedCount,
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
