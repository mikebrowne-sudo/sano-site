// Splitting a job's allowed hours across its assigned workers.
//
// Semantics (confirmed with Mike 2026-09-07): `jobs.allowed_hours` is the
// TOTAL LABOUR the job is allowed — not the hours each worker does. An 8-hour
// job with two cleaners is 4 hours each, done in roughly half the elapsed time.
//
// This is the single source of truth for that arithmetic. Every seeding path
// (create job, edit job, add worker, change allowed hours) and every display
// fallback goes through here, so they can't drift apart — which is exactly how
// the original bug arose: four call sites each writing the FULL hours to every
// worker, so a 2-worker 8h job booked 16h of pay.
//
// Rounding: each share is a clean quarter-hour so it reads properly on a
// payslip, and the REMAINDER is absorbed by the last share so the parts always
// sum to exactly the job's allowed hours. 5h across 3 workers →
// 1.75 / 1.75 / 1.50, not 1.67 × 3 (unreadable) or 1.75 × 3 (overpays by 0.25).

/** Hours are held to the quarter hour. */
export const HOURS_INCREMENT = 0.25

/** Round to the nearest quarter hour. */
export function toQuarterHour(hours: number): number {
  return Math.round(hours / HOURS_INCREMENT) * HOURS_INCREMENT
}

/** Guard against binary-float dust (0.1+0.2 style) on money-adjacent numbers. */
function clean(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Split `allowedHours` across `workerCount` workers.
 *
 * Returns one share per worker, in order. Each share is a quarter hour except
 * possibly the LAST, which carries the remainder so the shares sum to exactly
 * `allowedHours`. Returns [] for a non-positive worker count, and all-nulls
 * when there are no allowed hours to split (an unset pay basis is preserved
 * as null rather than invented as 0).
 */
export function splitAllowedHours(
  allowedHours: number | null | undefined,
  workerCount: number,
): (number | null)[] {
  if (!Number.isFinite(workerCount) || workerCount <= 0) return []
  if (allowedHours == null || !Number.isFinite(allowedHours) || allowedHours <= 0) {
    return Array.from({ length: workerCount }, () => null)
  }

  const total = clean(allowedHours)
  if (workerCount === 1) return [total]

  // Every worker but the last gets the rounded quarter-hour share; the last
  // absorbs whatever is left so the total is preserved exactly.
  const even = toQuarterHour(total / workerCount)
  const head = Array.from({ length: workerCount - 1 }, () => clean(even))
  const tail = clean(total - clean(even * (workerCount - 1)))

  // A pathological case (tiny total, many workers) could drive the tail
  // negative — e.g. 0.25h across 4. Fall back to an even unrounded split
  // rather than paying someone negative hours.
  if (tail < 0) {
    return Array.from({ length: workerCount }, () => clean(total / workerCount))
  }

  return [...head, tail]
}

/** One worker's share — the split for `workerCount`, taken at `index`. */
export function shareForWorker(
  allowedHours: number | null | undefined,
  workerCount: number,
  index: number,
): number | null {
  const shares = splitAllowedHours(allowedHours, workerCount)
  return shares[index] ?? null
}

/**
 * The display/pay fallback for a worker whose `hours_allocated` is null.
 *
 * Historic rows (and any path that didn't seed) fall back to the job's allowed
 * hours. That fallback MUST be split — returning the full `allowed_hours` is
 * what made a 2-worker job show 8h to each cleaner instead of 4h.
 */
export function resolveWorkerHours(
  hoursAllocated: number | null | undefined,
  jobAllowedHours: number | null | undefined,
  workerCount: number,
): number | null {
  if (hoursAllocated != null && Number.isFinite(hoursAllocated)) return hoursAllocated
  if (workerCount <= 1) return jobAllowedHours ?? null
  const shares = splitAllowedHours(jobAllowedHours, workerCount)
  // No per-worker identity here, so use the even (head) share rather than the
  // remainder-bearing tail — this is a display fallback, not a pay decision.
  return shares[0] ?? null
}

// ── Re-splitting an existing roster ────────────────────────────────

/** A worker being considered for a re-split. */
export interface ResplitWorker {
  contractor_id: string
  hours_allocated: number | null
  /** Pay lifecycle — a worker committed to pay must not be re-split. */
  pay_status?: string | null
  /** True when a payable/pay-run row exists for this pair. */
  locked?: boolean
}

export interface ResplitResult {
  /** Workers whose hours change, with their new share. */
  updates: { contractor_id: string; hours_allocated: number | null }[]
  /** Locked workers left untouched, for operator warning. */
  skipped: { contractor_id: string; hours_allocated: number | null }[]
  /** Hours already committed to locked workers. */
  lockedHours: number
  /** Hours shared out among the unlocked workers. */
  remainingHours: number | null
}

/** Is this worker's pay frozen? */
export function isPayLocked(w: ResplitWorker): boolean {
  if (w.locked) return true
  return w.pay_status === 'included_in_pay_run' || w.pay_status === 'paid'
}

/**
 * Recompute every worker's share after the roster changes.
 *
 * Adding a 2nd worker to an 8h job must take the 1st from 8h to 4h — otherwise
 * the job books 12h. But a worker already in a pay run (or with a payable) has
 * a FROZEN amount: rewriting it would contradict a financial record. Those are
 * left alone, their hours deducted from the pool, and the rest shared among the
 * workers who are still free.
 *
 * If the locked workers already consume the whole allowance, the unlocked ones
 * get 0 — surfaced via `remainingHours` so the caller can warn rather than
 * silently zeroing someone's pay.
 */
export function resplitJobHours(
  allowedHours: number | null | undefined,
  workers: ResplitWorker[],
): ResplitResult {
  const locked = workers.filter(isPayLocked)
  const free = workers.filter((w) => !isPayLocked(w))

  const lockedHours = Math.round(
    locked.reduce((s, w) => s + (w.hours_allocated ?? 0), 0) * 100,
  ) / 100

  const skipped = locked.map((w) => ({
    contractor_id: w.contractor_id,
    hours_allocated: w.hours_allocated,
  }))

  if (free.length === 0) {
    return { updates: [], skipped, lockedHours, remainingHours: null }
  }

  if (allowedHours == null || !Number.isFinite(allowedHours) || allowedHours <= 0) {
    return {
      updates: free.map((w) => ({ contractor_id: w.contractor_id, hours_allocated: null })),
      skipped, lockedHours, remainingHours: null,
    }
  }

  const remaining = Math.round((allowedHours - lockedHours) * 100) / 100
  if (remaining <= 0) {
    return {
      updates: free.map((w) => ({ contractor_id: w.contractor_id, hours_allocated: 0 })),
      skipped, lockedHours, remainingHours: 0,
    }
  }

  const shares = splitAllowedHours(remaining, free.length)
  return {
    updates: free.map((w, i) => ({ contractor_id: w.contractor_id, hours_allocated: shares[i] ?? null })),
    skipped, lockedHours, remainingHours: remaining,
  }
}
