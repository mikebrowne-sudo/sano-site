// Outgoing bank-debit ↔ contractor-remittance matcher + allocation guards.
//
// The mirror of bank-reconcile.ts / payment-allocation.ts for MONEY OUT. Given
// outgoing bank debits (contractor/payroll payments) and the portal's
// remittances, suggest which debit pays which remittance — purely, so it's
// unit-tested and re-runnable. No writes; the UI turns suggestions into a
// confirm action that records a durable allocation.
//
// A remittance is linked to a bank debit as a WHOLE (it already contains its
// invoice items), so one allocation row covers all of RA-00xx's contractor
// invoices at once.

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// Money comparisons tolerate sub-cent float noise.
const EPS = 0.005

// ── Allocation guard (outgoing) ─────────────────────────────────────────────

export interface ProposedRemitAllocation {
  remittanceId: string
  amount: number
}

export interface RemitAllocationContext {
  /** The bank debit's absolute amount (money out). */
  transactionAmount: number
  /** Sum of the bank debit's existing live allocations. */
  transactionAllocated: number
  /** Per-remittance: total value and how much is already allocated to it
   *  (from ALL bank debits, live only). */
  remittances: Record<string, { total: number; allocated: number }>
}

export interface RemitAllocationValidation {
  ok: boolean
  error?: string
  /** The debit's remaining unallocated balance after the proposed set. */
  transactionRemaining?: number
}

/**
 * Validate proposed allocations of one outgoing bank debit to one or more
 * remittances against current live state. Rules mirror the invoice side:
 *   - each amount > 0
 *   - no duplicate remittance in the proposed set
 *   - the debit's total allocations (existing live + proposed) ≤ its amount
 *   - each remittance's total allocations (existing live + proposed) ≤ its total
 */
export function validateRemitAllocation(
  ctx: RemitAllocationContext,
  proposed: ProposedRemitAllocation[],
): RemitAllocationValidation {
  if (proposed.length === 0) {
    return { ok: false, error: 'Select at least one remittance to allocate to.' }
  }

  const seen = new Set<string>()
  let proposedSum = 0
  for (const p of proposed) {
    if (!(p.amount > 0)) {
      return { ok: false, error: 'Each allocation amount must be greater than zero.' }
    }
    if (seen.has(p.remittanceId)) {
      return { ok: false, error: 'The same remittance appears more than once in this allocation.' }
    }
    seen.add(p.remittanceId)
    proposedSum = round2(proposedSum + p.amount)

    const r = ctx.remittances[p.remittanceId]
    if (!r) return { ok: false, error: 'Unknown remittance in allocation.' }
    const rAfter = round2(r.allocated + p.amount)
    if (rAfter - r.total > EPS) {
      const remaining = round2(r.total - r.allocated)
      return {
        ok: false,
        error: `That would allocate more than the remittance total. ${remaining.toFixed(2)} remaining on this remittance.`,
      }
    }
  }

  const txnAfter = round2(ctx.transactionAllocated + proposedSum)
  if (txnAfter - ctx.transactionAmount > EPS) {
    const remaining = round2(ctx.transactionAmount - ctx.transactionAllocated)
    return {
      ok: false,
      error: `That would allocate more than the payment amount. ${remaining.toFixed(2)} of this payment is still unallocated.`,
    }
  }

  return { ok: true, transactionRemaining: round2(ctx.transactionAmount - txnAfter) }
}

/** Is this outgoing debit fully allocated (nothing left to reconcile)? */
export function isDebitFullyAllocated(transactionAmount: number, transactionAllocated: number): boolean {
  return transactionAmount - transactionAllocated <= EPS
}

// ── Matcher (suggest a remittance for each outgoing debit) ───────────────────

export interface OutgoingDebit {
  id: string
  date: string // ISO
  payee: string
  memo: string
  amount: number // signed negative (money out) or positive abs — we abs it
  cleared: boolean
  /** Sum of live allocations already made against this debit. */
  allocatedTotal?: number
}

export interface ReconRemittance {
  id: string
  remittanceNumber: string
  reference: string | null
  payeeLabel: string | null
  paymentDate: string | null
  total: number
  paidAt: string | null
  paymentConfirmed: boolean
  /** Sum of live allocations already made against this remittance. */
  allocatedTotal?: number
}

export type OutMatchStatus =
  | 'reconciled' // debit already fully allocated (nothing to do)
  | 'reference_match' // reference stem in the memo → a single remittance
  | 'amount_date_match' // no ref, but exactly one unmatched remittance of same amount near the date
  | 'unmatched'

export interface OutMatchRow {
  debit: OutgoingDebit
  status: OutMatchStatus
  remittance: ReconRemittance | null
  /** Remaining unallocated on the debit (abs amount − live allocations). */
  remaining: number
}

const DATE_WINDOW_DAYS = 7

function daysApart(a: string, b: string): number {
  if (!a || !b) return Infinity
  const da = Date.parse(a)
  const db = Date.parse(b)
  if (Number.isNaN(da) || Number.isNaN(db)) return Infinity
  return Math.abs(da - db) / 86_400_000
}

/** Remaining unallocated balance on a remittance (total − live allocations). */
function remitRemaining(r: ReconRemittance): number {
  return round2(round2(r.total) - round2(r.allocatedTotal ?? 0))
}
function remitFullyAllocated(r: ReconRemittance): boolean {
  return remitRemaining(r) <= EPS
}

/**
 * Normalise reference-ish text for stem comparison: uppercase, strip anything
 * that isn't a letter or digit. So "MARINA PAYROLL 220726" and
 * "BILL PAYMENT TO PAYROLL MARINA 220726" both reduce to comparable tokens.
 */
function normRef(text: string): string {
  return (text || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()
}

/**
 * Does the bank debit text plausibly name this remittance? We compare on the
 * significant tokens of the remittance reference (e.g. payee name + the ddmmyy
 * stamp). Every significant token (3+ chars) of the reference must appear in
 * the debit text. Strict enough that "MARINA…220726" matches its debit but a
 * lone common word doesn't cause a false positive.
 */
function textMatchesReference(debitText: string, r: ReconRemittance): boolean {
  const ref = r.reference || `${r.payeeLabel ?? ''} ${r.remittanceNumber}`
  const hay = normRef(debitText)
  const tokens = normRef(ref).split(' ').filter((t) => t.length >= 3)
  if (tokens.length === 0) return false
  return tokens.every((t) => hay.includes(t))
}

export function matchOutgoing(args: {
  debits: OutgoingDebit[]
  remittances: ReconRemittance[]
}): OutMatchRow[] {
  const { debits, remittances } = args
  const rows: OutMatchRow[] = []

  for (const debit of debits) {
    const abs = round2(Math.abs(Number(debit.amount || 0)))
    const remaining = round2(abs - round2(debit.allocatedTotal ?? 0))
    const text = `${debit.payee} ${debit.memo}`

    // 0. Already fully allocated → nothing to do.
    if (remaining <= EPS) {
      rows.push({ debit, status: 'reconciled', remittance: null, remaining })
      continue
    }

    // 1. Reference stem names exactly one still-open remittance whose remaining
    //    balance equals the debit's remaining. High confidence.
    const refMatches = remittances.filter(
      (r) => !remitFullyAllocated(r) && round2(remitRemaining(r)) === remaining && textMatchesReference(text, r),
    )
    if (refMatches.length === 1) {
      rows.push({ debit, status: 'reference_match', remittance: refMatches[0], remaining })
      continue
    }

    // 2. No usable ref: exactly one still-open remittance of the same amount
    //    within the date window.
    const amountMatches = remittances.filter(
      (r) => !remitFullyAllocated(r) && round2(remitRemaining(r)) === remaining
        && daysApart(debit.date, r.paymentDate ?? '') <= DATE_WINDOW_DAYS,
    )
    if (amountMatches.length === 1) {
      rows.push({ debit, status: 'amount_date_match', remittance: amountMatches[0], remaining })
      continue
    }

    rows.push({ debit, status: 'unmatched', remittance: null, remaining })
  }

  return rows
}

// ── Reconciliation search (by number, name, reference, amount, date) ─────────

export interface RemitSearchFilter {
  /** Free text — matched against remittance number, payee, reference. */
  text?: string
  /** Exact amount (abs) to match on remittance total. */
  amount?: number
  /** ISO date lower bound on payment_date. */
  from?: string
  /** ISO date upper bound on payment_date. */
  to?: string
  /** Only show remittances not yet fully allocated. */
  openOnly?: boolean
}

export function searchRemittances(remittances: ReconRemittance[], f: RemitSearchFilter): ReconRemittance[] {
  const needle = (f.text ?? '').trim().toLowerCase()
  return remittances.filter((r) => {
    if (f.openOnly && remitFullyAllocated(r)) return false
    if (needle) {
      const hay = `${r.remittanceNumber} ${r.payeeLabel ?? ''} ${r.reference ?? ''}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    if (f.amount != null && round2(r.total) !== round2(f.amount)) return false
    if (f.from && (r.paymentDate ?? '') < f.from) return false
    if (f.to && (r.paymentDate ?? '') > f.to) return false
    return true
  })
}
