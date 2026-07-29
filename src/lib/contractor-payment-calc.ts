// Contractor payment CALCULATION engine (pure, DB-free).
//
// The authoritative "what does this payment break down to" function for a
// contractor payment on a given supply date. It resolves the withholding rate
// (from the verified tax declaration applicable on the date) and the GST window
// (from the verified GST status applicable on the date), then computes:
//   gross ex-GST → GST → withholding (on the GST-EXCLUSIVE base) → net.
//
// PURE + PREVIEW ONLY. It writes nothing. It NEVER guesses a missing input — if
// the schedular tax rate is unverified, or GST is unresolved, the result carries
// a status ('pending_tax' / 'gst_unresolved' / 'blocked') and the tax-dependent
// figures are null, never a made-up number.

import { GST_RATE, GST_INCLUSIVE_FRACTION, type PaymentBasis, type RateBasis } from './contractor-schedule-preview'

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
import { declarationTaxState, type DeclarationRecord } from './contractor-tax-declaration'
import { gstWindowForDate, type GstHistoryRecord, type GstResolution } from './contractor-gst-history'
import type { ScheduleTaxTreatment } from './contractor-tax-gate'

export type CalcStatus =
  | 'ok'              // fully resolved — figures are final
  | 'pending_tax'     // schedular but no verified declaration/rate yet → blocked
  | 'gst_unresolved'  // no verified GST status covers the supply date → blocked
  | 'blocked'         // schedule tax treatment unresolved/unclassified

export interface PaymentCalcInput {
  /** The agreed amount: gross fee, or the guaranteed-net the contractor receives. */
  agreedAmount: number
  paymentBasis: PaymentBasis
  rateBasis: RateBasis
  /** The schedule's tax classification (per-schedule). */
  taxTreatment: ScheduleTaxTreatment
  /** The contractor's tax declarations (full history) + GST history. */
  taxDeclarations: DeclarationRecord[]
  gstHistory: GstHistoryRecord[]
  /** The supply/payment date used to resolve BOTH the tax rate and GST window. */
  supplyDateIso: string
}

export interface PaymentCalc {
  status: CalcStatus
  /** Human reason, always populated. */
  reason: string
  /** Gross fee excluding GST — the schedular base. Null until resolved. */
  grossExGst: number | null
  gst: number | null
  grossInclGst: number | null
  /** Withholding rate (decimal) applied, and amount (on the ex-GST base). */
  whtRate: number | null
  whtAmount: number | null
  /** Net paid to the contractor's bank. */
  netBank: number | null
  /** Total cost to Sano (gross ex-GST + GST). */
  sanoCost: number | null
  /** Whether GST was applied, and how it resolved. */
  gstResolution: GstResolution
}

/** Pick the verified tax declaration applicable on a date (date-based). */
function declarationForDate(declarations: DeclarationRecord[], dateIso: string): DeclarationRecord | null {
  const applicable = declarations.filter((d) =>
    d.status === 'verified' && !!d.effectiveDate && d.effectiveDate <= dateIso &&
    (!d.expiryDate || dateIso <= d.expiryDate),
  )
  if (applicable.length === 0) return null
  return applicable.sort((a, b) => (a.effectiveDate! < b.effectiveDate! ? 1 : -1))[0]
}

const blocked = (status: CalcStatus, reason: string, gstResolution: GstResolution, netAnchor: number | null): PaymentCalc => ({
  status, reason, grossExGst: null, gst: null, grossInclGst: null, whtRate: null, whtAmount: null,
  netBank: netAnchor, sanoCost: null, gstResolution,
})

/**
 * Compute a contractor payment breakdown for a supply date. Resolves the tax
 * rate + GST window from the verified histories, then does the arithmetic.
 * Never guesses: unresolved inputs yield a blocked/pending status with null
 * figures (the guaranteed-net anchor is echoed for display where known).
 */
export function computeContractorPayment(input: PaymentCalcInput): PaymentCalc {
  const amount = round2(input.agreedAmount || 0)
  const netAnchor = input.paymentBasis === 'guaranteed_net' ? amount : null

  // 1. GST window for the supply date (tri-state).
  const gstWindow = gstWindowForDate(input.gstHistory, input.supplyDateIso)
  const gstApplies = gstWindow.resolution === 'registered'

  // 2. Schedule classification gates whether withholding is even relevant.
  const treatment = input.taxTreatment
  if (treatment == null || treatment === 'pending_review') {
    return blocked('blocked', 'This schedule’s tax treatment has not been classified.', gstWindow.resolution, netAnchor)
  }

  // 3. Resolve the withholding rate.
  //    - ordinary_trade_creditor → no withholding (rate 0), GST may still apply.
  //    - schedular_payment / exempt_certificate → needs a verified declaration
  //      applicable on the date; exemption → 0%.
  let whtRate = 0
  let schedular = false
  if (treatment === 'schedular_payment' || treatment === 'exempt_certificate') {
    schedular = true
    const decl = declarationForDate(input.taxDeclarations, input.supplyDateIso)
    const taxState = declarationTaxState(decl, input.supplyDateIso)
    if (!taxState.satisfiesGate) {
      return blocked('pending_tax', `Payment blocked: valid contractor tax declaration required — ${taxState.reason}`, gstWindow.resolution, netAnchor)
    }
    if (treatment === 'exempt_certificate' && !taxState.isExemption) {
      return blocked('pending_tax', 'This schedule requires a verified exemption certificate.', gstWindow.resolution, netAnchor)
    }
    whtRate = taxState.isExemption ? 0 : (taxState.rate ?? 0)
  }

  // 4. If GST is UNRESOLVED (no verified status covers the date), we cannot state
  //    the GST-inclusive figure or Sano's cost with confidence → blocked. (A
  //    verified not-registered resolves cleanly to gstApplies=false.)
  if (gstWindow.resolution === 'unresolved') {
    return blocked('gst_unresolved', 'GST status is unresolved for this supply date — a verified GST declaration is required before payment.', gstWindow.resolution, netAnchor)
  }

  // 5. Arithmetic (all inputs resolved).
  let grossExGst: number
  if (input.paymentBasis === 'guaranteed_net') {
    grossExGst = whtRate < 1 ? round2(amount / (1 - whtRate)) : amount
  } else {
    grossExGst = input.rateBasis === 'gst_inclusive' && gstApplies
      ? round2(amount - amount * GST_INCLUSIVE_FRACTION)
      : amount
  }
  const whtAmount = round2(grossExGst * whtRate)
  const gst = gstApplies
    ? (input.rateBasis === 'gst_exclusive' ? round2(grossExGst * GST_RATE) : round2(amount * GST_INCLUSIVE_FRACTION))
    : 0
  const grossInclGst = round2(grossExGst + gst)
  const netBank = input.paymentBasis === 'guaranteed_net' ? amount : round2(grossExGst - whtAmount)
  const sanoCost = round2(grossExGst + gst)

  return {
    status: 'ok',
    reason: schedular ? `Withholding ${Math.round(whtRate * 100)}% on the GST-exclusive amount.` : 'Ordinary trade creditor — no withholding.',
    grossExGst, gst, grossInclGst, whtRate, whtAmount, netBank, sanoCost,
    gstResolution: gstWindow.resolution,
  }
}
