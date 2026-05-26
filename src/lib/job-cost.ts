// Canonical contractor labour-cost helpers (Phase G.1).
//
// Single source of truth for "what does this contractor cost on this
// job?" Used by the finance dashboard, the job detail page, and any
// future surface that needs to compute per-job labour cost.
//
// The canonical formula is:
//
//   labour_cost = job_workers.pay_rate × COALESCE(approved_hours, actual_hours)
//
// Notes:
// - `pay_rate` is the snapshotted job rate. Phase G.1 snapshots it at
//   assignment time; Phase E continues to snapshot it at approval
//   time as a safety net for rows that pre-date the assignment-time
//   write.
// - Historical / persisted reporting MUST NOT fall back to
//   `contractors.hourly_rate`. The live `hourly_rate` is only allowed
//   as a *display* fallback for the pre-snapshot estimate
//   (see `getWorkerRate` with an explicit fallback argument).
// - When either side of the formula is null, labour cost is 0. We
//   never fabricate a cost — a job that has not yet had hours captured
//   simply has no labour cost yet, and the cleanup-flag layer (Phase
//   G.2) will surface it.

/** Minimal shape these helpers need from a job_workers row. */
export interface JobWorkerCostInput {
  pay_rate: number | null
  approved_hours: number | null
  actual_hours: number | null
  hours_allocated: number | null
}

export interface JobWorkerVariance {
  hoursVariance: number
  costVariance: number
}

/**
 * The hours we treat as payable for cost reporting.
 *
 * Approved hours win when present; otherwise we use actual hours.
 * Allowed/allocated hours are NOT a fallback here — they reflect
 * what we expected, not what happened. Use `getWorkerEstimatedHours`
 * for the live UI estimate that does include the allocated fallback.
 */
export function getWorkerPayableHours(jw: JobWorkerCostInput): number | null {
  if (jw.approved_hours != null) return jw.approved_hours
  if (jw.actual_hours != null) return jw.actual_hours
  return null
}

/**
 * Hours to display as an estimate before approval lands.
 *
 * Approved → actual → allocated fallback chain. Used only for the
 * live UI "estimated pay" hint; never for persisted reporting.
 */
export function getWorkerEstimatedHours(jw: JobWorkerCostInput): number | null {
  if (jw.approved_hours != null) return jw.approved_hours
  if (jw.actual_hours != null) return jw.actual_hours
  if (jw.hours_allocated != null) return jw.hours_allocated
  return null
}

/**
 * Pay rate for cost calculations.
 *
 * Prefers the snapshotted `pay_rate`. The optional `fallbackHourlyRate`
 * argument is for live UI display only (rows that pre-date the
 * assignment-time snapshot may still have a null `pay_rate` until
 * approval). Persisted reporting paths should NOT pass a fallback.
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
 * Canonical per-worker labour cost.
 *
 * Returns 0 when either pay_rate or payable hours are missing — never
 * fabricates a cost from `contractors.hourly_rate`. Surfaces that need
 * a live estimate before the snapshot lands should compute their own
 * estimate using `getWorkerEstimatedHours` + `getWorkerRate(jw, fallback)`.
 */
export function getWorkerLabourCost(jw: JobWorkerCostInput): number {
  const rate = jw.pay_rate
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
 * "actual" side and the snapshotted pay_rate for the dollar variance.
 */
export function getWorkerVariance(
  jw: JobWorkerCostInput,
  allowedHours: number | null,
): JobWorkerVariance | null {
  if (allowedHours == null) return null
  const payable = getWorkerPayableHours(jw)
  if (payable == null) return null
  const rate = jw.pay_rate ?? 0
  return {
    hoursVariance: payable - allowedHours,
    costVariance: (payable - allowedHours) * rate,
  }
}
