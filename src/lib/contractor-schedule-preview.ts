// Contractor service-schedule payment PREVIEW (pure, DB-free).
//
// PR 1 shows a plain-English payment preview per schedule so staff can sanity-
// check commercial terms before sending. This computes the preview ONLY — it
// persists nothing and moves no tax money (the durable calc engine + snapshots
// are later PRs). When the withholding rate is not yet verified, the preview
// says "pending" and never guesses a rate.
//
// Three orthogonal axes:
//   payment_method : how the fee is structured (hourly / fixed_* / project / custom)
//   payment_basis  : gross_fee | guaranteed_net
//   rate_basis     : gst_inclusive | gst_exclusive

export type PaymentMethod =
  | 'hourly' | 'fixed_per_clean' | 'fixed_weekly' | 'fixed_fortnightly'
  | 'fixed_monthly' | 'project' | 'custom'
export type PaymentBasis = 'gross_fee' | 'guaranteed_net'
export type RateBasis = 'gst_inclusive' | 'gst_exclusive'

export const GST_RATE = 0.15
export const GST_INCLUSIVE_FRACTION = 3 / 23

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export interface SchedulePreviewInput {
  paymentBasis: PaymentBasis
  rateBasis: RateBasis
  /** The agreed amount: for gross_fee this is the gross; for guaranteed_net this
   *  is the amount the contractor must receive in the bank. */
  agreedAmount: number
  /** GST applies only when the contractor is verified GST-registered for this
   *  supply. PR 1 passes false unless staff have set it; GST verification is a
   *  later PR, so this stays conservative. */
  gstApplies: boolean
  /** Verified withholding rate (0..1), or null when not yet verified. Null =>
   *  the tax-dependent figures are 'pending' and MUST NOT be guessed. */
  whtRate: number | null
  /** Is this a schedular arrangement (withholding relevant at all)? */
  schedular: boolean
}

export interface SchedulePreview {
  /** True when tax-dependent numbers can't be shown yet (schedular + no rate). */
  pending: boolean
  grossExGst: number | null
  gst: number | null
  grossInclGst: number | null
  whtRate: number | null
  whtAmount: number | null
  netBank: number | null
  /** Total cost to Sano (grossExGst + gst). */
  sanoCost: number | null
}

/**
 * Compute a schedule payment preview. Withholding is always on the GST-exclusive
 * base; GST is separate and never in the withholding base. Guaranteed-net grosses
 * up from the verified rate: gross_ex_gst = net / (1 - rate).
 */
export function previewSchedulePayment(input: SchedulePreviewInput): SchedulePreview {
  const amount = round2(input.agreedAmount || 0)
  const rate = input.whtRate

  // Schedular but no verified rate → tax-dependent figures pending.
  const rateKnown = !input.schedular || (rate != null && rate >= 0 && rate < 1)
  const effRate = input.schedular ? rate : 0

  if (!rateKnown) {
    // We can still show the contractor-facing anchor amount (net for
    // guaranteed_net; gross-before-wht is unknown for gross_fee under exclusive).
    return {
      pending: true,
      grossExGst: null,
      gst: null,
      grossInclGst: null,
      whtRate: null,
      whtAmount: null,
      netBank: input.paymentBasis === 'guaranteed_net' ? amount : null,
      sanoCost: null,
    }
  }

  const r = effRate ?? 0
  let grossExGst: number
  let netBank: number

  if (input.paymentBasis === 'guaranteed_net') {
    // net is the anchor; gross up.
    netBank = amount
    grossExGst = r < 1 ? round2(amount / (1 - r)) : amount
  } else {
    // gross_fee: the agreed amount is the gross fee (ex-GST when exclusive; when
    // inclusive we first strip the GST to get the ex-GST schedular base).
    grossExGst = input.rateBasis === 'gst_inclusive' && input.gstApplies
      ? round2(amount - amount * GST_INCLUSIVE_FRACTION)
      : amount
    netBank = round2(grossExGst - grossExGst * r)
  }

  const whtAmount = round2(grossExGst * r)
  // GST: exclusive adds on top; inclusive already inside the agreed amount.
  const gst = input.gstApplies
    ? (input.rateBasis === 'gst_exclusive'
        ? round2(grossExGst * GST_RATE)
        : round2(amount * GST_INCLUSIVE_FRACTION))
    : 0
  const grossInclGst = round2(grossExGst + gst)
  // For guaranteed_net the contractor still receives net; GST (if any) is added
  // to what Sano pays out but is passed through, so netBank stays the guaranteed
  // figure. Sano's cost is gross ex-GST + GST.
  const sanoCost = round2(grossExGst + gst)

  return {
    pending: false,
    grossExGst,
    gst,
    grossInclGst,
    whtRate: r,
    whtAmount,
    netBank: input.paymentBasis === 'guaranteed_net' ? netBank : round2(grossExGst - whtAmount),
    sanoCost,
  }
}

/** Monthly + annual roll-up for a fixed-period schedule, for the preview panel. */
export function periodTotals(method: PaymentMethod, amount: number): { monthly: number | null; annual: number | null } {
  const a = round2(amount || 0)
  switch (method) {
    case 'fixed_weekly': return { monthly: round2(a * 52 / 12), annual: round2(a * 52) }
    case 'fixed_fortnightly': return { monthly: round2(a * 26 / 12), annual: round2(a * 26) }
    case 'fixed_monthly': return { monthly: a, annual: round2(a * 12) }
    default: return { monthly: null, annual: null }
  }
}
