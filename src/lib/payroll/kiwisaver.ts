// ============================================================================
// KiwiSaver — SINGLE SOURCE OF TRUTH for contribution rates, defaults + rules.
// ============================================================================
// Rates effective 1 April 2026 (IRD guidance, confirmed 2026-07-24):
//   • Default minimum contribution = 3.5% for BOTH employee and employer
//     (rose from 3%; rises again to 4% on 1 April 2028).
//   • Employee standard elections: 3.5% / 4% / 6% / 8% / 10%.
//   • 3% is NOT a standard election — it is valid ONLY under a temporary rate
//     reduction (an employer-applied arrangement of 3–12 months).
//
// Every KiwiSaver rate default, minimum, option, floor and validation MUST come
// from here. Do not re-hardcode 3 or 3.5 anywhere else.
// Ref: https://www.ird.govt.nz/kiwisaver-changes
// ============================================================================

/** Employee contribution rates an employee may elect (standard). 3% is not here. */
export const KS_EMPLOYEE_STANDARD_RATES: readonly number[] = [3.5, 4, 6, 8, 10]

/** The only employee rate valid under a temporary rate reduction. */
export const KS_TEMP_REDUCTION_RATE = 3

/** All employee rates that may legitimately be STORED (standard + temp reduction). */
export const KS_EMPLOYEE_ALLOWED_RATES: readonly number[] = [3, 3.5, 4, 6, 8, 10]

/** Default employee rate when none is elected (from 1 Apr 2026). */
export const KS_DEFAULT_EMPLOYEE = 3.5
/** Default + statutory minimum employer rate (from 1 Apr 2026). */
export const KS_DEFAULT_EMPLOYER = 3.5
export const KS_EMPLOYER_MIN_RATE = 3.5
/** Fraction form of the employer minimum, for tax modules (ESCT). */
export const KS_EMPLOYER_MIN_RATE_FRACTION = KS_EMPLOYER_MIN_RATE / 100

export type KsRateSource = 'standard' | 'temporary_reduction' | 'employee_election'

export const KS_RATE_SOURCES: ReadonlyArray<{ value: KsRateSource; label: string }> = [
  { value: 'standard', label: 'Standard minimum (3.5%)' },
  { value: 'temporary_reduction', label: 'Temporary rate reduction (3%)' },
  { value: 'employee_election', label: 'Employee-elected higher rate' },
]

/** Employer rate to actually apply: floored at the statutory minimum (3.5%). */
export function employerKiwiSaverRate(stored: number | null | undefined): number {
  return Math.max(Number(stored ?? KS_DEFAULT_EMPLOYER), KS_EMPLOYER_MIN_RATE)
}

// ---------------------------------------------------------------------------
// Membership STATUS model (Phase 4) — an employee's KiwiSaver situation, distinct
// from the contribution RATE above. Drives whether payroll deducts
// (kiwisaver_enrolled) and whether the KS10 opt-out window applies.
// IRD (KS4, 2026): auto-enrol new eligible employees 18–65 (not if already a
// member); ONLY auto-enrolled employees may opt out (day 14–56, via KS10);
// opted-in employees cannot opt out. Ref: https://www.ird.govt.nz/kiwisaver
// ---------------------------------------------------------------------------

export type KiwiSaverMembershipStatus =
  | 'existing_member'     // already a member (KS2) — enrolled, cannot opt out
  | 'auto_enrolled'       // new eligible employee 18–65 — enrolled, KS10 window applies
  | 'opted_in'            // chose to opt in — enrolled, cannot opt out
  | 'not_eligible'        // not eligible for automatic enrolment — not enrolled
  | 'savings_suspension'  // on a savings suspension — deductions paused
  | 'opted_out'           // opted out within the permitted window (KS10) — not enrolled
  | 'review_required'     // status not yet determined — staff review

export const KIWISAVER_STATUSES: ReadonlyArray<{ value: KiwiSaverMembershipStatus; label: string; enrolled: boolean; canOptOut: boolean }> = [
  { value: 'existing_member',    label: 'Existing KiwiSaver member',               enrolled: true,  canOptOut: false },
  { value: 'auto_enrolled',      label: 'Automatically enrolled (new employee)',   enrolled: true,  canOptOut: true },
  { value: 'opted_in',           label: 'Opted in',                                enrolled: true,  canOptOut: false },
  { value: 'not_eligible',       label: 'Not eligible for automatic enrolment',    enrolled: false, canOptOut: false },
  { value: 'savings_suspension', label: 'Savings suspension',                      enrolled: false, canOptOut: false },
  { value: 'opted_out',          label: 'Opted out (within the permitted period)', enrolled: false, canOptOut: false },
  { value: 'review_required',    label: 'Review required',                         enrolled: false, canOptOut: false },
]

const KS_STATUS_MAP = new Map(KIWISAVER_STATUSES.map((s) => [s.value, s]))

/** Whether payroll deducts KiwiSaver for this membership status. Payroll reads
 *  the derived kiwisaver_enrolled flag; this keeps that flag in sync with status. */
export function kiwiSaverStatusEnrolled(status: string | null | undefined): boolean {
  return KS_STATUS_MAP.get(status as KiwiSaverMembershipStatus)?.enrolled ?? false
}

/** Only an auto-enrolled employee may opt out (day 14–56, via KS10). */
export function kiwiSaverStatusCanOptOut(status: string | null | undefined): boolean {
  return KS_STATUS_MAP.get(status as KiwiSaverMembershipStatus)?.canOptOut ?? false
}

export function isKiwiSaverStatus(v: string | null | undefined): v is KiwiSaverMembershipStatus {
  return !!v && KS_STATUS_MAP.has(v as KiwiSaverMembershipStatus)
}

/** Map the employee's self-declared situation at signing to a status. A
 *  non-member eligible new employee is AUTO-ENROLLED (never a pre-emptive
 *  opt-out — that is only possible later, within the KS10 window). */
export function newHireKiwiSaverStatus(situation: 'existing_member' | 'joining'): KiwiSaverMembershipStatus {
  return situation === 'existing_member' ? 'existing_member' : 'auto_enrolled'
}

/** True when a temporary reduction has lapsed as of `asOf`. ISO date strings
 *  compare lexicographically, so no Date parsing is needed. */
export function isTempReductionExpired(
  source: string | null | undefined,
  expiry: string | null | undefined,
  asOf: string,
): boolean {
  if (source !== 'temporary_reduction' || !expiry) return false
  return expiry < asOf
}

export interface KsElection {
  rate: number | null | undefined
  source: string | null | undefined
  expiry?: string | null | undefined
}

/**
 * Validate a KiwiSaver election that is being WRITTEN (create/update/sign).
 * NEVER call this on display — historical rows shown but not edited must not be
 * rejected.
 *
 *   • `error`   — a structurally invalid combination; block the write.
 *   • `warning` — a legitimate-but-attention-needed state (a stored 3% that is
 *                 not a temporary reduction, or an expired reduction); allow the
 *                 write but surface it so staff can resolve it.
 */
export function validateKiwiSaverElection(e: KsElection): { error?: string; warning?: string } {
  if (e.rate == null) return {} // not enrolled / rate not set — nothing to validate
  const rate = Number(e.rate)
  if (!KS_EMPLOYEE_ALLOWED_RATES.includes(rate)) {
    return { error: `${rate}% is not a valid KiwiSaver contribution rate.` }
  }
  const source = (e.source ?? 'standard') as string
  if (!KS_RATE_SOURCES.some((s) => s.value === source)) {
    return { error: `Unknown KiwiSaver rate source "${source}".` }
  }
  if (source === 'temporary_reduction') {
    if (rate !== KS_TEMP_REDUCTION_RATE) return { error: 'A temporary rate reduction must be 3%.' }
    if (!e.expiry) return { error: 'A temporary rate reduction requires an expiry date (3–12 months).' }
    return {}
  }
  // standard / employee_election
  if (rate === KS_TEMP_REDUCTION_RATE) {
    return {
      warning:
        '3% is only valid under a temporary rate reduction — set the source to “Temporary rate reduction” with an expiry date, or use the standard 3.5%.',
    }
  }
  if (!KS_EMPLOYEE_STANDARD_RATES.includes(rate)) {
    return { error: `${rate}% is not a valid standard KiwiSaver election.` }
  }
  return {}
}

/**
 * Resolve the employee KiwiSaver rate to USE for a pay run, actively guarding
 * against an expired temporary reduction. An expired 3% is never continued
 * silently: the standard minimum is used and a warning is returned so staff
 * review and correct the employee's record.
 */
export function resolveEmployeeKiwiSaverRateForPay(p: {
  rate: number | null | undefined
  source: string | null | undefined
  expiry: string | null | undefined
  asOf: string
}): { rate: number; warning?: string } {
  if (isTempReductionExpired(p.source, p.expiry, p.asOf)) {
    return {
      rate: KS_DEFAULT_EMPLOYEE,
      warning: `Temporary KiwiSaver rate reduction expired on ${p.expiry}; the pay run used the standard ${KS_DEFAULT_EMPLOYEE}% instead of 3%. Confirm and update the employee's record.`,
    }
  }
  return { rate: Number(p.rate ?? KS_DEFAULT_EMPLOYEE) }
}
