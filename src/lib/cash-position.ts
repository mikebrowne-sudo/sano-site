// Cash position — "how much cash does the business hold, and how much of that
// is genuinely the business's vs owner-introduced capital".
//
// This is DISTINCT from the P&L "net position" (a 12-month operating result).
// Cash position is a point-in-time balance-sheet-style view:
//
//   Total company cash            (bank balance, incl. any tax-holding cash)
//   less genuine owner capital     (owner_capital only — NOT loans/reimbursements)
//   = net positive cash position   (cash the business has generated/holds above
//                                    what the owner put in)
//
// The five cash treatments are kept separate (see expense-categories.ts):
//   1. Owner capital introduced      → owner_capital      (subtracted here)
//   2. Reimbursement for a business   → expense_reimbursement (offsets its expense;
//      expense the company pre-paid      NOT owner funding, NOT income)
//   3. Director / shareholder loan   → director_loan      (a liability, not capital)
//   4. Trading income                → invoices (paid)    (not in this file)
//   5. Transfers to tax-holding       → cash movement; folded into total cash
//
// Owner capital is read from the expenses table (rows coded owner_capital),
// summed to date. Reimbursements and director loans are deliberately NOT
// subtracted from cash here — only genuine introduced capital is.

import type { SupabaseClient } from '@supabase/supabase-js'
import { getBankBalance } from '@/lib/bank-balance'
import { OWNER_CAPITAL_CATEGORY } from '@/lib/expense-categories'

export interface CashPosition {
  /** Total company cash on hand (bank balance; includes tax-holding cash). */
  totalCash: number
  /** As-at date of the underlying bank balance figure. */
  asAt: string | null
  /** Genuine capital introduced by the owner, to date. */
  ownerCapital: number
  /** totalCash − ownerCapital: the net positive position above owner funding. */
  netOfOwnerFunding: number
  /** True when a bank balance has actually been captured (else totalCash is 0). */
  hasBalance: boolean
}

/**
 * Compute the current cash position. `totalCash` comes from the captured bank
 * balance (which already represents total company cash on hand — per Mike's
 * treatment the tax-holding cash is folded into that single figure). Owner
 * capital is the sum of `owner_capital` expense rows.
 */
export async function buildCashPosition(supabase: SupabaseClient): Promise<CashPosition> {
  const [balance, { data: capitalRows }] = await Promise.all([
    getBankBalance(supabase),
    supabase.from('expenses').select('amount').eq('category', OWNER_CAPITAL_CATEGORY),
  ])

  const totalCash = balance?.amount ?? 0
  const ownerCapital = round2((capitalRows ?? []).reduce((s, r) => s + Number((r as { amount: number }).amount ?? 0), 0))

  return {
    totalCash,
    asAt: balance?.asAt ?? null,
    ownerCapital,
    netOfOwnerFunding: round2(totalCash - ownerCapital),
    hasBalance: !!balance,
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
