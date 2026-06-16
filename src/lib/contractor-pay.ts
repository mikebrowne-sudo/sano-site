// Pure helpers for approving a contractor payable (Stage A).
//
// Lives outside the 'use server' action file so it can export non-async
// functions and be unit-tested directly.

const round2 = (n: number) => Math.round(n * 100) / 100

export interface ApprovedAmountInput {
  // Fixed-price work (carpet/oven/fridge cleans, travel, minimum charge,
  // adjustments…). When provided, hours are NOT used or invented.
  fixedAmount?: number | null
  // Hourly work: payable = approvedHours × rate.
  approvedHours?: number | null
  rate?: number | null
}

export type ApprovedAmount =
  | { amount: number; basis: 'fixed' | 'hourly'; hours: number | null }
  | { error: string }

/**
 * Resolve the payable amount for an approval. Fixed amount wins when
 * present (never forced into hours); otherwise it's hourly and needs both
 * positive approved hours and a positive rate. Returns a clear error
 * string for any missing/invalid input.
 */
export function computeApprovedAmount(input: ApprovedAmountInput): ApprovedAmount {
  const { fixedAmount, approvedHours, rate } = input

  if (fixedAmount != null) {
    if (!Number.isFinite(fixedAmount) || fixedAmount <= 0) {
      return { error: 'Fixed amount must be greater than zero.' }
    }
    return { amount: round2(fixedAmount), basis: 'fixed', hours: null }
  }

  if (approvedHours != null) {
    if (!Number.isFinite(approvedHours) || approvedHours <= 0) {
      return { error: 'Approved hours must be greater than zero.' }
    }
    if (rate == null || !Number.isFinite(rate) || rate <= 0) {
      return { error: 'Contractor has no hourly rate on file. Set it on the contractor profile first.' }
    }
    return { amount: round2(approvedHours * rate), basis: 'hourly', hours: approvedHours }
  }

  return { error: 'Enter approved hours (with a rate) or a fixed amount.' }
}
