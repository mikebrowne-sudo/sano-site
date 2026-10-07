import { payPeriodForDate, payPeriodForKey, previousPayPeriod, recentPayPeriods } from '@/lib/contractor-pay-period'

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

describe('payPeriodForKey — round-trips a period selection', () => {
  it('resolves a period from its start-date key', () => {
    expect(payPeriodForKey('2026-07-16')?.label).toBe('16–31 July 2026')
    expect(payPeriodForKey('2026-07-01')?.label).toBe('1–15 July 2026')
  })
  it('returns null for a bad/missing key', () => {
    expect(payPeriodForKey(null)).toBeNull()
    expect(payPeriodForKey('nope')).toBeNull()
  })
})

describe('previousPayPeriod — steps back one half-month', () => {
  it('from 16–EOM back to 1–15 of the same month', () => {
    expect(previousPayPeriod('2026-07-20').label).toBe('1–15 July 2026')
  })
  it('from 1–15 back to 16–EOM of the previous month', () => {
    expect(previousPayPeriod('2026-07-05').label).toBe('16–30 June 2026')
  })
  it('crosses the year boundary (Jan 1–15 → 16–31 Dec prev year)', () => {
    expect(previousPayPeriod('2026-01-10').label).toBe('16–31 December 2025')
  })
})

describe('recentPayPeriods — newest first, contiguous', () => {
  it('lists N periods starting from the one containing today', () => {
    const ps = recentPayPeriods('2026-07-20', 4)
    expect(ps.map((p) => p.label)).toEqual([
      '16–31 July 2026', '1–15 July 2026', '16–30 June 2026', '1–15 June 2026',
    ])
  })
  it('each carries the correct pay date (30th / 15th-next)', () => {
    const [current] = recentPayPeriods('2026-07-05', 1)   // 1–15 July → paid 30 July
    expect(current.payDate).toBe('2026-07-30')
    const [second] = recentPayPeriods('2026-07-20', 1)    // 16–31 July → paid 15 Aug
    expect(second.payDate).toBe('2026-08-15')
  })
})
