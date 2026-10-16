// Shared service-date resolution for contractor payables.
//
// The statement-period basis is the OPERATIONAL service date — when the work was
// delivered — which is distinct from gst_supply_date (the GST tax point). One
// rule serves every canonical CI type; there is deliberately NO fallback to
// created_at (a booking timestamp is not a service date).
//
// Priority:
//   1. Job-derived CI (job_id set)  → the CI's service_date, which approval
//        stamps from the job's SCHEDULED date (the day the clean was done) →
//        else the linked job completed_at (NZ local), for older CIs approved
//        before service_date was stamped. Completion is only a fallback: a
//        clean done on the 9th but marked complete on the 16th was showing —
//        and being periodised — as the 16th (157 Celtic Crescent, Sep 2026).
//        Last resort: the job's SCHEDULED date — for an older job that was
//        never marked complete (CI-0054, JOB-0004: approved in July, then left
//        out of every pay run as "date unavailable"). Still no date → none
//        (excluded + flagged); we do NOT borrow the tax field for a job line.
//   2. Jobless CI (manual / fixed / adjustment) →
//        explicit service_date → else gst_supply_date (an explicit,
//        staff-confirmed value) → else none.

export interface ServiceDateInput {
  job_id: string | null
  /** job.completed_at already converted to an NZ-local YYYY-MM-DD, or null. */
  job_completed_at_nz: string | null
  /** job.scheduled_date (YYYY-MM-DD) — last-resort fallback for a job line. */
  job_scheduled_date?: string | null
  /** Operational service date stored on the CI (jobless payables), or null. */
  service_date: string | null
  /** GST tax point stored on the CI, or null. Bridge for jobless CIs only. */
  gst_supply_date: string | null
}

export type ServiceDateSource = 'job_completed_at' | 'job_scheduled_date' | 'service_date' | 'gst_supply_date' | 'none'

export interface ResolvedServiceDate {
  /** NZ-local YYYY-MM-DD, or null when no reliable service date exists. */
  date: string | null
  source: ServiceDateSource
}

export function resolveContractorServiceDate(ci: ServiceDateInput): ResolvedServiceDate {
  if (ci.job_id) {
    // Job-derived: the visit date stamped at approval, else completion. No
    // bridge to the tax field.
    if (ci.service_date) return { date: ci.service_date, source: 'service_date' }
    if (ci.job_completed_at_nz) return { date: ci.job_completed_at_nz, source: 'job_completed_at' }
    return ci.job_scheduled_date
      ? { date: String(ci.job_scheduled_date).slice(0, 10), source: 'job_scheduled_date' }
      : { date: null, source: 'none' }
  }
  // Jobless (manual / fixed / adjustment).
  if (ci.service_date) return { date: ci.service_date, source: 'service_date' }
  if (ci.gst_supply_date) return { date: ci.gst_supply_date, source: 'gst_supply_date' }
  return { date: null, source: 'none' }
}
