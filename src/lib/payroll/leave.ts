// Leave engine — pure + testable. Holidays Act 2003 entitlements for a
// PERMANENT employee on fixed hours (Carol: 4 days × 5 hrs = 20 hrs/week).
//
// Fixed hours is what keeps this correct: with steady hours, ordinary weekly
// pay (OWP) equals average weekly earnings (AWE), so the Act's "greater of"
// test is satisfied trivially and leave is simply valued at the normal rate.
// Variable hours would need AWE tracking and is deliberately out of scope.
//
// Two entitlements, tracked in their natural units:
//   • Annual leave — 4 weeks/year, held in HOURS, accrued pro-rata each pay.
//   • Sick leave   — 10 days/year, held in DAYS, GRANTED in lumps by tenure
//                    (nothing at 0–6 months, then +10 at 6 months and on each
//                    12-month anniversary), capped at 20 days.

export interface LeaveProfile {
  /** Contracted hours per normal week (Carol: 20). */
  standardHoursPerWeek: number
  /** Length of a normal working day in hours (Carol: 5). Defines a sick "day". */
  standardHoursPerDay: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

// ── Annual leave (hours) ──────────────────────────────────────────────────

/** Full annual-leave entitlement for one completed year, in hours.
 *  4 weeks × the normal week. Carol: 4 × 20 = 80 hours. */
export function annualLeaveEntitlementHours(profile: LeaveProfile): number {
  return round2(4 * profile.standardHoursPerWeek)
}

/** Annual leave accrued in one pay period, pro-rata across the year.
 *  weeklyEntitlement / periodsPerYear. Over a full year this sums to the
 *  4-week entitlement. `periodsPerYear` = 52 weekly / 26 fortnightly / 12
 *  monthly. */
export function annualLeaveAccruedForPeriod(profile: LeaveProfile, periodsPerYear: number): number {
  if (periodsPerYear <= 0) return 0
  return round2(annualLeaveEntitlementHours(profile) / periodsPerYear)
}

// ── Sick leave (days) ─────────────────────────────────────────────────────

/** Whole months of continuous employment from `startDate` to `asOf`
 *  (both ISO yyyy-mm-dd). A month is completed on the same day-of-month. */
export function monthsOfService(startDate: string, asOf: string): number {
  const start = new Date(`${startDate}T00:00:00`)
  const at = new Date(`${asOf}T00:00:00`)
  if (at < start) return 0
  let months = (at.getFullYear() - start.getFullYear()) * 12 + (at.getMonth() - start.getMonth())
  if (at.getDate() < start.getDate()) months -= 1
  return Math.max(0, months)
}

/** Total sick-leave days GRANTED by tenure (before any taken).
 *  None before 6 months; 10 at 6 months; +10 on each 12-month anniversary
 *  thereafter (i.e. at 18, 30, … months); capped at 20 days. */
export function sickLeaveGrantedDays(startDate: string, asOf: string): number {
  const months = monthsOfService(startDate, asOf)
  if (months < 6) return 0
  // 10 at the 6-month mark, then +10 every 12 months after that.
  const anniversaries = Math.floor((months - 6) / 12)
  return Math.min(20, 10 + anniversaries * 10)
}

// ── Balances ──────────────────────────────────────────────────────────────

/** Available annual-leave hours = accrued − taken (never negative for display,
 *  but a negative value signals leave taken in advance — surface it). */
export function annualLeaveBalanceHours(accruedHours: number, takenHours: number): number {
  return round2(accruedHours - takenHours)
}

/** Available sick-leave days = granted-by-tenure − taken. */
export function sickLeaveBalanceDays(startDate: string, asOf: string, takenDays: number): number {
  return round2(sickLeaveGrantedDays(startDate, asOf) - takenDays)
}
