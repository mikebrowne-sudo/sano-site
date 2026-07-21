import {
  periodContaining,
  nextPeriod,
  previousPeriod,
  mostRecentlyClosedPeriod,
  lastDayOfMonth,
} from '@/lib/contractor-statement-period'

describe('periodContaining — 1–15 and 16–EOM', () => {
  it('day 1–15 → first period', () => {
    expect(periodContaining('2026-07-01')).toEqual({ period_start: '2026-07-01', period_end: '2026-07-15' })
    expect(periodContaining('2026-07-15')).toEqual({ period_start: '2026-07-01', period_end: '2026-07-15' })
  })

  it('day 16–EOM → second period', () => {
    expect(periodContaining('2026-07-16')).toEqual({ period_start: '2026-07-16', period_end: '2026-07-31' })
    expect(periodContaining('2026-07-31')).toEqual({ period_start: '2026-07-16', period_end: '2026-07-31' })
  })
})

describe('month lengths (28/29/30/31)', () => {
  it('February — non-leap (2026) vs leap (2028)', () => {
    expect(lastDayOfMonth(2026, 2)).toBe(28)
    expect(lastDayOfMonth(2028, 2)).toBe(29)
    expect(periodContaining('2026-02-20')).toEqual({ period_start: '2026-02-16', period_end: '2026-02-28' })
    expect(periodContaining('2028-02-20')).toEqual({ period_start: '2028-02-16', period_end: '2028-02-29' })
  })

  it('30- and 31-day months', () => {
    expect(periodContaining('2026-04-25')).toEqual({ period_start: '2026-04-16', period_end: '2026-04-30' })
    expect(periodContaining('2026-01-25')).toEqual({ period_start: '2026-01-16', period_end: '2026-01-31' })
  })
})

describe('nextPeriod / previousPeriod boundaries', () => {
  it('first half → second half of the same month', () => {
    expect(nextPeriod({ period_start: '2026-07-01', period_end: '2026-07-15' }))
      .toEqual({ period_start: '2026-07-16', period_end: '2026-07-31' })
  })

  it('second half of December → first half of January (year rolls)', () => {
    expect(nextPeriod({ period_start: '2026-12-16', period_end: '2026-12-31' }))
      .toEqual({ period_start: '2027-01-01', period_end: '2027-01-15' })
  })

  it('first half of January → second half of December (year rolls back)', () => {
    expect(previousPeriod({ period_start: '2027-01-01', period_end: '2027-01-15' }))
      .toEqual({ period_start: '2026-12-16', period_end: '2026-12-31' })
  })

  it('second half → first half of the same month (previous)', () => {
    expect(previousPeriod({ period_start: '2026-02-16', period_end: '2026-02-28' }))
      .toEqual({ period_start: '2026-02-01', period_end: '2026-02-15' })
  })
})

describe('mostRecentlyClosedPeriod', () => {
  it('on the 21st, the most recently closed period is the 1st–15th', () => {
    expect(mostRecentlyClosedPeriod('2026-07-21'))
      .toEqual({ period_start: '2026-07-01', period_end: '2026-07-15' })
  })

  it('on the 10th, the most recently closed period is the previous month 16th–EOM', () => {
    expect(mostRecentlyClosedPeriod('2026-03-10'))
      .toEqual({ period_start: '2026-02-16', period_end: '2026-02-28' })
  })

  it('on the 1st of January, rolls back to 16–31 December of the prior year', () => {
    expect(mostRecentlyClosedPeriod('2027-01-01'))
      .toEqual({ period_start: '2026-12-16', period_end: '2026-12-31' })
  })
})

describe('NZ-local strings do not shift across UTC boundaries', () => {
  it('treats the value as a calendar date, never converting to UTC', () => {
    // 2026-07-16 NZ is still 2026-07-15 in UTC; the helper must NOT move it back
    // into the first period. Pure string math guarantees this.
    expect(periodContaining('2026-07-16').period_start).toBe('2026-07-16')
    // Month-end is DST/UTC-safe.
    expect(periodContaining('2026-11-30')).toEqual({ period_start: '2026-11-16', period_end: '2026-11-30' })
  })
})
