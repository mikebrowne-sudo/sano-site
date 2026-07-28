// Pure allocation maths + validation for bank↔invoice reconciliation.
//
// Kept free of any DB / server code so the guard rules (no over-allocating an
// invoice, no over-allocating a bank transaction, no zero/negative amounts) can
// be unit-tested exhaustively and reused by the server action. The action reads
// current live allocations from the DB, then calls validateAllocation() before
// writing.

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** A proposed allocation of one bank transaction to one invoice. */
export interface ProposedAllocation {
  invoiceId: string
  amount: number
}

export interface AllocationContext {
  /** The bank transaction's absolute amount (money in). */
  transactionAmount: number
  /** Sum of the bank transaction's existing live allocations. */
  transactionAllocated: number
  /** Per-invoice: total invoice value and how much is already allocated to it
   *  (from ALL bank transactions, live only). */
  invoices: Record<string, { total: number; allocated: number }>
}

export interface AllocationValidation {
  ok: boolean
  error?: string
  /** The transaction's remaining unallocated balance after the proposed set. */
  transactionRemaining?: number
}

// Money comparisons tolerate sub-cent float noise.
const EPS = 0.005

/**
 * Validate a set of proposed allocations for a single bank transaction against
 * the current live-allocation state. Rules:
 *   - each amount > 0
 *   - no duplicate invoice in the proposed set
 *   - the transaction's total allocations (existing live + proposed) must not
 *     exceed its amount
 *   - each invoice's total allocations (existing live + proposed) must not
 *     exceed the invoice total
 */
export function validateAllocation(
  ctx: AllocationContext,
  proposed: ProposedAllocation[],
): AllocationValidation {
  if (proposed.length === 0) {
    return { ok: false, error: 'Select at least one invoice to allocate to.' }
  }

  const seen = new Set<string>()
  let proposedSum = 0
  for (const p of proposed) {
    if (!(p.amount > 0)) {
      return { ok: false, error: 'Each allocation amount must be greater than zero.' }
    }
    if (seen.has(p.invoiceId)) {
      return { ok: false, error: 'The same invoice appears more than once in this allocation.' }
    }
    seen.add(p.invoiceId)
    proposedSum = round2(proposedSum + p.amount)

    const inv = ctx.invoices[p.invoiceId]
    if (!inv) {
      return { ok: false, error: 'Unknown invoice in allocation.' }
    }
    const invAfter = round2(inv.allocated + p.amount)
    if (invAfter - inv.total > EPS) {
      const remaining = round2(inv.total - inv.allocated)
      return {
        ok: false,
        error: `That would allocate more than the invoice total. ${remaining.toFixed(2)} remaining on this invoice.`,
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

/** Is this bank transaction fully allocated (nothing left to reconcile)? */
export function isFullyAllocated(transactionAmount: number, transactionAllocated: number): boolean {
  return transactionAmount - transactionAllocated <= EPS
}
