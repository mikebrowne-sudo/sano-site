// Recurring-job worker seeding (Stage 0 PR C).
//
// Every generated recurring occurrence that will pay a contractor must get a
// proper job_workers row — a snapshotted rate + a pay basis — not just
// jobs.contractor_id. The rate is snapshotted AT GENERATION time from the
// contractor's current profile rate, so a later profile-rate change reprices
// only future occurrences, never ones already generated.

import { pickSnapshotRate } from './contractor-rate-snapshot'

export type RecurringPayType = 'hourly' | 'fixed'

export interface RecurringWorkerInput {
  jobId: string
  contractorId: string
  /** Contractor's current profile hourly_rate at the moment of generation. */
  contractorRate: number | null
  /** Allocated hours for the occurrence (from the contract's duration). */
  allowedHours: number | null
  /** 'hourly' (paid per occurrence by hours) or 'fixed' (flat arrangement). */
  payType: RecurringPayType
}

export function buildRecurringWorkerRow(input: RecurringWorkerInput) {
  return {
    job_id: input.jobId,
    contractor_id: input.contractorId,
    hours_allocated: input.allowedHours,
    pay_rate: pickSnapshotRate(null, input.contractorRate),
    pay_type: input.payType === 'fixed' ? 'fixed' : 'hourly',
  }
}
