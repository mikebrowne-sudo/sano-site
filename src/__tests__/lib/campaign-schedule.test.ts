/** @jest-environment node */

import { isCampaignSendDay, businessDaysBetween, nzWeekday } from '@/lib/campaigns/send-batch'

// Campaign email goes out Mon–Thu (NZ) only; the follow-up fires ~5 business
// days after the intro. Use UTC times that map cleanly to NZ dates.

describe('isCampaignSendDay — Mon–Thu only (NZ)', () => {
  it('allows Monday–Thursday', () => {
    // 2026-08-03 is a Monday ... 2026-08-06 Thursday (NZ, using midday UTC to avoid TZ edge)
    for (const d of ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06']) {
      expect(isCampaignSendDay(new Date(`${d}T00:30:00Z`))).toBe(true)
    }
  })
  it('blocks Friday, Saturday, Sunday', () => {
    for (const d of ['2026-08-07', '2026-08-08', '2026-08-09']) {
      expect(isCampaignSendDay(new Date(`${d}T00:30:00Z`))).toBe(false)
    }
  })
})

describe('businessDaysBetween — Mon–Fri counted', () => {
  it('Mon → next Mon is 5 business days', () => {
    // 2026-08-03 (Mon) → 2026-08-10 (Mon)
    expect(businessDaysBetween('2026-08-03T00:30:00Z', new Date('2026-08-10T00:30:00Z'))).toBe(5)
  })
  it('a weekend adds no business days', () => {
    // Fri 2026-08-07 → Mon 2026-08-10 = 1 business day (Mon), Sat/Sun skipped
    expect(businessDaysBetween('2026-08-07T00:30:00Z', new Date('2026-08-10T00:30:00Z'))).toBe(1)
  })
  it('nzWeekday returns 1..7 (Mon..Sun)', () => {
    expect(nzWeekday(new Date('2026-08-03T00:30:00Z'))).toBe(1) // Monday
    expect(nzWeekday(new Date('2026-08-09T00:30:00Z'))).toBe(7) // Sunday
  })
})
