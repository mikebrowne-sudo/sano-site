// Decide the display-only hours for a remittance line.
//
// Hours are shown ONLY when the line is genuinely hourly and the maths is
// clean: payable_hours × pay_rate equals the paid amount (within a cent).
// Anything else — missing rate/hours, zero hours, or a fixed-price amount
// that doesn't reconcile (carpet/oven/fridge cleans, stain removal,
// adjustments, legacy records) — returns null so the remittance never
// implies an hourly basis the job didn't have. Never affects the paid
// amount, which remains the single source of truth.

export function reconcileRemittanceHours(
  payableHours: number | null | undefined,
  payRate: number | null | undefined,
  amount: number,
): number | null {
  if (payableHours == null || payRate == null) return null
  if (!(payableHours > 0) || !(payRate > 0)) return null
  return Math.abs(payableHours * payRate - amount) < 0.01 ? payableHours : null
}
