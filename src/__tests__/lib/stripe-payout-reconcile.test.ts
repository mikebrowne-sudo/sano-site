import { isStripePayoutLine, proposeStripePayout, type StripeInvoiceRef, type StripePayoutLine } from '@/lib/stripe-payout-reconcile'

function line(p: Partial<StripePayoutLine>): StripePayoutLine {
  return { id: 'txn_1', type: 'charge', gross: 0, fee: 0, net: 0, paymentIntentId: 'pi_1', feeIncludesGst: false, ...p }
}
function inv(p: Partial<StripeInvoiceRef>): StripeInvoiceRef {
  return { id: 'inv-a', number: 'INV-0500', total: 584.25, allocated: 0, ...p }
}

// The real first payout, 19 Oct 2026: QUO-0495 (Margie, $570 + $14.25 card fee)
// and Mike's $1 test (INV-9001), Stripe 2.65% + 30c on each.
const margie = line({ id: 'txn_m', gross: 584.25, fee: 15.78, net: 568.47, paymentIntentId: 'pi_margie' })
const test1 = line({ id: 'txn_t', gross: 1, fee: 0.33, net: 0.67, paymentIntentId: 'pi_test' })
const payoutRow = line({ id: 'txn_po', type: 'payout', gross: -569.14, fee: 0, net: -569.14, paymentIntentId: null })

const base = {
  payoutId: 'po_1',
  payoutAmount: 569.14,
  bankAmount: 569.14,
  lines: [margie, test1, payoutRow],
  invoiceByIntent: new Map([
    ['pi_margie', inv({ id: 'inv-m', number: 'INV-0600', total: 584.25 })],
    ['pi_test', inv({ id: 'inv-t', number: 'INV-9001', total: 1 })],
  ]),
  quoteByIntent: new Map<string, string>(),
}

describe('isStripePayoutLine', () => {
  it.each([
    ['Stripe Payments', 'TRF SIHGZWOOSTRIPE', true],
    ['D/C FROM SMITH', 'INV-0400', false],
  ])('%s / %s', (payee, memo, expected) => {
    expect(isStripePayoutLine(payee, memo)).toBe(expected)
  })
})

describe('proposeStripePayout', () => {
  it('allocates each invoice gross and records the fees (the 19 Oct payout)', () => {
    const p = proposeStripePayout(base)
    expect(p.ok).toBe(true)
    if (!p.ok) return
    expect(p.allocations).toEqual([
      { invoiceId: 'inv-m', amount: 584.25 },
      { invoiceId: 'inv-t', amount: 1 },
    ])
    expect(p.fee).toBe(16.11)
    expect(p.feeIncludesGst).toBe(false)
    expect(p.reason).toMatch(/^auto: Stripe payout po_1/)
  })

  it('flags GST-inclusive only when Stripe charged GST on every fee', () => {
    const p = proposeStripePayout({ ...base, lines: [{ ...margie, feeIncludesGst: true }, { ...test1, feeIncludesGst: true }] })
    expect(p.ok && p.feeIncludesGst).toBe(true)
    const mixed = proposeStripePayout({ ...base, lines: [{ ...margie, feeIncludesGst: true }, test1] })
    expect(mixed.ok && mixed.feeIncludesGst).toBe(false)
  })

  it('waits when a payment is on a quote not yet invoiced', () => {
    const p = proposeStripePayout({
      ...base,
      invoiceByIntent: new Map([['pi_test', inv({ id: 'inv-t', number: 'INV-9001', total: 1 })]]),
      quoteByIntent: new Map([['pi_margie', 'QUO-0495']]),
    })
    expect(p).toMatchObject({ ok: false, waiting: true })
    if (!p.ok) expect(p.why).toMatch(/QUO-0495/)
  })

  it('reviews a payment with no invoice or quote', () => {
    const p = proposeStripePayout({ ...base, invoiceByIntent: new Map() })
    expect(p).toMatchObject({ ok: false, waiting: false })
  })

  it('reviews a payout containing a refund', () => {
    const p = proposeStripePayout({ ...base, payoutAmount: 469.14, bankAmount: 469.14, lines: [margie, test1, line({ type: 'refund', gross: -100, net: -100, paymentIntentId: 'pi_margie' })] })
    expect(p.ok).toBe(false)
    if (!p.ok) expect(p.why).toMatch(/refund/)
  })

  it('reviews when the bank amount differs from the payout', () => {
    expect(proposeStripePayout({ ...base, bankAmount: 569.15 }).ok).toBe(false)
  })

  it('reviews when the payments do not net to the payout', () => {
    expect(proposeStripePayout({ ...base, lines: [margie] }).ok).toBe(false)
  })

  it('reviews when the card payment exceeds what is open on the invoice', () => {
    const p = proposeStripePayout({
      ...base,
      invoiceByIntent: new Map([
        ['pi_margie', inv({ id: 'inv-m', number: 'INV-0600', total: 584.25, allocated: 100 })],
        ['pi_test', inv({ id: 'inv-t', number: 'INV-9001', total: 1 })],
      ]),
    })
    expect(p.ok).toBe(false)
    if (!p.ok) expect(p.why).toMatch(/INV-0600/)
  })

  it('adds together two charges on the same invoice', () => {
    const a = line({ id: 'a', gross: 100, fee: 2.95, net: 97.05, paymentIntentId: 'pi_a' })
    const b = line({ id: 'b', gross: 50, fee: 1.63, net: 48.37, paymentIntentId: 'pi_b' })
    const one = inv({ id: 'inv-x', number: 'INV-0700', total: 150 })
    const p = proposeStripePayout({
      ...base, payoutAmount: 145.42, bankAmount: 145.42, lines: [a, b],
      invoiceByIntent: new Map([['pi_a', one], ['pi_b', one]]),
    })
    expect(p.ok && p.allocations).toEqual([{ invoiceId: 'inv-x', amount: 150 }])
  })
})
