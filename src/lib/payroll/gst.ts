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
