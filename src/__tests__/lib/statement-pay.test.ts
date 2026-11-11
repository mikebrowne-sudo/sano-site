// Paying a whole statement by card: the fee split is exact to the cent, card
// is only offered when every owing invoice allows it, the split survives the
// Stripe metadata round trip, and payout matching splits the one charge back.

import {
  decodePlanMetadata,
  encodePlanMetadata,
  exactFeeItemPrice,
  splitCardFee,
  statementCardPlan,
  type StatementPayInvoice,
} from '@/lib/statement-pay'
import { proposeStripePayout, type StripeInvoiceRef } from '@/lib/stripe-payout-reconcile'
import { invoiceTotalInclGst } from '@/lib/invoice-balance'

const inv = (p: Partial<StatementPayInvoice>): StatementPayInvoice => ({
  id: 'i1', number: 'INV-0001', status: 'sent', balance: 180, lineTotal: p.balance ?? 180, gstIncluded: true, cardOk: true, ...p,
})

describe('splitCardFee', () => {
  it('sums exactly to the fee', () => {
    const shares = splitCardFee([180, 180, 180], 13.5)
    expect(shares).toEqual([4.5, 4.5, 4.5])
    const odd = splitCardFee([100, 100, 100], 0.1)
    expect(Math.round(odd.reduce((s, x) => s + x, 0) * 100)).toBe(10)
  })

  it('is proportional', () => {
    expect(splitCardFee([300, 100], 10)).toEqual([7.5, 2.5])
  })
})

describe('statementCardPlan', () => {
  const bella = [inv({ id: 'a', number: 'INV-0547' }), inv({ id: 'b', number: 'INV-0566' }), inv({ id: 'c', number: 'INV-0585' })]

  it('Bella: $540 + 2.5% = $13.50 fee, $4.50 per invoice', () => {
    const plan = statementCardPlan(bella)!
    expect(plan.amount).toBe(540)
    expect(plan.fee).toBe(13.5)
    expect(plan.parts.map((p) => p.fee)).toEqual([4.5, 4.5, 4.5])
    expect(plan.parts.every((p) => p.feeItemPrice === 4.5)).toBe(true) // GST-inclusive invoices
  })

  it('fee line is ex-GST on a GST-exclusive invoice', () => {
    const plan = statementCardPlan([inv({ gstIncluded: false, balance: 115, lineTotal: 100 })])!
    expect(plan.parts[0].fee).toBe(2.88)
    expect(plan.parts[0].feeItemPrice).toBe(2.5)
  })

  it('exact fee line on GST-exclusive invoices: total rises by exactly the fee share', () => {
    // The invoice's real total, exactly as the portal / PDF / payout matching compute it.
    const total = (base: number, fee = 0) => Math.round(invoiceTotalInclGst({ base_price: base, discount: 0, gst_included: false, invoice_items: fee ? [{ price: fee }] : [] }) * 100)
    let checked = 0
    for (let c = 1000; c < 60000; c += 137) {
      const lineTotal = c / 100
      const fee = Math.round(lineTotal * 1.15 * 2.5) / 100
      const p = exactFeeItemPrice(lineTotal, false, fee)
      if (p === null) continue
      checked++
      expect(total(lineTotal, p) - total(lineTotal)).toBe(Math.round(fee * 100))
    }
    expect(checked).toBeGreaterThan(300)
  })

  it('never offers card on an invoice already being collected by direct debit', () => {
    const plan = statementCardPlan([inv({ id: 'a' }), inv({ id: 'b', debiting: true })])!
    expect(plan.parts.map((p) => p.invoiceId)).toEqual(['a'])
    expect(statementCardPlan([inv({ debiting: true })])).toBeNull()
  })

  it('skips paid / zero-balance invoices', () => {
    const plan = statementCardPlan([...bella, inv({ id: 'd', status: 'paid', balance: 0 })])!
    expect(plan.parts).toHaveLength(3)
  })

  it('offers no card when any owing invoice does not allow it', () => {
    expect(statementCardPlan([...bella, inv({ id: 'd', cardOk: false })])).toBeNull()
  })

  it('offers no card on drafts or when nothing is owed', () => {
    expect(statementCardPlan([inv({ status: 'draft' })])).toBeNull()
    expect(statementCardPlan([inv({ balance: 0 })])).toBeNull()
  })

  it('round-trips through Stripe metadata', () => {
    const plan = statementCardPlan(bella)!
    const md = encodePlanMetadata(plan)
    expect(Object.values(md).every((v) => v.length < 500)).toBe(true)
    expect(decodePlanMetadata(md)).toEqual(plan.parts)
  })
})

describe('Stripe payout: one statement charge split across invoices', () => {
  const ref = (id: string, number: string, total: number): StripeInvoiceRef => ({ id, number, total, allocated: 0 })
  // Each invoice: $180 + $4.50 fee line = $184.50; charge $553.50, Stripe fee $14.97.
  const statementCharge = { id: 'txn_s', type: 'charge', gross: 553.5, fee: 14.97, net: 538.53, paymentIntentId: 'pi_stm', feeIncludesGst: true }
  const refs = [ref('a', 'INV-0547', 184.5), ref('b', 'INV-0566', 184.5), ref('c', 'INV-0585', 184.5)]

  it('allocates each invoice its own amount', () => {
    const p = proposeStripePayout({
      payoutId: 'po_s', payoutAmount: 538.53, bankAmount: 538.53, lines: [statementCharge],
      invoiceByIntent: new Map([['pi_stm', refs]]), quoteByIntent: new Map(),
    })
    expect(p.ok).toBe(true)
    if (p.ok) {
      expect(p.allocations).toEqual([
        { invoiceId: 'a', amount: 184.5 }, { invoiceId: 'b', amount: 184.5 }, { invoiceId: 'c', amount: 184.5 },
      ])
      expect(p.fee).toBe(14.97)
    }
  })

  it('refuses when the invoices no longer add up to the charge', () => {
    const p = proposeStripePayout({
      payoutId: 'po_s', payoutAmount: 538.53, bankAmount: 538.53, lines: [statementCharge],
      invoiceByIntent: new Map([['pi_stm', [refs[0], refs[1], { ...refs[2], allocated: 184.5 }]]]), quoteByIntent: new Map(),
    })
    expect(p.ok).toBe(false)
  })
})
