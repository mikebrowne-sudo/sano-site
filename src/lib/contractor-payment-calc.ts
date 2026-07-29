// Contractor payment CALCULATION engine (pure, DB-free).
//
// The authoritative "what does this payment break down to" function for a
// contractor payment on a given SUPPLY DATE. It resolves — date-based, never from
// a flat cache — the withholding rate (from the verified tax declaration
// applicable on the supply date) and the GST window (from the verified GST status
// applicable on the supply date), then computes:
//   gross ex-GST → GST → withholding (on the GST-EXCLUSIVE base) → net.
//
// DATE BASIS: the SUPPLY DATE is used to resolve BOTH the GST window AND the
// withholding declaration. Schedular withholding attaches to the payment for the
// supply of services; Sano uses a single supply date for the whole breakdown so
// GST and withholding are always resolved consistently. (If a distinct "payment
// date" is ever needed for the withholding leg, add it as a separate input — do
// not silently reuse today's date.)
//
// PURE + PREVIEW ONLY. Writes nothing. NEVER guesses: any unsafe/unresolved input
// yields a blocked/pending status with NULL financial figures — never a
// plausible-looking zero. The full result is self-describing so PR 7 can persist
// it directly without recalculating or inferring fields.

import { GST_RATE, GST_INCLUSIVE_FRACTION, type PaymentBasis, type RateBasis } from './contractor-schedule-preview'
import { declarationTaxState, type DeclarationRecord, type DeclarationType } from './contractor-tax-declaration'
import { gstWindowForDate, type GstHistoryRecord, type GstResolution } from './contractor-gst-history'
import type { ScheduleTaxTreatment } from './contractor-tax-gate'

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** Stable calculation version. PR 7 snapshots this so a future rule change never
 *  makes a historical payment record impossible to re-explain. Bump on any change
 *  to the calculation rules (not for unrelated refactors). */
export const CONTRACTOR_PAYMENT_CALC_VERSION = 'contractor-payment-v1'

/** Rounding policy (see §7 in the review): monetary results are rounded to CENTS
 *  (half-up via Math.round with an epsilon). Rate percentages are decimals used
 *  UNROUNDED in intermediate arithmetic (e.g. net/(1-rate)); only the final money
 *  amounts are rounded. Rounding is at the LINE (single-payment) level — a
 *  guaranteed-net gross-up reconciles to the target bank payment, and a
 *  GST-inclusive extraction reconciles back to the original total, within a cent. */
export const CONTRACTOR_PAYMENT_ROUNDING = 'cents-half-up; unrounded rate intermediates; line-level' as const

export type CalcStatus =
  | 'ok'                 // fully resolved — figures are final
  | 'pending_tax'        // schedular but no verified declaration/rate → blocked
  | 'gst_unresolved'     // no verified GST status covers the supply date → blocked
  | 'gst_incomplete'     // GST registered but no verified GST number → blocked
  | 'blocked'            // schedule tax treatment unresolved/unclassified
  | 'unsupported'        // an unsupported/ambiguous basis combination or bad input

export interface PaymentCalcInput {
  /** Identity of the schedule version this payment is for (persisted with the result). */
  scheduleId?: string | null
  scheduleVersionKey?: string | null
  paymentMethod?: string | null
  /** The agreed amount: gross fee, or the guaranteed-net the contractor receives. */
  agreedAmount: number
  paymentBasis: PaymentBasis
  rateBasis: RateBasis
  /** The schedule's tax classification (per-schedule). */
  taxTreatment: ScheduleTaxTreatment
  /** The contractor's tax declarations (full history) + GST history. */
  taxDeclarations: DeclarationRecord[]
  gstHistory: GstHistoryRecord[]
  /** The SUPPLY DATE — resolves BOTH the tax rate and the GST window. */
  supplyDateIso: string
}

export interface PaymentCalc {
  // ── Status ────────────────────────────────────────────────────────────────
  status: CalcStatus
  /** Blocking/pending reason (or the applied-treatment note when ok). Always set. */
  reason: string
  calcVersion: string
  rounding: string

  // ── Echoed inputs (self-describing for persistence) ─────────────────────────
  scheduleId: string | null
  scheduleVersionKey: string | null
  supplyDate: string
  paymentMethod: string | null
  paymentBasis: PaymentBasis
  rateBasis: RateBasis
  agreedAmount: number
  taxTreatment: ScheduleTaxTreatment

  // ── Resolved tax/GST identity ──────────────────────────────────────────────
  gstResolution: GstResolution
  /** The verified GST history row used (id), or null when not registered/unresolved. */
  gstHistoryId: string | null
  /** The verified tax declaration used (id + type), or null when none applies. */
  taxDeclarationId: string | null
  declarationType: DeclarationType | null

  // ── Figures (all NULL in any non-'ok' state) ───────────────────────────────
  withholdingRate: number | null
  grossExGst: number | null
  gst: number | null
  grossInclGst: number | null
  withholdingAmount: number | null
  netBank: number | null
  /** Total cash Sano outlays (gross ex-GST + GST). */
  sanoCost: number | null
  /** GST Sano can claim as input tax (equals `gst` when registered; 0 otherwise). */
  recoverableGst: number | null
}

/** Pick the verified tax declaration applicable on a date (date-based, latest
 *  effective ≤ date, within any expiry). */
function declarationForDate(declarations: DeclarationRecord[], dateIso: string): DeclarationRecord | null {
  const applicable = declarations.filter((d) =>
    d.status === 'verified' && !!d.effectiveDate && d.effectiveDate <= dateIso &&
    (!d.expiryDate || dateIso <= d.expiryDate),
  )
  if (applicable.length === 0) return null
  return applicable.sort((a, b) => (a.effectiveDate! < b.effectiveDate! ? 1 : -1))[0]
}

/**
 * Compute a contractor payment breakdown for a supply date. Resolves the tax rate
 * + GST window from the verified histories, then does the arithmetic. Returns a
 * complete, self-describing result; any unsafe/unresolved input → a blocked
 * status with null figures.
 */
export function computeContractorPayment(input: PaymentCalcInput): PaymentCalc {
  const amount = round2(input.agreedAmount || 0)
  const netAnchor = input.paymentBasis === 'guaranteed_net' ? amount : null

  const gstWindow = gstWindowForDate(input.gstHistory, input.supplyDateIso)

  // Base result carries the echoed inputs + version; branches fill the figures.
  const baseResult = (over: Partial<PaymentCalc>): PaymentCalc => ({
    status: 'ok', reason: '', calcVersion: CONTRACTOR_PAYMENT_CALC_VERSION, rounding: CONTRACTOR_PAYMENT_ROUNDING,
    scheduleId: input.scheduleId ?? null, scheduleVersionKey: input.scheduleVersionKey ?? null,
    supplyDate: input.supplyDateIso, paymentMethod: input.paymentMethod ?? null,
    paymentBasis: input.paymentBasis, rateBasis: input.rateBasis, agreedAmount: amount, taxTreatment: input.taxTreatment,
    gstResolution: gstWindow.resolution, gstHistoryId: null, taxDeclarationId: null, declarationType: null,
    withholdingRate: null, grossExGst: null, gst: null, grossInclGst: null, withholdingAmount: null,
    netBank: null, sanoCost: null, recoverableGst: null,
    ...over,
  })
  const block = (status: CalcStatus, reason: string): PaymentCalc => baseResult({ status, reason, netBank: netAnchor })

  // 0. Input sanity / unsupported combinations.
  if (input.paymentBasis === 'guaranteed_net' && input.rateBasis === 'gst_inclusive') {
    // Ambiguous: is the guaranteed amount net-of-GST or GST-inclusive? Sano's rule
    // is guaranteed_net = the bank payment AFTER withholding, GST added separately —
    // which is a GST-EXCLUSIVE concept. Rather than silently pick, block it.
    return block('unsupported', 'Guaranteed-net with a GST-inclusive rate basis is not supported — guaranteed net is the contractor’s bank payment after withholding, with GST added separately. Use GST-exclusive.')
  }

  // 1. Schedule classification gates whether withholding is relevant.
  const treatment = input.taxTreatment
  if (treatment == null || treatment === 'pending_review') {
    return block('blocked', 'This schedule’s tax treatment has not been classified.')
  }

  // 2. Resolve withholding.
  let whtRate = 0
  let schedular = false
  let declId: string | null = null
  let declType: DeclarationType | null = null
  if (treatment === 'schedular_payment' || treatment === 'exempt_certificate') {
    schedular = true
    const decl = declarationForDate(input.taxDeclarations, input.supplyDateIso)
    const taxState = declarationTaxState(decl, input.supplyDateIso)
    if (!taxState.satisfiesGate) {
      return block('pending_tax', `Payment blocked: valid contractor tax declaration required — ${taxState.reason}`)
    }
    if (treatment === 'exempt_certificate' && !taxState.isExemption) {
      return block('pending_tax', 'This schedule requires a verified exemption certificate.')
    }
    declId = decl?.id ?? null
    declType = decl?.declarationType ?? null
    whtRate = taxState.isExemption ? 0 : (taxState.rate ?? 0)
    if (whtRate < 0 || whtRate >= 1) {
      return block('unsupported', 'The verified withholding rate is invalid (must be a decimal below 1, e.g. 0.20).')
    }
  }

  // 3. GST resolution states.
  if (gstWindow.resolution === 'unresolved') {
    return block('gst_unresolved', 'GST status is unresolved for this supply date — a verified GST declaration is required before payment.')
  }
  const gstApplies = gstWindow.resolution === 'registered'
  if (gstApplies && !(gstWindow.gstNumber ?? '').trim()) {
    return block('gst_incomplete', 'GST is registered for this supply date but the verified GST number is missing.')
  }

  // 4. Arithmetic (all inputs resolved).
  let grossExGst: number
  if (input.paymentBasis === 'guaranteed_net') {
    // net = the bank payment AFTER withholding (GST added separately). Gross up
    // on the UNROUNDED rate, then round the money.
    grossExGst = round2(amount / (1 - whtRate))
  } else {
    // gross_fee: agreed is the gross fee — ex-GST when exclusive; strip GST when inclusive.
    grossExGst = input.rateBasis === 'gst_inclusive' && gstApplies
      ? round2(amount - amount * GST_INCLUSIVE_FRACTION)
      : amount
  }
  const withholdingAmount = round2(grossExGst * whtRate)
  const gst = gstApplies
    ? (input.rateBasis === 'gst_exclusive' ? round2(grossExGst * GST_RATE) : round2(amount * GST_INCLUSIVE_FRACTION))
    : 0
  const grossInclGst = round2(grossExGst + gst)
  const netBank = input.paymentBasis === 'guaranteed_net' ? amount : round2(grossExGst - withholdingAmount)
  const sanoCost = round2(grossExGst + gst)

  return baseResult({
    status: 'ok',
    reason: schedular ? `Withholding ${Math.round(whtRate * 100)}% on the GST-exclusive amount.` : 'Ordinary trade creditor — no withholding.',
    gstHistoryId: gstApplies ? (gstWindow.gstHistoryId ?? null) : null,
    taxDeclarationId: declId, declarationType: declType,
    withholdingRate: whtRate, grossExGst, gst, grossInclGst, withholdingAmount, netBank, sanoCost,
    recoverableGst: gstApplies ? gst : 0,
  })
}
