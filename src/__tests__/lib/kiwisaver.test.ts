import { kiwiSaverOptOutStatus } from '@/lib/kiwisaver'

describe('kiwiSaverOptOutStatus', () => {
  it('no start date → no_start', () => {
    expect(kiwiSaverOptOutStatus({ startDate: null, optOutFiled: false }, '2026-07-07').status).toBe('no_start')
  })

  it('filed → filed regardless of dates', () => {
    expect(kiwiSaverOptOutStatus({ startDate: '2026-06-01', optOutFiled: true }, '2026-07-07').status).toBe('filed')
  })

  it('before day 14 → before_window with a countdown', () => {
    const r = kiwiSaverOptOutStatus({ startDate: '2026-07-01', optOutFiled: false }, '2026-07-07')
    expect(r.status).toBe('before_window')
    expect(r.windowStart).toBe('2026-07-15') // day 14
    expect(r.windowEnd).toBe('2026-08-26') // day 56
    expect(r.daysUntilOpen).toBe(8)
  })

  it('inside the day 14–56 window → in_window with days left', () => {
    const r = kiwiSaverOptOutStatus({ startDate: '2026-07-01', optOutFiled: false }, '2026-07-20')
    expect(r.status).toBe('in_window')
    expect(r.daysLeft).toBe(37) // 2026-08-26 minus 2026-07-20
  })

  it('past day 56 → after_window', () => {
    expect(kiwiSaverOptOutStatus({ startDate: '2026-05-01', optOutFiled: false }, '2026-07-07').status).toBe('after_window')
  })

  it('day 14 exactly is in the window', () => {
    expect(kiwiSaverOptOutStatus({ startDate: '2026-07-01', optOutFiled: false }, '2026-07-15').status).toBe('in_window')
  })
})
