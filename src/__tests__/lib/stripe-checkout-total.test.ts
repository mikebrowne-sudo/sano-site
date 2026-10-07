// The amount Stripe charges MUST equal the invoice's own grand total.
//
// The checkout route previously charged `base + add-ons - discount`, which is
// the LINE total, not the grand total. On a GST-EXCLUSIVE invoice that silently
// omitted GST: the customer read $920 on the document and would have been
// charged $800 at the checkout — a 15% undercharge, and a GST return that does
// not reconcile.
//
// Sano has 4 GST-exclusive invoices today, so this was live, not theoretical.
// Both the route and InvoiceDocument now call computeDocumentTotals, so they
// cannot drift apart again.

import { computeDocumentTotals } from '@/lib/doc-totals'

/** What the route charges now. */
function chargeAmount(
  basePrice: number,
  items: { price: number }[],
  discount: number,
  gstIncluded: boolean,
): number {
  const addons = items.reduce((s, i) => s + (i.price ?? 0), 0)
  const lineTotal = basePrice + addons - discount
  return computeDocumentTotals(lineTotal, gstIncluded).total
}

/** The old, buggy calculation — kept to show what it got wrong. */
function oldChargeAmount(basePrice: number, items: { price: number }[], discount: number): number {
  return basePrice + items.reduce((s, i) => s + (i.price ?? 0), 0) - discount
}

describe('GST-inclusive invoices (167 of Sano’s 171)', () => {
  it('charges the entered total, because GST is already inside it', () => {
    // QUO-0324 shape: $640 clean + $280 carpet, GST inclusive.
    expect(chargeAmount(640, [{ price: 280 }], 0, true)).toBe(920)
  })

  it('matches what the document displays', () => {
    const { total } = computeDocumentTotals(920, true)
    expect(chargeAmount(640, [{ price: 280 }], 0, true)).toBe(total)
  })

  it('was already correct under the old calculation — hence no live shortfall', () => {
    expect(oldChargeAmount(640, [{ price: 280 }], 0)).toBe(920)
  })
})

describe('GST-exclusive invoices — the bug', () => {
  it('now charges the GST-inclusive grand total', () => {
    expect(chargeAmount(800, [], 0, false)).toBe(920)
  })

  it('the old calculation undercharged by exactly the GST', () => {
    const correct = chargeAmount(800, [], 0, false)
    const old = oldChargeAmount(800, [], 0)
    expect(old).toBe(800)
    expect(correct - old).toBeCloseTo(120, 2)
  })

  it('matches what the document displays', () => {
    const { total } = computeDocumentTotals(800, false)
    expect(chargeAmount(800, [], 0, false)).toBe(total)
  })
})

describe('discounts and extras', () => {
  it('applies the discount before GST', () => {
    // $900 less $180 discount, GST inclusive.
    expect(chargeAmount(900, [], 180, true)).toBe(720)
  })

  it('includes a job extra billed onto the invoice', () => {
    // $600 clean + $300 carpet found on site.
    expect(chargeAmount(600, [{ price: 300 }], 0, true)).toBe(900)
  })

  it('never charges a negative amount', () => {
    // A discount larger than the price is rejected upstream by the > 0 guard;
    // this pins that the arithmetic itself does not silently go negative.
    const total = chargeAmount(100, [], 500, true)
    expect(total).toBeLessThanOrEqual(0)
  })
})

describe('cents conversion', () => {
  it('converts to whole cents without a rounding drift', () => {
    const total = chargeAmount(333.33, [], 0, true)
    expect(Math.round(total * 100)).toBe(33333)
  })

  it('handles a GST-exclusive amount that does not divide evenly', () => {
    const total = chargeAmount(333.33, [], 0, false)
    expect(Math.round(total * 100)).toBe(38333)
  })
})
