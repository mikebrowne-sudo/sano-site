import { nzToday } from '@/lib/nz-date'

describe('nzToday', () => {
  it('is already the 1st in NZ when the 21:00 UTC cron fires on the 31st', () => {
    expect(nzToday(new Date('2026-10-31T21:00:00Z'))).toBe('2026-11-01')
  })
  it('matches UTC in the NZ afternoon', () => {
    expect(nzToday(new Date('2026-11-01T02:00:00Z'))).toBe('2026-11-01')
  })
  it('handles NZST (winter) too', () => {
    expect(nzToday(new Date('2026-06-30T13:00:00Z'))).toBe('2026-07-01')
  })
})
