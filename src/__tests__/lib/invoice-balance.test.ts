import { invoiceBalanceDue, invoicePaymentSummary, invoiceTotalInclGst } from '@/lib/invoice-balance'

describe('invoice amounts customers actually pay', () => {
  it('GST-inclusive invoices are taken as entered', () => {
    expect(invoiceTotalInclGst({ base_price: 3555, discount: 0, gst_included: true, invoice_items: [] })).toBe(3555)
  })

  it('GST-exclusive invoices add 15% (the bug that understated dashboard + SMS amounts)', () => {
    expect(invoiceTotalInclGst({ base_price: 100, discount: 0, gst_included: false, invoice_items: [{ price: 50 }] })).toBe(172.5)
  })

  it('balance due takes off part payments already matched (INV-0308: half paid)', () => {
    expect(invoiceBalanceDue({ base_price: 3555, gst_included: true }, 1777.5)).toBe(1777.5)
  })

  it('never goes below zero', () => {
    expect(invoiceBalanceDue({ base_price: 100, gst_included: true }, 150)).toBe(0)
  })
})

describe('invoicePaymentSummary', () => {
  const inv = { base_price: 800, discount: 0, gst_included: true, invoice_items: [] }
  it('a PAID invoice counts as paid in full on its paid date', () => {
    expect(invoicePaymentSummary({ ...inv, status: 'paid', date_paid: '2026-10-08' }, 0)).toEqual({ paid: 800, datePaid: '2026-10-08' })
  })
  it('an unpaid invoice shows matched bank payments so far, capped at the total', () => {
    expect(invoicePaymentSummary({ ...inv, status: 'sent' }, 400)).toEqual({ paid: 400, datePaid: null })
    expect(invoicePaymentSummary({ ...inv, status: 'sent' }, 900)).toEqual({ paid: 800, datePaid: null })
  })
})

describe('invoicePaymentSummary — received date', () => {
  const inv = { base_price: 800, discount: 0, gst_included: true, invoice_items: [] }
  it('uses the bank date when the payment was matched in reconciliation', () => {
    // Marked paid by hand on 7 Oct, but the money landed on 7 Sep.
    expect(invoicePaymentSummary({ ...inv, status: 'paid', date_paid: '2026-10-07' }, 800, '2026-09-07')).toEqual({ paid: 800, datePaid: '2026-09-07' })
  })
  it('falls back to the recorded date for card / manual payments with no bank match', () => {
    expect(invoicePaymentSummary({ ...inv, status: 'paid', date_paid: '2026-10-08' }, 0, null)).toEqual({ paid: 800, datePaid: '2026-10-08' })
  })
})
