// Canonical contractor labour-cost helpers (Phase G.1).
//
// Single source of truth for "what does this contractor cost on this
// job?" Used by the finance dashboard, the job detail page, and any
// future surface that needs to compute per-job labour cost.
//
// The canonical formula (allowed-hours model, 2026-06) is:
//
//   labour_cost = rate × (hours_allocated + approved extra_hours)
//
//   where rate prefers job_workers.pay_rate (the snapshotted job rate)
//   and falls back to contractors.hourly_rate when pay_rate is null.
//   The fallback exists only because historical rows pre-date the
//   assignment-time snapshot added in Phase G.1. Use `getWorkerRateSource`
//   to render a clear "estimated" indicator on any UI surface that
//   displays a rate sourced from the fallback.
//
// Notes:
// - `pay_rate` is the snapshotted job rate. Phase G.1 snapshots it at
//   assignment time; Phase E continues to snapshot it at approval
//   time as a safety net for rows that pre-date the assignment-time
//   write.
// - `contractor_hourly_rate` is the live rate from the contractor
//   profile. It IS allowed as a transitional fallback when pay_rate
//   is null (typical for historical rows). Once those rows are
//   approved, the Phase E snapshot writes pay_rate and the fallback
//   stops applying.
// - The cost helper returns 0 only when BOTH pay_rate and
//   contractor_hourly_rate are missing, OR payable hours are missing.
//   We never fabricate a cost — a job that has no rate AND no hours
//   simply has no labour cost yet.

/** Minimal shape these helpers need from a job_workers row. */
export interface JobWorkerCostInput {
  pay_rate: number | null
  /**
   * Optional fallback rate from the joined contractors row. Used only
   * when pay_rate is null (typical for rows that pre-date the Phase
   * G.1 assignment-time snapshot). Surfaces displaying a cost computed
   * from this fallback should label it as estimated via
   * `getWorkerRateSource`.
   */
  contractor_hourly_rate?: number | null
  approved_hours: number | null
  actual_hours: number | null
  hours_allocated: number | null
  // Allowed-hours model (2026-06): admin-approved extra hours beyond
  // hours_allocated. Only count toward cost when extra_hours_status is
  // 'approved'. (approved_hours / actual_hours are retained for history
  // but are no longer the cost basis.)
  extra_hours?: number | null
  extra_hours_status?: string | null
}

export interface JobWorkerVariance {
  hoursVariance: number
  costVariance: number
}

/** Origin of the rate used by the cost helpers — for UI labelling. */
export type WorkerRateSource = 'snapshot' | 'estimate' | 'missing'

/**
 * The hours we treat as payable for cost reporting.
 *
 * Approved hours win when present; otherwise we use actual hours.
 * Allowed/allocated hours are NOT a fallback here — they reflect
 * what we expected, not what happened. Use `getWorkerEstimatedHours`
 * for the live UI estimate that does include the allocated fallback.
 */
export function getWorkerPayableHours(jw: JobWorkerCostInput): number | null {
  // Allowed-hours model: cost/pay = allocated (allowed) hours plus any
  // admin-APPROVED extra hours. Timestamp-actual hours are not the basis.
  if (jw.hours_allocated == null) return null
  const extra = jw.extra_hours_status === 'approved' ? (jw.extra_hours ?? 0) : 0
  return jw.hours_allocated + extra
}

/**
 * Hours to display as an estimate before approval lands.
 *
 * Approved → actual → allocated fallback chain. Used only for the
 * live UI "estimated pay" hint; never for persisted reporting.
 */
export function getWorkerEstimatedHours(jw: JobWorkerCostInput): number | null {
  // The allowed-hours baseline (before any approved extra). UI hint only.
  return jw.hours_allocated
}

/**
 * Pay rate for cost calculations.
 *
 * Prefers the snapshotted `pay_rate`. Falls back to the optional
 * `fallbackHourlyRate` argument (typically `contractors.hourly_rate`
 * via the join). The fallback exists for historical rows; new rows
 * have `pay_rate` snapshotted at assignment time.
 */
export function getWorkerRate(
  jw: { pay_rate: number | null },
  fallbackHourlyRate?: number | null,
): number | null {
  if (jw.pay_rate != null) return jw.pay_rate
  if (fallbackHourlyRate != null) return fallbackHourlyRate
  return null
}

/**
 * Origin of the rate currently in use for this row.
 *
 * - `'snapshot'`  — the canonical `job_workers.pay_rate` is set.
 * - `'estimate'`  — `pay_rate` is null but `contractor_hourly_rate`
 *                   is present (transitional fallback for rows that
 *                   pre-date Phase G.1's assignment-time snapshot).
 *                   UI should label these as estimated.
 * - `'missing'`   — neither rate is available; no cost can be computed.
 */
export function getWorkerRateSource(jw: JobWorkerCostInput): WorkerRateSource {
  if (jw.pay_rate != null) return 'snapshot'
  if (jw.contractor_hourly_rate != null) return 'estimate'
  return 'missing'
}

/**
 * Canonical per-worker labour cost.
 *
 * Uses `pay_rate × payable_hours` when both are present. Falls back
 * to `contractor_hourly_rate × payable_hours` when only the fallback
 * rate is present — needed because historical rows pre-date the
 * assignment-time snapshot.
 *
 * Returns 0 only when:
 *   • payable hours are null, OR
 *   • both pay_rate and contractor_hourly_rate are null.
 *
 * We never fabricate a cost from a default rate.
 */
export function getWorkerLabourCost(jw: JobWorkerCostInput): number {
  const rate = jw.pay_rate ?? jw.contractor_hourly_rate ?? null
  const hours = getWorkerPayableHours(jw)
  if (rate == null || hours == null) return 0
  return rate * hours
}

/**
 * Canonical per-job labour cost.
 *
 * Sums per-worker labour cost across an array. Empty / null arrays
 * resolve to 0.
 */
export function getJobLabourCost(jobWorkers: JobWorkerCostInput[] | null | undefined): number {
  if (!jobWorkers || jobWorkers.length === 0) return 0
  return jobWorkers.reduce((sum, jw) => sum + getWorkerLabourCost(jw), 0)
}

/**
 * Per-worker hours and cost variance against allowed hours.
 *
 * Returns null when allowed hours are not set (variance is meaningless
 * without a target). Uses payable hours (approved → actual) on the
 * "actual" side and the same rate selection as the cost helper above
 * (`pay_rate` preferred; `contractor_hourly_rate` as fallback).
 */
export function getWorkerVariance(
  jw: JobWorkerCostInput,
): JobWorkerVariance | null {
  // In the allowed-hours model the only variance is APPROVED extra hours
  // (the job ran over and an admin signed it off).
  const extra = jw.extra_hours_status === 'approved' ? (jw.extra_hours ?? 0) : 0
  const rate = jw.pay_rate ?? jw.contractor_hourly_rate ?? 0
  return { hoursVariance: extra, costVariance: extra * rate }
}
