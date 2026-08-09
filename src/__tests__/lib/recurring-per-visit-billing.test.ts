/** @jest-environment node */

import { countServiceDays, computeRecurringAmount } from '@/app/portal/recurring-jobs/_lib/per-visit-billing'

describe('countServiceDays', () => {
  it('counts a single weekday across a month', () => {
    // August 2026: Mondays = 3,10,17,24,31 → 5
    expect(countServiceDays('2026-08-01', '2026-08-31', [1])).toBe(5)
  })
  it('counts a weekly (Monday) job — varies by month (4 vs 5)', () => {
    // Aug 2026 has 5 Mondays; Sep 2026 has 4 — the month-to-month variation.
    expect(countServiceDays('2026-08-01', '2026-08-31', [1])).toBe(5)
    expect(countServiceDays('2026-09-01', '2026-09-30', [1])).toBe(4)
  })
  it('3 days/week (Mon/Wed/Fri) in Aug 2026 = 13', () => {
    expect(countServiceDays('2026-08-01', '2026-08-31', [1, 3, 5])).toBe(13)
  })
  it('empty days-of-week → 0', () => {
    expect(countServiceDays('2026-08-01', '2026-08-31', [])).toBe(0)
  })
  it('is inclusive of both endpoints', () => {
    // 2026-08-03 is a Monday; single-day range on that Monday
    expect(countServiceDays('2026-08-03', '2026-08-03', [1])).toBe(1)
    expect(countServiceDays('2026-08-03', '2026-08-03', [2])).toBe(0)
  })
})

describe('computeRecurringAmount', () => {
  const period = { start: '2026-08-01', end: '2026-08-31' }

  it('fixed mode → flat monthly value, no visit count', () => {
    expect(computeRecurringAmount({ billingMode: 'fixed', monthlyValue: 2740 }, period)).toEqual({ amount: 2740, visits: null })
  })
  it('per-visit → rate × visits in the month', () => {
    // 3x/week @ $100/visit, Aug 2026 = 13 visits → $1300
    const r = computeRecurringAmount({ billingMode: 'per_visit', perVisitRate: 100, serviceDaysOfWeek: [1, 3, 5] }, period)
    expect(r).toEqual({ amount: 1300, visits: 13 })
  })
  it('per-visit differs across months (the whole point) — weekly job, 5 vs 4', () => {
    const aug = computeRecurringAmount({ billingMode: 'per_visit', perVisitRate: 100, serviceDaysOfWeek: [1] }, { start: '2026-08-01', end: '2026-08-31' })
    const sep = computeRecurringAmount({ billingMode: 'per_visit', perVisitRate: 100, serviceDaysOfWeek: [1] }, { start: '2026-09-01', end: '2026-09-30' })
    expect(aug.amount).toBe(500) // 5 Mondays × $100
    expect(sep.amount).toBe(400) // 4 Mondays × $100
  })
  it('rounds to cents', () => {
    const r = computeRecurringAmount({ billingMode: 'per_visit', perVisitRate: 33.33, serviceDaysOfWeek: [1] }, period)
    expect(r.amount).toBe(166.65) // 33.33 × 5
  })
  it('defaults to fixed when mode omitted', () => {
    expect(computeRecurringAmount({ monthlyValue: 500 }, period)).toEqual({ amount: 500, visits: null })
  })
})
