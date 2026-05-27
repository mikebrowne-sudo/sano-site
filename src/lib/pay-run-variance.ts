// Phase G.2 step 4 — pay-run row variance helper.
//
// Pure functions used by /portal/payroll/contractor-runs/[id] to
// surface allowed-vs-approved hours variance per pay-run item.
// Approved hours stay the payable basis; this helper only computes
// the display-side comparison.
//
// Allowed-hours resolution mirrors the rule documented in the
// Phase G implementation spec §13 Q4:
//   prefer per-worker `job_workers.hours_allocated`,
//   fall back to `jobs.allowed_hours / worker_count` when that's null.

export interface PayRunVarianceInput {
  /** Approved payable hours from pay_run_items.approved_hours. */
  approvedHours: number | null
  /** Snapshotted job pay rate (pay_run_items.pay_rate). */
  payRate: number | null
  /** job_workers.hours_allocated for this (job, contractor) pair. */
  hoursAllocated: number | null
  /**
   * jobs.allowed_hours for the parent job. Only used when the
   * per-worker `hoursAllocated` is null.
   */
  jobAllowedHours: number | null
  /** Number of contractors assigned to this job (used for the split fallback). */
  workerCount: number
}

export interface PayRunVariance {
  /** Effective allowed hours (per-worker preferred, then split fallback). */
  allowedHours: number | null
  /** Approved hours echoed for convenience (null if missing). */
  approvedHours: number | null
  /**
   * Variance in hours (`approved − allowed`). Null when either side
   * is unavailable — we never fabricate a number.
   */
  varianceHours: number | null
  /**
   * Variance in dollars (`(approved − allowed) × pay_rate`). Null
   * when hours variance is unavailable. When pay_rate is missing but
   * hours variance is computable, returns 0 — the hours move is real
   * but the dollar impact can't be costed.
   */
  varianceDollars: number | null
}

/**
 * Resolve the effective allowed hours for a single pay-run row.
 *
 * Per-worker `hours_allocated` wins when present (the canonical
 * snapshot at assignment / approval time). When it's null the row
 * falls back to splitting the job-level `allowed_hours` evenly across
 * the number of workers assigned to that job.
 */
export function resolveAllowedHours(input: {
  hoursAllocated: number | null
  jobAllowedHours: number | null
  workerCount: number
}): number | null {
  if (input.hoursAllocated != null) return input.hoursAllocated
  if (input.jobAllowedHours != null && input.workerCount > 0) {
    return input.jobAllowedHours / input.workerCount
  }
  return null
}

/**
 * Compute the full variance display payload for a pay-run row.
 *
 * Returns nulls when the inputs are missing — callers should render
 * an em-dash for null cells rather than zeros.
 */
export function computePayRunVariance(input: PayRunVarianceInput): PayRunVariance {
  const allowedHours = resolveAllowedHours({
    hoursAllocated: input.hoursAllocated,
    jobAllowedHours: input.jobAllowedHours,
    workerCount: input.workerCount,
  })

  if (allowedHours == null || input.approvedHours == null) {
    return {
      allowedHours,
      approvedHours: input.approvedHours,
      varianceHours: null,
      varianceDollars: null,
    }
  }

  const varianceHours = input.approvedHours - allowedHours
  const varianceDollars = input.payRate != null ? varianceHours * input.payRate : 0

  return {
    allowedHours,
    approvedHours: input.approvedHours,
    varianceHours,
    varianceDollars,
  }
}
