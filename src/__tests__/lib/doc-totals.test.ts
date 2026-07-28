import { computeDocumentTotals, noteLooksLikePrice } from '@/lib/doc-totals'

const money = (n: number) => Math.round(n * 100) / 100

describe('computeDocumentTotals — GST inclusive vs exclusive', () => {
  it('EXCLUSIVE: adds 15% on top (QUO-0261: $4,550 → GST $682.50 → $5,232.50)', () => {
    const r = computeDocumentTotals(4550, false)
    expect(money(r.subtotalExGst)).toBe(4550)
    expect(money(r.gstAmount)).toBe(682.5)
    expect(money(r.total)).toBe(5232.5)
  })

  it('INCLUSIVE: extracts GST (×3/23); total stays the entered inclusive price', () => {
    const r = computeDocumentTotals(4550, true)
    expect(money(r.total)).toBe(4550)          // total unchanged — GST is inside
    expect(money(r.gstAmount)).toBe(593.48)    // 4550 × 3/23
    expect(money(r.subtotalExGst)).toBe(3956.52)
    expect(money(r.subtotalExGst + r.gstAmount)).toBe(4550)
  })

  it('the two modes give DIFFERENT totals for the same entered figure', () => {
    expect(computeDocumentTotals(1000, true).total).not.toBe(computeDocumentTotals(1000, false).total)
  })
})

describe('noteLooksLikePrice', () => {
  it('flags a charge typed into Notes', () => {
    expect(noteLooksLikePrice('Skip Bin $417.39')).toBe(true)
    expect(noteLooksLikePrice('$50 parking')).toBe(true)
    expect(noteLooksLikePrice('Extra materials 125.00')).toBe(true)
  })
  it('does not flag ordinary notes', () => {
    expect(noteLooksLikePrice('Access via the rear gate; key at reception.')).toBe(false)
    expect(noteLooksLikePrice('Available 24/7, level 2.')).toBe(false)
    expect(noteLooksLikePrice(null)).toBe(false)
  })
})
