// Non-destructive job_workers reconciliation (Stage 0 PR B).
//
// job_workers is authoritative for WHO is paid (multi-contractor, pay-rate
// snapshot, hours, extra-hours, pay state). jobs.contractor_id is a denormalised
// "primary contractor" pointer used for portal visibility + assignment
// notifications; its invariant is: it must be null OR present in job_workers.
//
// Editing ordinary job details must never delete/recreate worker rows. This
// helper computes the minimal add/keep/remove set from the desired contractor
// list so unchanged workers keep their existing row (id, snapshot, hours,
// extra-hours, pay linkage) untouched.

export interface WorkerRow {
  contractor_id: string
  pay_status?: string | null
  extra_hours?: number | null
  extra_hours_status?: string | null
}

export interface WorkerDiff<T extends WorkerRow> {
  /** contractor_ids present in the desired list but not yet assigned → insert. */
  toAdd: string[]
  /** existing rows still desired → leave completely untouched. */
  toKeep: T[]
  /** existing rows no longer desired → delete, subject to removal guards. */
  toRemove: T[]
}

export function planWorkerDiff<T extends WorkerRow>(existing: T[], desiredCids: string[]): WorkerDiff<T> {
  const existingIds = new Set(existing.map((w) => w.contractor_id))
  const seen = new Set<string>()
  const desiredUnique = desiredCids.filter((id) => id && !seen.has(id) && seen.add(id))
  const desired = new Set(desiredUnique)
  return {
    toAdd: desiredUnique.filter((id) => !existingIds.has(id)),
    toKeep: existing.filter((w) => desired.has(w.contractor_id)),
    toRemove: existing.filter((w) => !desired.has(w.contractor_id)),
  }
}

/**
 * Removal block reason from signals ON the worker row (pay state + approved
 * extra hours). Returns null if removable so far — the caller still checks for
 * a payable / pay-run item in the DB. Approved extra-hours history counts as
 * payment linkage that must not be silently dropped.
 */
export function localRemovalBlock(w: WorkerRow): string | null {
  if (w.pay_status === 'included_in_pay_run' || w.pay_status === 'paid') return 'already in a pay run / paid'
  if (w.extra_hours_status === 'approved' && Number(w.extra_hours ?? 0) !== 0) return 'has approved extra hours'
  return null
}

/**
 * The primary contractor (jobs.contractor_id) must be a member of the final
 * worker set (or null). Prefer the requested primary; else the first worker;
 * else null.
 */
export function reconcilePrimaryContractor(
  requestedPrimary: string | null | undefined,
  finalWorkerCids: string[],
): string | null {
  if (requestedPrimary && finalWorkerCids.includes(requestedPrimary)) return requestedPrimary
  return finalWorkerCids[0] ?? null
}
