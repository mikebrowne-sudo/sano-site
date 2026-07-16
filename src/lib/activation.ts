// Phase 6 — small pure helpers for activation gating + the legacy transition.
// Kept separate from the server actions so they can be unit-tested directly.

/** Admin override always requires a non-empty reason (recorded in the audit log). */
export function requireOverrideReason(
  reason: string | null | undefined,
): { ok: true } | { ok: false; error: string } {
  if (!reason || !reason.trim()) {
    return { ok: false, error: 'A reason is required for admin override.' }
  }
  return { ok: true }
}

/**
 * Which existing records are grandfathered by the Phase 6 gating flip: only
 * ACTIVE contractors. Inactive / onboarding records are NOT auto-grandfathered —
 * the new requirements apply when they are next activated or progressed. Mirrors
 * the Phase 6 migration's backfill.
 */
export function shouldGrandfather(row: { worker_type?: string | null; status?: string | null }): boolean {
  return row.worker_type === 'contractor' && row.status === 'active'
}
