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
  /** Sum of live (un-reversed) allocations already made against this invoice.
   *  Defaults to 0 when the caller doesn't supply it. */
  allocatedTotal?: number
}
export interface ReconExpense {
  amount: number
  expenseDate: string | null
}

// reconcile() emits the first five. 'likely_bundle' / 'likely_match' are
// display-only states the page derives for an unmatched credit when a
// payer-scoped subset of invoices plausibly explains it.
// 'allocate_match' — a confident match to an invoice that is ALREADY paid but
// whose payment isn't yet allocated to a bank line (e.g. a manual invoice paid
// before reconciliation). On confirm the invoice STAYS paid; we only record the
// allocation + clear the bank line. Distinct from 'unpaid_match', which also
// flips the invoice to paid.
export type CreditStatus = 'reconciled' | 'unpaid_match' | 'allocate_match' | 'amount_match' | 'financing' | 'unmatched' | 'likely_bundle' | 'likely_match'
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
    allocationsToRecord: number // allocate_match (already-paid, needs allocation)
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
      allocationsToRecord: credits.filter((c) => c.status === 'allocate_match').length,
      debitsToRecord: debits.filter((d) => d.status === 'not_recorded').length,
      unmatchedCredits: credits.filter((c) => c.status === 'unmatched').length,
      financingCredits: credits.filter((c) => c.status === 'financing').length,
    },
  }
}

/** Remaining unallocated balance on an invoice (total − live allocations). */
function remaining(inv: ReconInvoice): number {
  return round2(round2(inv.total) - round2(inv.allocatedTotal ?? 0))
}

/** Is this invoice already fully covered by live allocations? */
function fullyAllocated(inv: ReconInvoice): boolean {
  return remaining(inv) <= 0.005
}

/**
 * Does the bank text plausibly name this invoice's client? Token-overlap on the
 * client name — every significant name token (3+ chars) must appear in the
 * payee+memo text. Deliberately strict so "Sue Bunce" matches "…Sue Bunce 26022"
 * but a single common token doesn't cause false positives.
 */
function textNamesClient(text: string, client: string | undefined): boolean {
  if (!client) return false
  const hay = text.toLowerCase()
  const tokens = client.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3)
  if (tokens.length === 0) return false
  return tokens.every((t) => hay.includes(t))
}

function matchCredit(txn: BankTxn, byNumber: Map<string, ReconInvoice>, invoices: ReconInvoice[]): CreditRow {
  const text = `${txn.payee} ${txn.memo}`
  const amt = round2(txn.amount)

  // 1. Invoice-number reference in the memo/payee. High-confidence INV-#### refs
  //    first, then bare numbers (e.g. "…26022") — both resolve against real
  //    invoice numbers, so a stray number simply won't match.
  const refCandidates = [...txn.invoiceRefs, ...(txn.numberRefs ?? [])]
  for (const ref of refCandidates) {
    const inv = byNumber.get(ref.toUpperCase())
    if (inv) {
      // A paid invoice is only "reconciled" (nothing to do) once its payment is
      // actually allocated. Paid-but-unallocated → surface as a match the user
      // can allocate (the INV-26022 case). Unpaid → mark-paid on allocate.
      if (inv.status === 'paid') {
        return { txn, invoice: inv, status: fullyAllocated(inv) ? 'reconciled' : 'allocate_match' }
      }
      return { txn, invoice: inv, status: 'unpaid_match' }
    }
  }

  // 2. Owner / financing inflow (not income).
  if (FINANCING_RE.test(text)) {
    return { txn, invoice: null, status: 'financing' }
  }

  // 3. Client name in the memo/payee resolving to a single invoice that still
  //    has an unallocated balance equal to the payment. Catches "Sue Bunce 26022"
  //    even when the bare number step didn't (e.g. name only), and paid invoices.
  const nameMatches = invoices.filter(
    (i) => !fullyAllocated(i) && round2(remaining(i)) === amt && textNamesClient(text, i.client),
  )
  if (nameMatches.length === 1) {
    const inv = nameMatches[0]
    return { txn, invoice: inv, status: inv.status === 'paid' ? 'allocate_match' : 'unpaid_match' }
  }

  // 4. Exactly one unpaid invoice whose remaining balance equals the amount.
  const sameAmountUnpaid = invoices.filter((i) => i.status !== 'paid' && round2(remaining(i)) === amt)
  if (sameAmountUnpaid.length === 1) {
    return { txn, invoice: sameAmountUnpaid[0], status: 'amount_match' }
  }

  // 4b. Exactly one paid-but-unallocated invoice with the same amount → surface
  //     it so the payment can be allocated (previously this dead-ended).
  const sameAmountPaidOpen = invoices.filter(
    (i) => i.status === 'paid' && !fullyAllocated(i) && round2(remaining(i)) === amt,
  )
  if (sameAmountPaidOpen.length === 1) {
    return { txn, invoice: sameAmountPaidOpen[0], status: 'allocate_match' }
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
