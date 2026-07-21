// GST on contractor payments.
//
// Sano's contractors are independent businesses that invoice Sano; there's no
// schedular withholding (cleaning isn't a listed schedular activity). What Sano
// needs is to split the GST OUT of a GST-registered contractor's payment so the
// GST portion can be claimed as input tax — and to NOT treat a contractor as
// GST-charging before their registration took effect.
//
// GST is 15%, so the GST inside a GST-inclusive amount is 3/23 (= 15/115).

export const GST_RATE = 0.15
export const GST_INCLUSIVE_FRACTION = 3 / 23

/**
 * How a contractor is treated for tax when Sano pays them. Drives whether any
 * withholding applies. 'ordinary_trade_creditor' = a normal supplier invoice, no
 * withholding (the current assumption for all Sano contractors). The schedular /
 * exemption options exist so labour-hire arrangements can be flagged once the
 * accountant confirms whether the withholding rules apply — withholding itself
 * is not yet implemented.
 */
export const CONTRACTOR_TAX_TREATMENTS = [
  { value: 'ordinary_trade_creditor', label: 'Ordinary trade creditor (invoices; no withholding)' },
  { value: 'schedular_payment', label: 'Schedular payment (withholding applies)' },
  { value: 'certificate_of_exemption', label: 'Certificate of exemption' },
  { value: 'pending_review', label: 'Pending review' },
] as const

export type ContractorTaxTreatment = (typeof CONTRACTOR_TAX_TREATMENTS)[number]['value']

const round2 = (n: number) => Math.round(n * 100) / 100

export interface GstSplit {
  /** GST portion within a GST-inclusive amount. */
  gst: number
  /** The amount excluding GST. */
  exclusive: number
}

/** Split a GST-inclusive amount into its GST (3/23) + GST-exclusive parts. */
export function splitGstInclusive(inclusiveAmount: number): GstSplit {
  const gst = round2(inclusiveAmount * GST_INCLUSIVE_FRACTION)
  return { gst, exclusive: round2(inclusiveAmount - gst) }
}

export interface ContractorGstProfile {
  gstRegistered: boolean
  /** ISO date (YYYY-MM-DD) registration took effect. Null = no bound. */
  gstEffectiveDate?: string | null
}

export interface ContractorGstResult extends GstSplit {
  /** Whether GST was actually applied to this payment. */
  applied: boolean
}

/**
 * GST on a contractor payment. Returns gst=0 (whole amount exclusive) unless the
 * contractor is GST-registered AND the work date is on/after their effective
 * date. Rates are always treated as GST-inclusive.
 */
export function contractorGstOnPayment(
  profile: ContractorGstProfile,
  inclusiveAmount: number,
  workDateIso?: string | null,
): ContractorGstResult {
  const beforeEffective =
    !!profile.gstEffectiveDate && !!workDateIso && workDateIso < profile.gstEffectiveDate
  if (!profile.gstRegistered || beforeEffective) {
    return { applied: false, gst: 0, exclusive: round2(inclusiveAmount) }
  }
  return { applied: true, ...splitGstInclusive(inclusiveAmount) }
}

/**
 * GST status recorded on a snapshotted contractor payment.
 * - 'applied'               supply date within a confirmed registration window → 3/23 split
 * - 'before_effective_date' supply date precedes the registration start
 * - 'not_registered'        after the end date, or plainly never registered → no GST
 * - 'pending_review'        tax treatment pending, OR not-registered flag conflicts
 *                           with historical dates → FLAGGED (never auto no-GST)
 * - 'incomplete'            registration claimed but not confirmable (no effective
 *                           date / no GST number) → FLAGGED
 * - 'not_assessed'          historical row, never assessed (migration backfill only)
 */
export type ContractorGstStatus =
  | 'applied'
  | 'before_effective_date'
  | 'not_registered'
  | 'pending_review'
  | 'incomplete'
  | 'not_assessed'

export interface ContractorPaymentGstInput {
  gstRegistered: boolean | null
  /** ISO date registration took effect (window start). */
  gstEffectiveDate?: string | null
  /** ISO date registration ended / deregistered (window end). Null = open. */
  gstEndDate?: string | null
  gstNumber?: string | null
  /** contractors.tax_treatment — 'pending_review' means don't guess. */
  taxTreatment?: string | null
}

export interface ResolvedContractorGst {
  status: ContractorGstStatus
  applied: boolean
  /** GST portion (3/23) — 0 unless status is 'applied'. Never added on top. */
  gstAmount: number
  /** GST-exclusive portion. Equals the full amount when GST is not applied. */
  exclusive: number
}

/**
 * Resolve GST for a contractor payment at its supply date, using the
 * registration WINDOW [effective, end] rather than the current flag alone.
 * Rates are GST-inclusive; GST is split OUT (3/23), never added on top.
 * Ambiguity (pending treatment, incomplete dates, or a not-registered flag that
 * conflicts with historical dates) is FLAGGED, never guessed as no-GST.
 */
export function resolveContractorPaymentGst(
  c: ContractorPaymentGstInput,
  inclusiveAmount: number,
  supplyDateIso: string | null,
): ResolvedContractorGst {
  const amount = round2(inclusiveAmount)
  const flag = (status: ContractorGstStatus): ResolvedContractorGst => ({ status, applied: false, gstAmount: 0, exclusive: amount })
  const eff = c.gstEffectiveDate || null
  const end = c.gstEndDate || null
  const supply = supplyDateIso || null

  // Unresolved tax treatment → flag.
  if ((c.taxTreatment ?? '') === 'pending_review') return flag('pending_review')

  // Supply before the window started → not registered yet (distinct status).
  if (eff && supply && supply < eff) return flag('before_effective_date')
  // Supply after an explicit end date → deregistered by then.
  if (end && supply && supply > end) return flag('not_registered')

  // Within a CONFIRMED window → applied. Confirmed = effective date set + supply
  // on/after it AND (an explicit end covers it, OR still registered with no end).
  if (eff && supply && supply >= eff && (end ? supply <= end : !!c.gstRegistered)) {
    if (!c.gstNumber?.trim()) return flag('incomplete') // in-window but no number
    const split = splitGstInclusive(amount)
    return { status: 'applied', applied: true, gstAmount: split.gst, exclusive: split.exclusive }
  }

  // Registration claimed but not confirmable (no effective date) → flag.
  if (c.gstRegistered && !eff) return flag('incomplete')
  // Not currently registered but there IS historical registration data we can't
  // place cleanly (e.g. effective date but no end, flag off) → don't auto no-GST.
  if (!c.gstRegistered && eff) return flag('pending_review')

  // No registration information at all → not registered.
  return flag('not_registered')
}
