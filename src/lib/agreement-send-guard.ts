// Send-guard for contractor agreements: decides whether a contractor agreement
// may be sent/signed given its schedule selection, so it can NEVER silently go
// out with zero schedules and fall back to the legacy universal agreed-rate row.
//
// Pure + DB-free so the rule is unit-tested exactly (the required cases) and used
// identically by the send action and the sign flow.

export interface SendGuardInput {
  /** How many eligible (draft/active) schedules the contractor has available. */
  eligibleCount: number
  /** How many of those staff explicitly selected for this agreement. */
  selectedCount: number
  /** Staff's explicit "no service schedule on this agreement" exception. */
  noScheduleException: boolean
  /** Reason recorded for the exception (required when the exception is used). */
  noScheduleReason?: string | null
}

export interface SendGuardResult {
  ok: boolean
  error?: string
  /** True when the agreement legitimately carries no schedules (genuine legacy —
   *  no eligible schedules — OR an explicit, reasoned staff exception). The
   *  document then states "no service schedules attached" rather than a rate. */
  noSchedules: boolean
}

/**
 * Rules:
 *  - Eligible schedules exist + at least one selected → OK (schedules attached).
 *  - Eligible schedules exist + none selected + NO exception → BLOCKED.
 *  - Eligible schedules exist + none selected + exception WITH reason → OK, no
 *    schedules (audited by the caller).
 *  - Eligible schedules exist + none selected + exception WITHOUT reason → BLOCKED.
 *  - No eligible schedules at all → OK, no schedules (genuine legacy fallback);
 *    an exception is not required (nothing could have been selected).
 */
export function evaluateSendGuard(input: SendGuardInput): SendGuardResult {
  const { eligibleCount, selectedCount, noScheduleException } = input
  const reason = (input.noScheduleReason ?? '').trim()

  if (selectedCount > 0) {
    return { ok: true, noSchedules: false }
  }

  // Nothing selected from here down.
  if (eligibleCount === 0) {
    // Genuine legacy: no schedules exist to attach. Legacy rate row is allowed.
    return { ok: true, noSchedules: true }
  }

  // Eligible schedules exist but none selected → must be an explicit exception.
  if (!noScheduleException) {
    return {
      ok: false,
      noSchedules: false,
      error: 'Select at least one service schedule for this agreement, or explicitly create it without a service schedule (with a reason).',
    }
  }
  if (!reason) {
    return {
      ok: false,
      noSchedules: false,
      error: 'A reason is required to create a contractor agreement without a service schedule.',
    }
  }
  return { ok: true, noSchedules: true }
}
