// Stripe payouts → invoices. Pure engine (no DB / Stripe calls) so the rules
// can be unit-tested; the runner is portal/finance/reconcile/_stripe.ts.
//
// A Stripe payout reaches the bank as ONE net amount: every card payment in it,
// minus Stripe's fees. e.g. 19 Oct 2026 $569.14 =
//   QUO-0495 $584.25 − $15.78 fee  +  INV-9001 $1.00 − $0.33 fee.
// So the bank line never equals any invoice. We ask Stripe which charges made up
// the payout, allocate each invoice its GROSS amount (what the customer paid,
// card surcharge included) and record Stripe's fees as a bank-fees expense.
// The line is only reconciled when gross − fees = payout, to the cent — same
// "fully explained or leave it" rule as the rest of auto-reconcile.

import { round2 } from './payment-allocation'

/** Bank lines that are Stripe payouts ("Stripe Payments", "TRF …STRIPE"). */
export function isStripePayoutLine(payee: string | null | undefined, memo: string | null | undefined): boolean {
  return /stripe/i.test(`${payee ?? ''} ${memo ?? ''}`)
}

/** One Stripe balance transaction inside a payout (dollars, not cents). */
export interface StripePayoutLine {
  id: string
  /** Stripe's type: 'charge' / 'payment' are card payments; 'payout' is the payout itself. */
  type: string
  gross: number
  fee: number
  net: number
  paymentIntentId: string | null
  /** Stripe charged GST on this fee (a 'tax' entry in fee_details). */
  feeIncludesGst: boolean
}

export interface StripeInvoiceRef {
  id: string
  number: string
  /** GST-inclusive total (card-fee line included). */
  total: number
  /** Already allocated from bank lines. */
  allocated: number
}

export interface StripePayoutInput {
  payoutId: string
  /** Payout amount per Stripe (dollars). */
  payoutAmount: number
  /** The bank line's amount (dollars). */
  bankAmount: number
  lines: StripePayoutLine[]
  /** payment intent → invoice it paid (invoices.stripe_payment_intent_id). */
  invoiceByIntent: Map<string, StripeInvoiceRef>
  /** payment intent → quote number, for quotes paid before they were invoiced. */
  quoteByIntent: Map<string, string>
}

export type StripePayoutProposal =
  | {
      ok: true
      allocations: Array<{ invoiceId: string; amount: number }>
      numbers: string[]
      /** Stripe's fees on this payout — recorded as a bank-fees expense. */
      fee: number
      feeIncludesGst: boolean
      reason: string
    }
  | { ok: false; /** Waiting on something that will resolve itself (quote not invoiced yet). */ waiting: boolean; why: string }

const CARD_TYPES = new Set(['charge', 'payment'])
const EPS = 0.005

export function proposeStripePayout(input: StripePayoutInput): StripePayoutProposal {
  const { payoutId, payoutAmount, bankAmount, invoiceByIntent, quoteByIntent } = input
  if (Math.abs(round2(payoutAmount) - round2(bankAmount)) > EPS) {
    return { ok: false, waiting: false, why: `Stripe payout ${payoutId} is ${payoutAmount.toFixed(2)}, the bank line is ${bankAmount.toFixed(2)}.` }
  }

  // The payout's own balance transaction just mirrors the total — skip it.
  const lines = input.lines.filter((l) => l.type !== 'payout')
  if (lines.length === 0) return { ok: false, waiting: false, why: `Stripe returned no payments for payout ${payoutId}.` }

  const other = lines.filter((l) => !CARD_TYPES.has(l.type))
  if (other.length > 0) {
    const types = Array.from(new Set(other.map((l) => l.type))).join(', ')
    return { ok: false, waiting: false, why: `Payout ${payoutId} includes ${types} (refund / dispute / adjustment) — check it in Stripe and match by hand.` }
  }

  const netSum = round2(lines.reduce((s, l) => s + l.net, 0))
  if (Math.abs(netSum - round2(payoutAmount)) > EPS) {
    return { ok: false, waiting: false, why: `Payout ${payoutId}: payments net to ${netSum.toFixed(2)}, not ${payoutAmount.toFixed(2)}.` }
  }

  // Each card payment must trace to an invoice. Several charges on one invoice
  // (e.g. a retried payment) add together.
  const byInvoice = new Map<string, { ref: StripeInvoiceRef; gross: number }>()
  const waitingQuotes: string[] = []
  for (const l of lines) {
    const inv = l.paymentIntentId ? invoiceByIntent.get(l.paymentIntentId) : undefined
    if (!inv) {
      const quote = l.paymentIntentId ? quoteByIntent.get(l.paymentIntentId) : undefined
      if (quote) {
        waitingQuotes.push(quote)
        continue
      }
      return { ok: false, waiting: false, why: `Payout ${payoutId}: a ${l.gross.toFixed(2)} payment (${l.paymentIntentId ?? l.id}) isn't linked to any invoice or quote.` }
    }
    const cur = byInvoice.get(inv.id) ?? { ref: inv, gross: 0 }
    cur.gross = round2(cur.gross + l.gross)
    byInvoice.set(inv.id, cur)
  }
  if (waitingQuotes.length > 0) {
    return { ok: false, waiting: true, why: `Stripe payout waiting on an invoice for ${waitingQuotes.join(', ')} (paid by card before it was invoiced). It matches automatically once the invoice is created.` }
  }

  for (const { ref, gross } of Array.from(byInvoice.values())) {
    const open = round2(ref.total - ref.allocated)
    if (gross - open > EPS) {
      return { ok: false, waiting: false, why: `Payout ${payoutId}: ${ref.number} was paid ${gross.toFixed(2)} by card but only ${open.toFixed(2)} is open on it.` }
    }
  }

  const fee = round2(lines.reduce((s, l) => s + l.fee, 0))
  const allocations = Array.from(byInvoice.values()).map(({ ref, gross }) => ({ invoiceId: ref.id, amount: gross }))
  const numbers = Array.from(byInvoice.values()).map(({ ref }) => ref.number)
  const grossSum = round2(allocations.reduce((s, a) => s + a.amount, 0))
  // Belt and braces: gross − fees must be the payout exactly.
  if (Math.abs(round2(grossSum - fee) - round2(payoutAmount)) > EPS) {
    return { ok: false, waiting: false, why: `Payout ${payoutId}: ${grossSum.toFixed(2)} paid − ${fee.toFixed(2)} fees ≠ ${payoutAmount.toFixed(2)}.` }
  }

  return {
    ok: true,
    allocations,
    numbers,
    fee,
    feeIncludesGst: fee > 0 && lines.filter((l) => l.fee > 0).every((l) => l.feeIncludesGst),
    reason: `auto: Stripe payout ${payoutId} — ${numbers.join(', ')} ${grossSum.toFixed(2)} less Stripe fees ${fee.toFixed(2)}`,
  }
}
