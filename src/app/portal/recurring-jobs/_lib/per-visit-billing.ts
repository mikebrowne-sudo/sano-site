// Per-visit billing maths for recurring jobs.
//
// A per-visit recurring job charges per_visit_rate × the number of scheduled
// service days that fall in the billing month. Pure + dependency-free so it's
// unit-testable and shared by the invoice generator + the form preview.

/**
 * Count how many days between `start` and `end` (inclusive, 'YYYY-MM-DD') fall on
 * one of `daysOfWeek` (ISO 1=Mon..7=Sun). Date-only, timezone-agnostic (uses UTC
 * so it never drifts by a day).
 */
export function countServiceDays(start: string, end: string, daysOfWeek: number[]): number {
  if (!daysOfWeek || daysOfWeek.length === 0) return 0
  const set = new Set(daysOfWeek)
  const cur = new Date(`${start}T00:00:00Z`)
  const last = new Date(`${end}T00:00:00Z`)
  let count = 0
  let guard = 0
  while (cur <= last && guard < 400) {
    const jsDay = cur.getUTCDay()           // 0=Sun..6=Sat
    const iso = jsDay === 0 ? 7 : jsDay      // 1=Mon..7=Sun
    if (set.has(iso)) count++
    cur.setUTCDate(cur.getUTCDate() + 1)
    guard++
  }
  return count
}

export interface RecurringBillingInput {
  billingMode?: string | null
  monthlyValue?: number | null
  perVisitRate?: number | null
  serviceDaysOfWeek?: number[] | null
}

/**
 * The invoice base amount (ex-GST) for a billing period. Fixed → monthly_value.
 * Per-visit → per_visit_rate × service days in [start,end]. Returns the amount
 * plus, for per-visit, the visit count so the invoice can spell it out.
 */
export function computeRecurringAmount(
  rec: RecurringBillingInput,
  period: { start: string; end: string },
): { amount: number; visits: number | null } {
  if (rec.billingMode === 'per_visit') {
    const rate = Number(rec.perVisitRate) || 0
    const visits = countServiceDays(period.start, period.end, rec.serviceDaysOfWeek ?? [])
    return { amount: Math.round(rate * visits * 100) / 100, visits }
  }
  return { amount: Number(rec.monthlyValue) || 0, visits: null }
}
