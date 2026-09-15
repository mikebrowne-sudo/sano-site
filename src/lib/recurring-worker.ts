// Recurring-job worker seeding (Stage 0 PR C).
//
// Every generated recurring occurrence that will pay a contractor must get a
// proper job_workers row — a snapshotted rate + a pay basis — not just
// jobs.contractor_id. The rate is snapshotted AT GENERATION time from the
// contractor's current profile rate, so a later profile-rate change reprices
// only future occurrences, never ones already generated.

import { resolveWorkerRate } from './contractor-client-rate'

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
  /** Allocated hours for the occurrence (from the contract's duration). */
  allowedHours: number | null
  /** 'hourly' (paid per occurrence by hours) or 'fixed' (flat arrangement). */
  payType: RecurringPayType
}

export function buildRecurringWorkerRow(input: RecurringWorkerInput) {
  const isFixed = input.payType === 'fixed'
  return {
    job_id: input.jobId,
    contractor_id: input.contractorId,
    // Fixed-contract workers are NOT payable per occurrence, so we don't seed
    // allocated hours — that avoids the pay UI showing a misleading
    // hours × rate amount. The rate is still snapshotted for reference.
    hours_allocated: isFixed ? null : input.allowedHours,
    pay_rate: resolveWorkerRate(null, input.clientRate ?? null, input.contractorRate).rate,
    pay_type: isFixed ? 'fixed' : 'hourly',
  }
}
