import { invoiceBalanceDue, invoiceTotalInclGst } from '@/lib/invoice-balance'

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
