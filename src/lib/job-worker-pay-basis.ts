// What a job_workers.pay_type means for paying THIS occurrence.
//
// Three bases, and the distinction between the last two is the point of this
// module:
//
//   'hourly'    — payable hours x pay_rate.
//   'per_visit' — pay_rate IS the whole payable for this visit (a set amount
//                 per clean). Payable per occurrence. NZCL at 58B Trias Road
//                 is $126 per clean.
//   'fixed'     — a RETAINER. The worker is paid a flat sum for the period
//                 (Myrtle's Pukekohe contract: $1,500/month) and individual
//                 occurrences are NOT separately payable; paying per job would
//                 pay them twice.
//
// 'fixed' and 'per_visit' both mean "the amount does not depend on hours", which
// is why they were originally conflated. They differ on the question that
// actually matters at approval time — may this occurrence be paid? — so they
// must be distinguishable.
//
// Anything unrecognised (including null, from older rows) is treated as hourly,
// which is the historical default.

export type PayBasis = 'hourly' | 'per_visit' | 'fixed'

export function payBasisOf(payType: string | null | undefined): PayBasis {
  if (payType === 'fixed') return 'fixed'
  if (payType === 'per_visit') return 'per_visit'
  return 'hourly'
}

/**
 * May this occurrence be approved as its own contractor payable?
 *
 * Only a retainer says no: its pay is raised separately for the period, so
 * approving the occurrence as well would double-pay.
 */
export function isPayablePerOccurrence(payType: string | null | undefined): boolean {
  return payBasisOf(payType) !== 'fixed'
}

/** True when pay_rate is the whole payable for the visit, not an hourly rate. */
export function isSetAmountPerVisit(payType: string | null | undefined): boolean {
  return payBasisOf(payType) === 'per_visit'
}

/** True when the amount does not depend on hours worked (retainer or per-visit). */
export function isHoursIndependent(payType: string | null | undefined): boolean {
  return payBasisOf(payType) !== 'hourly'
}

/** Short label for the pay UI. */
export function payBasisLabel(payType: string | null | undefined): string {
  switch (payBasisOf(payType)) {
    case 'fixed':     return 'Retainer'
    case 'per_visit': return 'Set amount per visit'
    default:          return 'Hourly'
  }
}
