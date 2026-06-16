// Resolve the numeric "allowed hours" pay basis for a job.
//
// Background: the job form has two hour fields — "Duration estimate"
// (free text, e.g. "3 hours") and "Allowed hours" (numeric). ONLY
// "Allowed hours" drives contractor pay (every pay/estimate path reads
// jobs.allowed_hours). When an operator fills the estimate but leaves
// Allowed hours blank, the contractor ends up with 0 payable hours.
//
// To stop that, when Allowed hours is blank we fall back to the Duration
// estimate IF it is a plain positive number ("4", "2.5"). Free-text
// estimates ("3 hours", "half day", "2-3 hours") are deliberately NOT
// parsed — too ambiguous to risk against pay. In those cases the
// operator still sets Allowed hours explicitly.

export function resolveAllowedHours(
  allowedHours: number | null | undefined,
  durationEstimate: string | null | undefined,
): number | null {
  if (allowedHours != null && Number.isFinite(allowedHours) && allowedHours > 0) {
    return allowedHours
  }
  const raw = (durationEstimate ?? '').trim()
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0) return n
  }
  return null
}
