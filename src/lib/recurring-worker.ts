// Recurring-job worker seeding (Stage 0 PR C).
//
// Every generated recurring occurrence that will pay a contractor must get a
// proper job_workers row — a snapshotted rate + a pay basis — not just
// jobs.contractor_id. The rate is snapshotted AT GENERATION time from the
// contractor's current profile rate, so a later profile-rate change reprices
// only future occurrences, never ones already generated.

import { resolveWorkerRate } from './contractor-client-rate'
import { toPositiveRate } from './contractor-rate-snapshot'

export type RecurringPayType = 'hourly' | 'fixed'

export interface RecurringWorkerInput {
  jobId: string
  contractorId: string
  /** Contractor's current profile hourly_rate at the moment of generation. */
  contractorRate: number | null
  /**
   * The per-client agreed rate for this worker at the contract's client,
   * applicable on the occurrence date. Wins over `contractorRate`. Optional —
   * omit (or null) when no client rate applies. This is what keeps an ongoing
   * contract (e.g. Oranga Tamariki at $32.20) from silently generating every
   * occurrence at the flat profile rate.
   */
  clientRate?: number | null
  /**
   * A SET AMOUNT paid per occurrence (recurring_jobs.contractor_per_visit_rate),
   * for a contract whose contractor_pay_mode is 'per_visit'.
   *
   * This is the whole payable for the visit — NOT an hourly rate, and never
   * multiplied by hours. It wins over both the client rate and the profile
   * rate, because it is the most specific instruction the contract carries.
   * Example: NZCL at 58B Trias Road is $126 per clean, not 3h x $30.
   */
  perVisitRate?: number | null
  /** Allocated hours for the occurrence (from the contract's duration). */
  allowedHours: number | null
  /** 'hourly' (paid per occurrence by hours) or 'fixed' (flat arrangement). */
  payType: RecurringPayType
}

export function buildRecurringWorkerRow(input: RecurringWorkerInput) {
  const perVisit = toPositiveRate(input.perVisitRate)
  // A per-visit amount IS a fixed arrangement, whatever the contract's
  // pay_type column says — the amount does not depend on hours worked.
  const isFixed = input.payType === 'fixed' || perVisit != null

  return {
    job_id: input.jobId,
    contractor_id: input.contractorId,
    // Fixed-contract workers are NOT payable by hours, so we don't seed
    // allocated hours — that avoids the pay UI showing a misleading
    // hours × rate amount.
    hours_allocated: isFixed ? null : input.allowedHours,
    // For a per-visit contract this is the SET AMOUNT for the visit; the
    // 'fixed' pay_type below is what stops it being read as an hourly rate.
    pay_rate: perVisit
      ?? resolveWorkerRate(null, input.clientRate ?? null, input.contractorRate).rate,
    pay_type: isFixed ? 'fixed' : 'hourly',
  }
}
