// Shared service-date resolution for contractor payables.
//
// The statement-period basis is the OPERATIONAL service date — when the work was
// delivered — which is distinct from gst_supply_date (the GST tax point). One
// rule serves every canonical CI type; there is deliberately NO fallback to
// created_at (a booking timestamp is not a service date).
//
// Priority:
//   1. Job-derived CI (job_id set)  → linked job completed_at (NZ local).
//        If the job isn't completed → none (excluded + flagged); we do NOT
//        borrow the tax field for a job-derived line.
//   2. Jobless CI (manual / fixed / adjustment) →
//        explicit service_date → else gst_supply_date (an explicit,
//        staff-confirmed value) → else none.

export interface ServiceDateInput {
  job_id: string | null
  /** job.completed_at already converted to an NZ-local YYYY-MM-DD, or null. */
  job_completed_at_nz: string | null
  /** Operational service date stored on the CI (jobless payables), or null. */
  service_date: string | null
  /** GST tax point stored on the CI, or null. Bridge for jobless CIs only. */
  gst_supply_date: string | null
}

export type ServiceDateSource = 'job_completed_at' | 'service_date' | 'gst_supply_date' | 'none'

export interface ResolvedServiceDate {
  /** NZ-local YYYY-MM-DD, or null when no reliable service date exists. */
  date: string | null
  source: ServiceDateSource
}

export function resolveContractorServiceDate(ci: ServiceDateInput): ResolvedServiceDate {
  if (ci.job_id) {
    // Job-derived: only the job completion date is authoritative. No bridge.
    return ci.job_completed_at_nz
      ? { date: ci.job_completed_at_nz, source: 'job_completed_at' }
      : { date: null, source: 'none' }
  }
  // Jobless (manual / fixed / adjustment).
  if (ci.service_date) return { date: ci.service_date, source: 'service_date' }
  if (ci.gst_supply_date) return { date: ci.gst_supply_date, source: 'gst_supply_date' }
  return { date: null, source: 'none' }
}
