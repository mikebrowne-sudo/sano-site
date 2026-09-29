// Contractor confirmation that a completed job went to plan.
//
// Under the allowed-hours model the pay basis is hours_allocated × rate, agreed
// when the job is created. The contractor has had no way to say whether the job
// actually took that long — so pay was approved with no signal from the person
// who did the work.
//
// The question asked is deliberately narrow: "did it go to plan?" Not "enter
// your hours". Re-entering hours on every job would reintroduce the timesheet
// friction the allowed-hours model removed, and would invite a negotiation on
// every job instead of only the exceptions.
//
// Pure helpers — no DB, no Supabase — so the reminder cron, the contractor
// portal and Carol's queue all derive the same states.

export const HOURS_CONFIRMED_STATUSES = ['unconfirmed', 'as_planned', 'took_longer'] as const
export type HoursConfirmedStatus = (typeof HOURS_CONFIRMED_STATUSES)[number]

export function isHoursConfirmedStatus(v: unknown): v is HoursConfirmedStatus {
  return typeof v === 'string' && (HOURS_CONFIRMED_STATUSES as readonly string[]).includes(v)
}

/** A worker row as the confirmation logic needs to see it. */
export interface ConfirmableWorker {
  jobId: string
  contractorId: string
  hoursAllocated: number | null
  hoursConfirmedStatus: HoursConfirmedStatus
  /** Signed adjustment already recorded against the job, if any. */
  extraHours?: number | null
  extraHoursStatus?: string | null
}

/** A job as the confirmation logic needs to see it. */
export interface ConfirmableJob {
  id: string
  status: string
  /** ISO date (YYYY-MM-DD) the job was scheduled for. */
  scheduledDate: string | null
  /** ISO timestamp, set when the contractor marked it complete. */
  completedAt: string | null
}

/**
 * Can this worker be asked to confirm?
 *
 * Only a COMPLETED job — asking before the work is done is noise. `invoiced`
 * counts too: the job is finished and the contractor still hasn't answered,
 * which is exactly the case that was being missed.
 */
export function isConfirmable(job: ConfirmableJob): boolean {
  return job.status === 'completed' || job.status === 'invoiced'
}

/** Does this worker still owe an answer? */
export function needsConfirmation(job: ConfirmableJob, worker: ConfirmableWorker): boolean {
  if (!isConfirmable(job)) return false
  return worker.hoursConfirmedStatus === 'unconfirmed'
}

/**
 * Should the evening reminder go out for this worker, on `today`?
 *
 * Sent from the evening of the scheduled date onward, while the answer is
 * still outstanding. There is no upper age limit: a job completed a week ago
 * and never confirmed should still be chased, because the whole failure mode
 * was work going unanswered and unpaid for months.
 *
 * Per-job/per-contractor same-day dedupe is the caller's job (notification_logs),
 * matching how the day-before reminder already works.
 */
export function shouldRemind(
  job: ConfirmableJob,
  worker: ConfirmableWorker,
  today: string,
): boolean {
  if (!needsConfirmation(job, worker)) return false
  // No scheduled date → nothing sensible to anchor the reminder to.
  if (!job.scheduledDate) return false
  return job.scheduledDate <= today
}

/** What Carol's queue shows for a worker row. */
export type QueueSignal = 'confirmed' | 'flagged' | 'awaiting'

/**
 * Carol's signal for one worker row.
 *
 *   confirmed — contractor says it went to plan → safe to bulk-approve
 *   flagged   — contractor says it ran over → look at it before approving
 *   awaiting  — no answer yet
 */
export function queueSignal(worker: ConfirmableWorker): QueueSignal {
  if (worker.hoursConfirmedStatus === 'took_longer') return 'flagged'
  if (worker.hoursConfirmedStatus === 'as_planned') return 'confirmed'
  return 'awaiting'
}

/** Short operator-facing label for a signal. */
export function queueSignalLabel(signal: QueueSignal): string {
  switch (signal) {
    case 'confirmed': return 'Confirmed as planned'
    case 'flagged':   return 'Contractor flagged an overrun'
    case 'awaiting':  return 'Awaiting contractor confirmation'
  }
}

/**
 * The hours to show the contractor when asking the question.
 *
 * Their ALLOCATED share, not the job total — on a two-cleaner 8h job each is
 * asked about their own 4h. Any admin-approved adjustment already on the row is
 * included, so the figure shown is the one that will actually be paid.
 */
export function hoursToConfirm(worker: ConfirmableWorker): number | null {
  if (worker.hoursAllocated == null) return null
  const extra = worker.extraHoursStatus === 'approved' ? (worker.extraHours ?? 0) : 0
  return Math.round((worker.hoursAllocated + extra) * 100) / 100
}

/** "4 hours" / "1 hour" / "3.5 hours" — for the SMS and the portal prompt. */
export function formatHours(hours: number | null): string {
  if (hours == null) return 'the agreed hours'
  const n = Math.round(hours * 100) / 100
  const text = Number.isInteger(n) ? String(n) : String(n)
  return `${text} ${n === 1 ? 'hour' : 'hours'}`
}

/** Roll a set of worker rows into counts for a summary line. */
export function summariseConfirmations(
  rows: ConfirmableWorker[],
): { confirmed: number; flagged: number; awaiting: number; total: number } {
  let confirmed = 0, flagged = 0, awaiting = 0
  for (const r of rows) {
    const s = queueSignal(r)
    if (s === 'confirmed') confirmed += 1
    else if (s === 'flagged') flagged += 1
    else awaiting += 1
  }
  return { confirmed, flagged, awaiting, total: rows.length }
}
