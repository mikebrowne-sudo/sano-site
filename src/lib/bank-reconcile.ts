// Bank reconciliation matcher.
//
// Given parsed ASB transactions plus the portal's invoices and expenses, work
// out what reconciles and what doesn't — purely, so it can be unit-tested and
// re-run on demand. No writes; the UI turns the "action" hints into buttons.
//
// Money IN (credits) → invoices:
//   - reconciled     : matched an invoice already marked paid (nothing to do)
//   - unpaid_match   : matched an invoice NOT marked paid → action: mark paid
//   - amount_match   : no invoice ref, but exactly one unpaid invoice has the
//                      same amount → likely that one (action: mark paid)
//   - financing      : owner contribution / loan / internal transfer (not income)
//   - unmatched      : couldn't tie to anything → manual
//
// Money OUT (debits) → expenses:
//   - recorded       : an expense with the same amount near the same date exists
//   - not_recorded   : no matching expense → action: add expense
//
// Matching is heuristic (we don't store ASB's Unique Id on our records), so the
// UI always shows the bank line next to its suggested match for a human check.

import type { BankTxn } from './asb-import'

export interface ReconInvoice {
  id: string
  invoiceNumber: string
  status: string
  total: number
  datePaid: string | null
  client?: string
  address?: string
}
export interface ReconExpense {
  amount: number
  expenseDate: string | null
}

// reconcile() emits the first five. 'likely_bundle' / 'likely_match' are
// display-only states the page derives for an unmatched credit when a
// payer-scoped subset of invoices plausibly explains it.
export type CreditStatus = 'reconciled' | 'unpaid_match' | 'amount_match' | 'financing' | 'unmatched' | 'likely_bundle' | 'likely_match'
export type DebitStatus = 'recorded' | 'not_recorded'

export interface CreditRow {
  txn: BankTxn
  status: CreditStatus
  invoice: ReconInvoice | null
}
export interface DebitRow {
  txn: BankTxn
  status: DebitStatus
  expense: ReconExpense | null
}

export interface ReconResult {
  credits: CreditRow[]
  debits: DebitRow[]
  summary: {
    totalIn: number
    totalOut: number
    creditCount: number
    debitCount: number
    invoicesToMarkPaid: number // unpaid_match + amount_match
    debitsToRecord: number // not_recorded
    unmatchedCredits: number
    financingCredits: number
  }
}

// Owner / financing inflows that are NOT business income.
const FINANCING_RE = /director\s*loan|start\s*up|owner|capital|drawings|mb transfer|c\s*j\s*browne/i

const DATE_WINDOW_DAYS = 6

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function daysApart(a: string, b: string): number {
  if (!a || !b) return Infinity
  const da = Date.parse(a)
  const db = Date.parse(b)
  if (Number.isNaN(da) || Number.isNaN(db)) return Infinity
  return Math.abs(da - db) / 86_400_000
}

export function reconcile(args: {
  transactions: BankTxn[]
  invoices: ReconInvoice[]
  expenses: ReconExpense[]
}): ReconResult {
  const { transactions, invoices, expenses } = args

  const byNumber = new Map<string, ReconInvoice>()
  for (const inv of invoices) byNumber.set(inv.invoiceNumber.toUpperCase(), inv)

  const credits: CreditRow[] = []
  const debits: DebitRow[] = []

  for (const txn of transactions) {
    if (txn.amount === 0) continue // skip zero-value lines (e.g. opening CREDIT 0)

    if (txn.direction === 'in') {
      credits.push(matchCredit(txn, byNumber, invoices))
    } else {
      debits.push(matchDebit(txn, expenses))
    }
  }

  const totalIn = round2(credits.reduce((s, r) => s + r.txn.amount, 0))
  const totalOut = round2(debits.reduce((s, r) => s + Math.abs(r.txn.amount), 0))

  return {
    credits,
    debits,
    summary: {
      totalIn,
      totalOut,
      creditCount: credits.length,
      debitCount: debits.length,
      invoicesToMarkPaid: credits.filter((c) => c.status === 'unpaid_match' || c.status === 'amount_match').length,
      debitsToRecord: debits.filter((d) => d.status === 'not_recorded').length,
      unmatchedCredits: credits.filter((c) => c.status === 'unmatched').length,
      financingCredits: credits.filter((c) => c.status === 'financing').length,
    },
  }
}

function matchCredit(txn: BankTxn, byNumber: Map<string, ReconInvoice>, invoices: ReconInvoice[]): CreditRow {
  // 1. Direct invoice-number reference in the memo/payee.
  for (const ref of txn.invoiceRefs) {
    const inv = byNumber.get(ref.toUpperCase())
    if (inv) {
      return { txn, invoice: inv, status: inv.status === 'paid' ? 'reconciled' : 'unpaid_match' }
    }
  }

  // 2. Owner / financing inflow (not income).
  if (FINANCING_RE.test(`${txn.payee} ${txn.memo}`)) {
    return { txn, invoice: null, status: 'financing' }
  }

  // 3. Exactly one unpaid invoice with the same amount.
  const amt = round2(txn.amount)
  const sameAmountUnpaid = invoices.filter((i) => i.status !== 'paid' && round2(i.total) === amt)
  if (sameAmountUnpaid.length === 1) {
    return { txn, invoice: sameAmountUnpaid[0], status: 'amount_match' }
  }

  // 3b. If a paid invoice already matches the amount, treat as reconciled.
  const sameAmountPaid = invoices.filter((i) => i.status === 'paid' && round2(i.total) === amt)
  if (sameAmountPaid.length === 1) {
    return { txn, invoice: sameAmountPaid[0], status: 'reconciled' }
  }

  return { txn, invoice: null, status: 'unmatched' }
}

function matchDebit(txn: BankTxn, expenses: ReconExpense[]): DebitRow {
  const abs = round2(Math.abs(txn.amount))
  const candidates = expenses.filter((e) => round2(e.amount) === abs)
  if (candidates.length > 0) {
    // Prefer the closest by date when several share the amount.
    const best = candidates
      .map((e) => ({ e, d: daysApart(txn.date, e.expenseDate ?? '') }))
      .sort((a, b) => a.d - b.d)[0]
    if (best.d <= DATE_WINDOW_DAYS) {
      return { txn, expense: best.e, status: 'recorded' }
    }
  }
  return { txn, expense: null, status: 'not_recorded' }
}
