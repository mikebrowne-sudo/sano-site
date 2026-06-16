// Pure classification for the Pending pay approvals worklist (Stage B).
//
// Turns the raw job_worker + job + rate facts into a display mode
// (hourly vs fixed), a default amount, and warning flags + a readiness
// state. No DB access — unit-tested directly. The actual approval goes
// through the Stage A approveContractorPay action.

export type ApprovalFlag =
  | 'already_approved'
  | 'missing_rate'
  | 'missing_hours'
  | 'submitted_exceeds_allowed'
  | 'multiple_contractors'
  | 'fixed_needs_amount'

export type Readiness = 'already_approved' | 'ready' | 'needs_input' | 'needs_review'

export interface PendingRowInput {
  payType: string | null
  rate: number | null            // job_workers.pay_rate ?? contractors.hourly_rate
  allowedHours: number | null    // job_workers.hours_allocated ?? jobs.allowed_hours
  submittedHours: number | null  // job_workers.actual_hours
  payableHours: number | null    // getWorkerPayableHours(jw)
  hasExistingCI: boolean
  workersOnJob: number
}

export interface PendingRowComputed {
  mode: 'hourly' | 'fixed'
  computedAmount: number | null  // hourly default (payable hours × rate)
  flags: ApprovalFlag[]
  readiness: Readiness
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function classifyApprovalRow(input: PendingRowInput): PendingRowComputed {
  const { payType, rate, allowedHours, submittedHours, payableHours, hasExistingCI, workersOnJob } = input

  // Fixed when explicitly typed fixed, or when we can't do the hourly maths
  // (no rate or no payable hours). Otherwise hourly.
  const mode: 'hourly' | 'fixed' =
    payType === 'fixed' || rate == null || payableHours == null ? 'fixed' : 'hourly'

  const flags: ApprovalFlag[] = []
  if (hasExistingCI) flags.push('already_approved')
  if (!hasExistingCI && mode === 'hourly') {
    if (rate == null) flags.push('missing_rate')
    if (payableHours == null) flags.push('missing_hours')
  }
  if (!hasExistingCI && mode === 'fixed' && payType === 'hourly' && rate == null) {
    // Hourly-typed legacy row with no rate → staff must enter a fixed amount.
    flags.push('missing_rate')
  }
  if (submittedHours != null && allowedHours != null && submittedHours > allowedHours) {
    flags.push('submitted_exceeds_allowed')
  }
  if (workersOnJob > 1) flags.push('multiple_contractors')
  if (!hasExistingCI && mode === 'fixed') flags.push('fixed_needs_amount')

  const computedAmount = mode === 'hourly' && rate != null && payableHours != null
    ? round2(payableHours * rate)
    : null

  let readiness: Readiness
  if (hasExistingCI) readiness = 'already_approved'
  else if (mode === 'hourly' && computedAmount != null) readiness = 'ready'
  else if (mode === 'fixed') readiness = 'needs_input'
  else readiness = 'needs_review'

  return { mode, computedAmount, flags, readiness }
}
