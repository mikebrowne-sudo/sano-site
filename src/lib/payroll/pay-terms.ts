// Effective-dated employee pay terms. Carol's (and any employee's) standing
// payroll config is versioned, never a single mutable value: changing hours or
// rate INSERTS a new version and closes the prior one, so every historical pay
// run can resolve to the exact terms in force when it was calculated.
//
// Pure + testable — no DB, no Date.now(). Dates are 'YYYY-MM-DD' and compare
// lexicographically, so no parsing is needed for the range logic.

export type PayFrequency = 'weekly' | 'fortnightly'
export type PayBasis = 'advance' | 'arrears'

export interface PayTerms {
  id?: string
  standardWeeklyHours: number
  hourlyRate: number
  workingPattern: string | null
  payFrequency: PayFrequency
  payday: string // e.g. 'monday'
  basis: PayBasis
  effectiveFrom: string // 'YYYY-MM-DD' inclusive
  effectiveTo: string | null // 'YYYY-MM-DD' inclusive, or null = current
}

/**
 * The terms version in force on `date`: effectiveFrom ≤ date ≤ (effectiveTo ??
 * open). If several match (shouldn't, with clean versioning), the one with the
 * latest effectiveFrom wins. Null when no version covers the date.
 */
export function resolveTermsAsAt(terms: PayTerms[], date: string): PayTerms | null {
  const matches = terms.filter(
    (t) => t.effectiveFrom <= date && (t.effectiveTo == null || date <= t.effectiveTo),
  )
  if (matches.length === 0) return null
  return matches.reduce((best, t) => (t.effectiveFrom > best.effectiveFrom ? t : best))
}

/** The effective_to to stamp on the prior version = the day before `newEffectiveFrom`. */
export function supersedeDate(newEffectiveFrom: string): string {
  const [y, m, d] = newEffectiveFrom.split('-').map(Number)
  const ms = Date.UTC(y, m - 1, d) - 86_400_000
  return new Date(ms).toISOString().slice(0, 10)
}

/** A DB row (snake_case) → the PayTerms view. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function payTermsFromRow(r: any): PayTerms {
  return {
    id: r.id,
    standardWeeklyHours: Number(r.standard_weekly_hours),
    hourlyRate: Number(r.hourly_rate),
    workingPattern: r.working_pattern ?? null,
    payFrequency: r.pay_frequency,
    payday: r.payday,
    basis: r.basis,
    effectiveFrom: r.effective_from,
    effectiveTo: r.effective_to ?? null,
  }
}
