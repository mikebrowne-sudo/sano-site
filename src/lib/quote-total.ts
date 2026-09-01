// Canonical customer price for a quote.
//
// A quote's price is base_price − discount PLUS its priced add-on lines
// (quote_items): "carpet clean $300", "external windows $180", "refuse charge
// $175". The quote document totals all of them, and that total is the number
// the customer agreed to.
//
// The quote → job conversion previously carried only `base_price − discount`
// onto jobs.job_price, silently dropping the add-ons. The invoice then copied
// job_price faithfully, so the shortfall was invisible: the invoice was
// internally consistent and simply billed the wrong amount.
//
// Found in production on QUO-0313 — quoted $1,080, invoiced $600. An audit
// across every quote with add-ons found six affected jobs and $1,312.50
// under-billed, two of them already paid.
//
// One helper, used by every conversion path, so job_price can never disagree
// with the quote total again.

export interface QuoteTotalInput {
  base_price?: number | string | null
  discount?: number | string | null
}

export interface QuoteAddonLine {
  price?: number | string | null
}

function toNumber(v: number | string | null | undefined): number {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Sum of a quote's priced add-on lines. Non-numeric or absent prices count 0. */
export function sumQuoteAddons(items: readonly QuoteAddonLine[] | null | undefined): number {
  if (!items || items.length === 0) return 0
  return items.reduce((acc, it) => acc + toNumber(it?.price), 0)
}

/**
 * The full customer price for a quote: (base − discount) + add-ons.
 *
 * Never returns a negative number — a discount larger than the base is an
 * operator error, and carrying a negative price onto a job would produce a
 * credit-note-shaped invoice nobody intended.
 *
 * Returns null only when the quote has no base price AND no add-ons, which is
 * the "price not set yet" state; callers keep their existing null handling.
 */
export function computeQuoteTotal(
  quote: QuoteTotalInput,
  items?: readonly QuoteAddonLine[] | null,
): number | null {
  const addons = sumQuoteAddons(items)
  if (quote.base_price == null && addons === 0) return null
  const net = toNumber(quote.base_price) - toNumber(quote.discount)
  return Math.max(0, net + addons)
}
