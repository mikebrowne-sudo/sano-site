// Job line items — a charge to the client plus an optional contractor cost.
//
// A job item is one thing done on a job: a carpet clean, an oven, a window
// round. It exists because a job's money was previously a single number
// (jobs.job_price) with no line-item table, so anything identified AFTER the
// job was created had nowhere to live.
//
// THE MONEY RULE (the one subtle thing in here)
//
//   client total = jobs.job_price + sum(price) WHERE source = 'added'
//
// jobs.job_price is the price of the job AS QUOTED, and the quote conversion
// already folds the quote's add-ons into it (computeQuoteTotal = base − discount
// + add-ons). Items copied from the quote at conversion therefore carry a charge
// that is ALREADY inside job_price; counting it again would double-bill the
// client. Those rows exist only to carry the contractor-pay half — so the
// carpet clean that was quoted up front can still be paid as a set amount.
//
// Hence: source='quote' contributes COST but never CHARGE; source='added'
// contributes both. That filter lives here and nowhere else.
//
// This mirrors the existing invoice_items semantic — "items are ADDONS, not the
// full breakdown" (src/lib/invoice-total.ts) — so there is one rule across the
// codebase rather than two.
//
// Pure + DB-free, so it can be unit-tested directly and reused by the job page,
// the invoice conversion and the pay approval without any of them re-deriving
// the arithmetic.

import { computeApprovedAmount, type ApprovedAmount } from './contractor-pay'

/** How a job item's contractor cost is worked out.
 *
 *  Deliberately NOT 'per_visit'. That word answers a different question —
 *  "is this occurrence of a recurring contract payable?" — and keeping the two
 *  vocabularies separate is the whole point of job-worker-pay-basis.ts. A job
 *  item's cost is 'fixed' in exactly the sense computeApprovedAmount means it. */
export type JobItemCostBasis = 'fixed' | 'hourly'

/** Where the item came from. See THE MONEY RULE above. */
export type JobItemSource = 'quote' | 'added'

/** The shape this module needs. Deliberately loose (nullable, string-typed
 *  basis/source) so a raw Supabase row can be passed straight in. */
export interface JobItemLine {
  label?: string | null
  description?: string | null
  price?: number | null
  contractor_id?: string | null
  cost_amount?: number | null
  cost_basis?: string | null
  cost_hours?: number | null
  source?: string | null
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

function toNumber(v: number | string | null | undefined): number {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) ? n : 0
}

/** Anything unrecognised is 'fixed' — the default a set amount implies, and the
 *  basis that never invents hours. */
export function costBasisOf(basis: string | null | undefined): JobItemCostBasis {
  return basis === 'hourly' ? 'hourly' : 'fixed'
}

/** Anything unrecognised is 'added'. A row whose source cannot be read is
 *  treated as chargeable, because under-billing is the failure this whole
 *  feature exists to stop (see the QUO-0313 note in quote-total.ts). */
export function sourceOf(source: string | null | undefined): JobItemSource {
  return source === 'quote' ? 'quote' : 'added'
}

/** True when this item's price is additive on top of jobs.job_price. */
export function isChargeable(item: JobItemLine): boolean {
  return sourceOf(item.source) === 'added'
}

/**
 * Total charged to the client for a job's items — i.e. the amount that is
 * ADDITIVE to jobs.job_price. Quote-sourced items are excluded: their charge is
 * already inside job_price.
 */
export function sumJobItemCharges(items: JobItemLine[]): number {
  if (!Array.isArray(items)) return 0
  return round2(
    items.filter(isChargeable).reduce((acc, it) => acc + toNumber(it.price), 0),
  )
}

/**
 * Total contractor cost across a job's items, for job costing and margin.
 *
 * Counts EVERY item regardless of source: a quote-sourced carpet clean is still
 * money going out. Items with no contractor or no cost contribute zero.
 */
export function sumJobItemCosts(items: JobItemLine[]): number {
  if (!Array.isArray(items)) return 0
  return round2(items.reduce((acc, it) => acc + toNumber(it.cost_amount), 0))
}

/**
 * The payable for a single item, via the same engine that prices a worker
 * approval — so an item and a job round identically and report the same basis.
 *
 * Returns an { error } result (never a plausible-looking zero) when the item
 * carries no usable cost.
 */
export function jobItemPayable(item: JobItemLine): ApprovedAmount {
  if (item.contractor_id == null) {
    return { error: 'This extra has no contractor assigned, so there is nothing to pay.' }
  }

  const cost = item.cost_amount
  if (cost == null || !Number.isFinite(Number(cost)) || Number(cost) <= 0) {
    return { error: 'This extra has no contractor cost set.' }
  }
  const amount = Number(cost)

  if (costBasisOf(item.cost_basis) === 'hourly') {
    const hours = item.cost_hours == null ? null : Number(item.cost_hours)
    if (hours == null || !Number.isFinite(hours) || hours <= 0) {
      return { error: 'This extra is paid hourly but has no hours recorded.' }
    }
    // cost_amount is stored as the TOTAL (hours x rate), so recover the rate
    // rather than re-multiplying. computeApprovedAmount then re-derives the
    // total, which keeps rounding identical to every other payable.
    return computeApprovedAmount({ approvedHours: hours, rate: amount / hours })
  }

  return computeApprovedAmount({ fixedAmount: amount })
}

/** Margin on a job's items alone: what is billed on top, less what is paid out. */
export function jobItemsMargin(items: JobItemLine[]): number {
  return round2(sumJobItemCharges(items) - sumJobItemCosts(items))
}
