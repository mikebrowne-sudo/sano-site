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
 * - 'applied'               registered on the supply date → 3/23 split
 * - 'not_registered'        contractor isn't GST-registered → no GST
 * - 'before_effective_date' registered, but the supply date precedes registration
 * - 'pending_review'        tax treatment unresolved → FLAGGED, never guessed
 * - 'incomplete'            registered but missing GST number / effective date → FLAGGED
 */
export type ContractorGstStatus =
  | 'applied'
  | 'not_registered'
  | 'before_effective_date'
  | 'pending_review'
  | 'incomplete'

export interface ContractorPaymentGstInput {
  gstRegistered: boolean | null
  gstEffectiveDate?: string | null
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
 * Resolve GST for a contractor payment at its supply date. Rates are always
 * GST-inclusive; GST is split OUT with 3/23, never added on top. When the
 * contractor's GST status is unresolved (pending review, or registered but
 * missing its number / effective date), the payment is FLAGGED rather than
 * guessed — GST is not applied and staff can complete the data.
 */
export function resolveContractorPaymentGst(
  c: ContractorPaymentGstInput,
  inclusiveAmount: number,
  supplyDateIso: string | null,
): ResolvedContractorGst {
  const amount = round2(inclusiveAmount)
  if ((c.taxTreatment ?? '') === 'pending_review') {
    return { status: 'pending_review', applied: false, gstAmount: 0, exclusive: amount }
  }
  if (!c.gstRegistered) {
    return { status: 'not_registered', applied: false, gstAmount: 0, exclusive: amount }
  }
  if (!c.gstNumber?.trim() || !c.gstEffectiveDate) {
    return { status: 'incomplete', applied: false, gstAmount: 0, exclusive: amount }
  }
  if (supplyDateIso && supplyDateIso < c.gstEffectiveDate) {
    return { status: 'before_effective_date', applied: false, gstAmount: 0, exclusive: amount }
  }
  const split = splitGstInclusive(amount)
  return { status: 'applied', applied: true, gstAmount: split.gst, exclusive: split.exclusive }
}
