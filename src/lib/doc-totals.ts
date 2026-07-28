// Canonical GST + totals maths for the Quote / Invoice documents. Single source
// so both documents (and their tests) agree. GST treatment:
//   - GST-INCLUSIVE  → entered prices already include GST; extract it (× 3/23),
//     total = the entered inclusive prices (less discount, already in lineTotal).
//   - GST-EXCLUSIVE  → entered prices exclude GST; add 15% on top.

export interface DocumentTotalsResult {
  /** GST component. */
  gstAmount: number
  /** Subtotal excluding GST. */
  subtotalExGst: number
  /** Grand total (incl. GST). */
  total: number
}

/** `lineTotal` = base + priced add-ons − discount. */
export function computeDocumentTotals(lineTotal: number, gstIncluded: boolean): DocumentTotalsResult {
  const gstAmount = gstIncluded ? (lineTotal * 3) / 23 : lineTotal * 0.15
  const subtotalExGst = gstIncluded ? lineTotal - gstAmount : lineTotal
  const total = gstIncluded ? lineTotal : lineTotal + gstAmount
  return { gstAmount, subtotalExGst, total }
}

/**
 * Does a Notes value look like it contains a price (a $ next to a number, or a
 * dollars-and-cents amount)? Used for a NON-BLOCKING staff warning so a charge
 * typed into Notes — which is excluded from the total — gets flagged to be added
 * as a priced line instead.
 */
export function noteLooksLikePrice(note: string | null | undefined): boolean {
  if (!note) return false
  return /\$\s?\d/.test(note) || /\b\d{1,3}(?:,\d{3})*\.\d{2}\b/.test(note)
}
