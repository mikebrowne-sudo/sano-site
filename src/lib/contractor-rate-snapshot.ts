// Contractor pay-rate snapshot rule — the single source of truth for what
// job_workers.pay_rate should be set to when a worker row is created or
// re-touched.
//
// Rule: a positive existing snapshot is ALWAYS preserved (historical pay must
// stay stable even if the contractor's profile rate later changes); only when
// there is no positive snapshot do we snapshot the contractor's current rate.
// Returns null when neither is a usable positive number — in that (legacy)
// case job-cost's getWorkerRate falls back to the live contractor rate and the
// UI shows an "est." badge (see src/lib/job-cost.ts). A deliberate rate change
// on an existing snapshot must go through the explicit, audited
// setJobWorkerPayRate action — never a silent overwrite here.

export function toPositiveRate(v: number | string | null | undefined): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Resolve the pay_rate to store on a job_workers row.
 * @param existingPayRate the row's current pay_rate (if any)
 * @param contractorRate  the contractor's current profile hourly_rate
 */
export function pickSnapshotRate(
  existingPayRate: number | string | null | undefined,
  contractorRate: number | string | null | undefined,
): number | null {
  const existing = toPositiveRate(existingPayRate)
  if (existing != null) return existing
  return toPositiveRate(contractorRate)
}
