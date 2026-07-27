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

import { kiwiSaverOptOutStatus } from '@/lib/kiwisaver'

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

// ---------------------------------------------------------------------------
// Compliance transitions (opt-out / savings suspension / intention). Pure +
// testable — they return the exact contractor patch to apply, or an error that
// BLOCKS the write. The rule the whole design turns on: a stated intention to
// opt out is NEVER operative. Deductions and employer contributions continue
// until a valid opt-out (KS10 or IRD-processed) or an evidenced savings
// suspension is recorded. Payroll reads only kiwisaver_status + kiwisaver_enrolled.
// Ref: IRD KS4/KS10; opt-out window day 14–56 (see kiwiSaverOptOutStatus).
// ---------------------------------------------------------------------------

/** The patch these transitions produce — a subset of the contractors columns. */
export interface KiwiSaverStatePatch {
  kiwisaver_status: KiwiSaverMembershipStatus
  kiwisaver_enrolled: boolean
  kiwisaver_ks10_signed_date?: string | null
  kiwisaver_ks10_received_date?: string | null
  kiwisaver_ird_approval_reference?: string | null
  kiwisaver_ird_approval_date?: string | null
  kiwisaver_payroll_stop_effective_date?: string | null
  kiwisaver_savings_suspension_ref?: string | null
  kiwisaver_savings_suspension_from?: string | null
  kiwisaver_savings_suspension_to?: string | null
}

// Two DISTINCT opt-out routes — never interchangeable. Both require the worker
// to be currently auto_enrolled (only auto-enrolled employees can opt out).

export interface EmployerOptOutInput {
  status: string | null | undefined
  startDate: string | null | undefined
  /** Date the employee signed the KS10. */
  ks10SignedDate: string | null | undefined
  /** Date Sano (the employer) received the completed KS10. */
  ks10ReceivedDate: string | null | undefined
  /** Effective date payroll deductions stop (defaults to the KS10 received date). */
  payrollStopEffectiveDate?: string | null
}

/**
 * EMPLOYER-RECEIVED opt-out (KS10). Valid only when the employer receives a
 * completed KS10 within the statutory window: received on/after day 14 and
 * on/before day 56. Records both the employee-signed date and the received
 * date. On success Sano may stop deductions from the effective date and must
 * then submit the opt-out to IRD (recorded separately).
 */
export function validateEmployerOptOut(i: EmployerOptOutInput): { error?: string; patch?: KiwiSaverStatePatch } {
  if (i.status !== 'auto_enrolled') {
    return { error: 'Only an automatically enrolled employee may opt out. Existing/opted-in members cannot opt out; use a savings suspension instead.' }
  }
  if (!i.ks10SignedDate) return { error: 'Record the date the employee signed the KS10.' }
  if (!i.ks10ReceivedDate) return { error: 'A KS10 employer opt-out requires the date the completed KS10 was received by Sano.' }
  // The RECEIVED date must fall within the day-14–56 window (evaluate the window
  // as at the received date). A late KS10 must go through the IRD route instead.
  const w = kiwiSaverOptOutStatus({ startDate: i.startDate ?? null, optOutFiled: false }, i.ks10ReceivedDate)
  if (w.status === 'no_start') return { error: 'A start date is required to validate the KS10 opt-out window.' }
  if (w.status === 'before_window') return { error: `The KS10 was received before the opt-out window opened (day 14, ${w.windowStart}).` }
  if (w.status === 'after_window') return { error: `The KS10 was received after the opt-out window closed (day 56, ${w.windowEnd}). A late opt-out must go through IRD/myIR and be recorded as an IRD-managed opt-out.` }
  return {
    patch: {
      kiwisaver_status: 'opted_out',
      kiwisaver_enrolled: false,
      kiwisaver_ks10_signed_date: i.ks10SignedDate,
      kiwisaver_ks10_received_date: i.ks10ReceivedDate,
      kiwisaver_payroll_stop_effective_date: i.payrollStopEffectiveDate || i.ks10ReceivedDate,
    },
  }
}

export interface IrdOptOutInput {
  status: string | null | undefined
  /** IRD approval must actually be received — a pending application never stops deductions. */
  irdApprovalReference: string | null | undefined
  irdApprovalDate: string | null | undefined
  /** The effective date IRD instructs deductions to stop. */
  instructedEffectiveDate: string | null | undefined
}

/**
 * IRD-MANAGED opt-out (myIR / late opt-out after day 56). Deductions, employer
 * contributions and ESCT CONTINUE until IRD APPROVAL is received — an intention
 * or a pending application is never sufficient. Requires the IRD approval
 * reference, approval date and the IRD-instructed effective date.
 */
export function validateIrdOptOut(i: IrdOptOutInput): { error?: string; patch?: KiwiSaverStatePatch } {
  if (i.status !== 'auto_enrolled') {
    return { error: 'Only an automatically enrolled employee may opt out. Existing/opted-in members cannot opt out; use a savings suspension instead.' }
  }
  if (!i.irdApprovalReference?.trim() || !i.irdApprovalDate) {
    return { error: 'An IRD-managed opt-out only takes effect once IRD approval is received. Record the IRD approval reference and approval date — a pending application does not stop deductions.' }
  }
  if (!i.instructedEffectiveDate) {
    return { error: 'Record the effective date IRD has instructed deductions to stop.' }
  }
  return {
    patch: {
      kiwisaver_status: 'opted_out',
      kiwisaver_enrolled: false,
      kiwisaver_ird_approval_reference: i.irdApprovalReference.trim(),
      kiwisaver_ird_approval_date: i.irdApprovalDate,
      kiwisaver_payroll_stop_effective_date: i.instructedEffectiveDate,
    },
  }
}

export interface SavingsSuspensionInput {
  /** Reference/identifier of the approved savings-suspension notice (evidence). */
  noticeRef: string | null | undefined
  /** Effective dates of the approved suspension. */
  from: string | null | undefined
  to?: string | null
}

/**
 * Validate + build a savings suspension. Deductions only stop once an approved
 * savings-suspension notice is evidenced (a reference + effective-from date).
 * Without evidence the write is blocked and deductions continue.
 */
export function validateSavingsSuspension(i: SavingsSuspensionInput): { error?: string; patch?: KiwiSaverStatePatch } {
  if (!i.noticeRef?.trim()) {
    return { error: 'A savings suspension requires evidence of an approved savings-suspension notice (its reference) before deductions can stop.' }
  }
  if (!i.from) {
    return { error: 'A savings suspension requires an effective-from date.' }
  }
  if (i.to && i.to < i.from) {
    return { error: 'The savings-suspension end date cannot be before its start date.' }
  }
  return {
    patch: {
      kiwisaver_status: 'savings_suspension',
      kiwisaver_enrolled: false,
      kiwisaver_savings_suspension_ref: i.noticeRef.trim(),
      kiwisaver_savings_suspension_from: i.from,
      kiwisaver_savings_suspension_to: i.to || null,
    },
  }
}

/**
 * The KiwiSaver line for the agreement / employee record, from the ACTUAL
 * status — never a future intention. Mirrors the suggested statuses.
 */
export function kiwiSaverStatusStatement(
  status: string | null | undefined,
  opts: { suspensionTo?: string | null; notEligibleReason?: string | null; optOutEffectiveDate?: string | null } = {},
): string {
  switch (status) {
    case 'existing_member':
      return 'Existing KiwiSaver member. Deductions will be made at the rate recorded on the employee’s KS2.'
    case 'auto_enrolled':
    case 'opted_in':
      return 'Automatically enrolled in KiwiSaver. Contributions and deductions apply in accordance with the KiwiSaver Act 2006.'
    case 'savings_suspension':
      return opts.suspensionTo
        ? `Approved KiwiSaver savings suspension recorded until ${opts.suspensionTo}.`
        : 'Approved KiwiSaver savings suspension recorded.'
    case 'opted_out':
      return opts.optOutEffectiveDate
        ? `Opted out of KiwiSaver, effective ${opts.optOutEffectiveDate}.`
        : 'Opted out of KiwiSaver.'
    case 'not_eligible':
      return opts.notEligibleReason
        ? `Not eligible for automatic enrolment (${opts.notEligibleReason}).`
        : 'Not eligible for automatic enrolment, with reason recorded.'
    default:
      return '—'
  }
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
