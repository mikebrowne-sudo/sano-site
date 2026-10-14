// Which of a customer's open work adds up to a bank payment?
//
// Used by the reconcile "Match" window: B&T and other account customers pay
// several invoices — and sometimes work we haven't invoiced yet — in one
// transfer with no reference. Given the customer's open items and the payment,
// list the combinations that add up EXACTLY, best first, so staff tick one and
// confirm instead of doing sums.
//
// Ranking (lower is better):
//   - fewer items,
//   - real sent invoices over drafts / marked-paid-unmatched / un-invoiced jobs
//     (each of those costs a little, so a plain invoice answer wins a tie),
//   - work dated on or before the payment (a payment can't be for next week).
// Pure: no I/O, cents throughout.

export type WorkKind = 'invoice' | 'paid_unmatched' | 'draft' | 'job'

export interface WorkItem {
  /** invoice id, or job id when kind === 'job'. */
  id: string
  kind: WorkKind
  number: string
  /** Open amount in dollars (balance still to be matched). */
  amount: number
  /** Service / issue date, ISO yyyy-mm-dd, when known. */
  date: string | null
  clientId: string | null
  clientLabel: string
  address?: string
}

export interface Combo {
  items: WorkItem[]
  score: number
}

const KIND_COST: Record<WorkKind, number> = { invoice: 0, paid_unmatched: 0.4, draft: 0.6, job: 0.8 }
const cents = (n: number) => Math.round(n * 100)

export const MAX_COMBO_ITEMS = 8
const MAX_POOL = 24
const MAX_FOUND = 400

export function scoreCombo(items: WorkItem[], paymentDate: string | null): number {
  let s = items.length
  for (const i of items) {
    s += KIND_COST[i.kind]
    if (paymentDate && i.date && i.date > paymentDate) s += 1.5
  }
  return Math.round(s * 100) / 100
}

/**
 * Every combination of `pool` (2..MAX_COMBO_ITEMS items, or a single exact
 * item) summing exactly to `target`, ranked best first, up to `limit`.
 */
export function findCombos(pool: WorkItem[], target: number, opts: { paymentDate?: string | null; limit?: number } = {}): Combo[] {
  const goal = cents(target)
  if (goal <= 0) return []
  // Oldest first keeps the search (and ties) stable; cap the pool so the
  // search stays instant on a big account.
  const items = pool
    .filter((i) => cents(i.amount) > 0 && cents(i.amount) <= goal)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.number.localeCompare(b.number))
    .slice(-MAX_POOL)
  const vals = items.map((i) => cents(i.amount))
  // Suffix sums let the search stop early when even taking everything left
  // can't reach the goal.
  const suffix = new Array(vals.length + 1).fill(0)
  for (let k = vals.length - 1; k >= 0; k--) suffix[k] = suffix[k + 1] + vals[k]

  const found: number[][] = []
  const pick: number[] = []
  const walk = (start: number, remaining: number) => {
    if (found.length >= MAX_FOUND) return
    if (remaining === 0) { found.push([...pick]); return }
    if (pick.length >= MAX_COMBO_ITEMS || remaining < 0 || suffix[start] < remaining) return
    for (let k = start; k < vals.length; k++) {
      if (vals[k] > remaining) continue
      pick.push(k)
      walk(k + 1, remaining - vals[k])
      pick.pop()
    }
  }
  walk(0, goal)

  return found
    .map((idx) => {
      const chosen = idx.map((k) => items[k])
      return { items: chosen, score: scoreCombo(chosen, opts.paymentDate ?? null) }
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, opts.limit ?? 5)
}

export const WORK_KIND_LABEL: Record<WorkKind, string> = {
  invoice: 'Unpaid invoice',
  paid_unmatched: 'Marked paid · no bank match',
  draft: 'Draft · not sent',
  job: 'Job · not invoiced',
}
