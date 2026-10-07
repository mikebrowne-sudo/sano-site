import {
  occurrenceDates,
  AUTO_GENERATE_HORIZON_DAYS,
} from '@/app/portal/recurring-jobs/_lib/generate-due-recurring-jobs'

describe('occurrenceDates', () => {
  it('walks weekly dates inclusively from cursor to stopAt', () => {
    // NZCL: every Wednesday from 21 Oct.
    expect(occurrenceDates('weekly', '2026-10-21', '2026-11-11')).toEqual([
      '2026-10-21',
      '2026-10-28',
      '2026-11-04',
      '2026-11-11',
    ])
  })

  it('includes the stopAt date when it lands exactly on an occurrence', () => {
    expect(occurrenceDates('weekly', '2026-10-21', '2026-10-28')).toEqual([
      '2026-10-21',
      '2026-10-28',
    ])
  })

  it('excludes a date past stopAt', () => {
    expect(occurrenceDates('weekly', '2026-10-21', '2026-10-27')).toEqual(['2026-10-21'])
  })

  it('walks fortnightly', () => {
    expect(occurrenceDates('fortnightly', '2026-10-21', '2026-11-18')).toEqual([
      '2026-10-21',
      '2026-11-04',
      '2026-11-18',
    ])
  })

  it('walks monthly', () => {
    expect(occurrenceDates('monthly', '2026-10-21', '2027-01-21')).toEqual([
      '2026-10-21',
      '2026-11-21',
      '2026-12-21',
      '2027-01-21',
    ])
  })

  it('crosses a month and a year boundary correctly', () => {
    expect(occurrenceDates('weekly', '2026-12-30', '2027-01-13')).toEqual([
      '2026-12-30',
      '2027-01-06',
      '2027-01-13',
    ])
  })

  it('returns nothing for an unsupported frequency', () => {
    // A Wed+Fri pattern is not expressible as one rule; it must be two
    // weekly contracts. Returning [] (not throwing) lets the caller report it.
    expect(occurrenceDates('twice_weekly', '2026-10-21', '2026-11-30')).toEqual([])
    expect(occurrenceDates('daily', '2026-10-21', '2026-10-25')).toEqual([])
  })

  it('returns nothing when the cursor is already past stopAt', () => {
    expect(occurrenceDates('weekly', '2026-12-01', '2026-11-01')).toEqual([])
  })

  it('is capped so a bad date combination cannot loop unbounded', () => {
    const dates = occurrenceDates('weekly', '2026-01-01', '2099-01-01')
    expect(dates.length).toBe(400)
  })

  it('respects a custom cap', () => {
    expect(occurrenceDates('weekly', '2026-10-21', '2099-01-01', 3)).toEqual([
      '2026-10-21',
      '2026-10-28',
      '2026-11-04',
    ])
  })

  it('generates a sane number of dates over the default horizon', () => {
    // Six weeks of weekly occurrences = 7 (inclusive of both ends).
    const stop = new Date('2026-10-21T00:00:00Z')
    stop.setUTCDate(stop.getUTCDate() + AUTO_GENERATE_HORIZON_DAYS)
    const dates = occurrenceDates('weekly', '2026-10-21', stop.toISOString().slice(0, 10))
    expect(dates).toHaveLength(7)
  })

  it('the Oranga Tamariki Wed + Fri pair produces the real schedule', () => {
    // Two weekly contracts, not one twice-weekly rule.
    const weds = occurrenceDates('weekly', '2026-10-21', '2026-11-04')
    const fris = occurrenceDates('weekly', '2026-10-16', '2026-10-30')
    expect(weds).toEqual(['2026-10-21', '2026-10-28', '2026-11-04'])
    expect(fris).toEqual(['2026-10-16', '2026-10-23', '2026-10-30'])
    // Interleaved, that is the Wed/Fri rhythm the manual jobs had.
    expect([...weds, ...fris].sort()).toEqual([
      '2026-10-16',
      '2026-10-21',
      '2026-10-23',
      '2026-10-28',
      '2026-10-30',
      '2026-11-04',
    ])
  })
})
