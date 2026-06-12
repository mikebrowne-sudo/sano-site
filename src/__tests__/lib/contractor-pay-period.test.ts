import { payPeriodForDate } from '@/lib/contractor-pay-period'

describe('payPeriodForDate — pay-run schedule', () => {
  it('first half (1st–15th) is paid the 30th of the same month', () => {
    const p = payPeriodForDate('2026-06-05')
    expect(p.periodStart).toBe('2026-06-01')
    expect(p.periodEnd).toBe('2026-06-15')
    expect(p.payDate).toBe('2026-06-30')
    expect(p.label).toBe('1–15 June 2026')
    expect(p.payDateLabel).toBe('Paid 30 June 2026')
  })

  it('the 15th is the last day of the first half', () => {
    expect(payPeriodForDate('2026-06-15').payDate).toBe('2026-06-30')
  })

  it('the 16th tips into the second half — paid the 15th of next month', () => {
    const p = payPeriodForDate('2026-06-16')
    expect(p.periodStart).toBe('2026-06-16')
    expect(p.periodEnd).toBe('2026-06-30')
    expect(p.payDate).toBe('2026-07-15')
    expect(p.label).toBe('16–30 June 2026')
    expect(p.payDateLabel).toBe('Paid 15 July 2026')
  })

  it('end of month (second half) is paid the 15th of next month', () => {
    expect(payPeriodForDate('2026-06-30').payDate).toBe('2026-07-15')
    expect(payPeriodForDate('2026-07-31').payDate).toBe('2026-08-15')
  })

  it('rolls the year over from December', () => {
    const p = payPeriodForDate('2026-12-20')
    expect(p.periodEnd).toBe('2026-12-31')
    expect(p.payDate).toBe('2027-01-15')
    expect(p.payDateLabel).toBe('Paid 15 January 2027')
  })

  it('clamps the 30th to the last day of February (non-leap)', () => {
    const p = payPeriodForDate('2026-02-10')
    expect(p.periodEnd).toBe('2026-02-15')
    expect(p.payDate).toBe('2026-02-28')
    expect(p.payDateLabel).toBe('Paid 28 February 2026')
  })

  it('clamps the 30th to the 29th in a leap February', () => {
    expect(payPeriodForDate('2024-02-03').payDate).toBe('2024-02-29')
  })

  it('second-half February is paid 15 March', () => {
    const p = payPeriodForDate('2026-02-20')
    expect(p.periodEnd).toBe('2026-02-28')
    expect(p.payDate).toBe('2026-03-15')
  })

  it('accepts the date portion of a timestamptz string', () => {
    expect(payPeriodForDate('2026-06-05T21:30:00.000Z').payDate).toBe('2026-06-30')
  })

  it('accepts a Date instance', () => {
    expect(payPeriodForDate(new Date(2026, 5, 5)).payDate).toBe('2026-06-30') // month is 0-based → June
  })

  it('throws on an unparseable input', () => {
    expect(() => payPeriodForDate('not-a-date')).toThrow()
  })
})
