// Reminder scheduling for issued contractor statements.
//
// Cadence is anchored to issued_at (NOT review_due_at): reminder 1 at
// issued_at + 2 calendar days, reminder 2 at issued_at + 4 calendar days.
// Extending the review deadline never recalculates or restarts reminders.
// Max two per statement; dedup by (statement_id, reminder_no) in notification_logs.

export interface ReminderSentState {
  r1_sent: boolean
  r2_sent: boolean
}

/** Whole calendar days between two NZ-local YYYY-MM-DD dates (to - from). */
export function calendarDaysBetween(fromNz: string, toNz: string): number {
  const [fy, fm, fd] = fromNz.split('-').map(Number)
  const [ty, tm, td] = toNz.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000)
}

/**
 * Which reminder is due AND not yet sent, given calendar days since issue.
 * Returns 1, 2, or null. Reminder 1 takes priority so a missed day still sends
 * both across consecutive runs rather than skipping straight to reminder 2.
 */
export function dueReminderNo(daysSinceIssue: number, sent: ReminderSentState): 1 | 2 | null {
  if (daysSinceIssue >= 2 && !sent.r1_sent) return 1
  if (daysSinceIssue >= 4 && !sent.r2_sent) return 2
  return null
}
