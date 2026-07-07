import { computeNextInvoiceDate, advanceOneMonth, isInvoiceDue } from '@/lib/recurring-invoice'

describe('recurring-invoice date logic', () => {
  it('next invoice date is the send day this month if not yet passed', () => {
    expect(computeNextInvoiceDate('2026-07-08', 15)).toBe('2026-07-15')
    expect(computeNextInvoiceDate('2026-07-15', 15)).toBe('2026-07-15') // on the day
  })

  it('rolls to next month when the send day has passed', () => {
    expect(computeNextInvoiceDate('2026-07-20', 15)).toBe('2026-08-15')
  })

  it('advances one month keeping the day, across a year boundary', () => {
    expect(advanceOneMonth('2026-07-15', 15)).toBe('2026-08-15')
    expect(advanceOneMonth('2026-12-15', 15)).toBe('2027-01-15')
  })

  it('clamps to the last day for short months (day 31 → Feb)', () => {
    expect(computeNextInvoiceDate('2026-02-01', 31)).toBe('2026-02-28')
  })

  it('isInvoiceDue only when today is on/after the next date', () => {
    expect(isInvoiceDue(null, '2026-07-15')).toBe(false)
    expect(isInvoiceDue('2026-07-15', '2026-07-14')).toBe(false)
    expect(isInvoiceDue('2026-07-15', '2026-07-15')).toBe(true)
    expect(isInvoiceDue('2026-07-15', '2026-07-20')).toBe(true)
  })
})
