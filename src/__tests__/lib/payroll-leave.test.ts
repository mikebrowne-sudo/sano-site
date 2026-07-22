import {
  annualLeaveEntitlementHours,
  annualLeaveAccruedForPeriod,
  monthsOfService,
  sickLeaveGrantedDays,
  annualLeaveBalanceHours,
  sickLeaveBalanceDays,
  type LeaveProfile,
} from '@/lib/payroll/leave'

// Carol: 4 days × 5 hrs = 20 hrs/week, a "day" = 5 hrs.
const carol: LeaveProfile = { standardHoursPerWeek: 20, standardHoursPerDay: 5 }

describe('annual leave (hours)', () => {
  it('entitles 4 weeks = 80 hours', () => {
    expect(annualLeaveEntitlementHours(carol)).toBe(80)
  })

  it('accrues pro-rata each pay and sums to ~a year over the year', () => {
    const perWeek = annualLeaveAccruedForPeriod(carol, 52)
    expect(perWeek).toBeCloseTo(1.54, 2) // 80 / 52
    expect(perWeek * 52).toBeCloseTo(80, 0)
    // fortnightly / monthly reach the same annual entitlement
    expect(annualLeaveAccruedForPeriod(carol, 26) * 26).toBeCloseTo(80, 0)
    expect(annualLeaveAccruedForPeriod(carol, 12) * 12).toBeCloseTo(80, 0)
  })

  it('balance = accrued − taken', () => {
    expect(annualLeaveBalanceHours(80, 20)).toBe(60)
  })
})

describe('months of service', () => {
  it('counts completed calendar months', () => {
    expect(monthsOfService('2026-08-01', '2026-08-01')).toBe(0)
    expect(monthsOfService('2026-08-01', '2027-01-31')).toBe(5) // day 31 ≥ 1, but only 5 whole months
    expect(monthsOfService('2026-08-01', '2027-02-01')).toBe(6)
    expect(monthsOfService('2026-08-15', '2027-02-14')).toBe(5) // day 14 < 15 → not yet 6 months
  })

  it('is zero before the start date', () => {
    expect(monthsOfService('2026-08-01', '2026-07-01')).toBe(0)
  })
})

describe('sick leave (days, granted by tenure)', () => {
  const start = '2026-08-01'
  it('none before 6 months', () => {
    expect(sickLeaveGrantedDays(start, '2027-01-31')).toBe(0)
  })
  it('10 days at 6 months, holds until the next anniversary', () => {
    expect(sickLeaveGrantedDays(start, '2027-02-01')).toBe(10) // 6 months
    expect(sickLeaveGrantedDays(start, '2028-01-01')).toBe(10) // 17 months
  })
  it('+10 on each 12-month anniversary, capped at 20', () => {
    expect(sickLeaveGrantedDays(start, '2028-02-01')).toBe(20) // 18 months
    expect(sickLeaveGrantedDays(start, '2029-02-01')).toBe(20) // 30 months → capped
  })
  it('balance = granted − taken', () => {
    expect(sickLeaveBalanceDays(start, '2027-02-01', 3)).toBe(7)
  })
})
