// Contractor payment tax snapshot — pure approval-gate + mapping (DB-free).
//
// A calc result may be SAVED as a draft in any status, but only a fully-resolved
// 'ok' result may be APPROVED (become payable). Corrections supersede, never
// overwrite. This module holds the pure rules + the calc→row mapping so PR 7's
// action persists the canonical result verbatim.

import type { PaymentCalc } from './contractor-payment-calc'

/** Calc statuses that can NEVER become an approved/payable snapshot. */
export const NON_APPROVABLE_STATUSES = ['pending_tax', 'gst_unresolved', 'gst_incomplete', 'blocked', 'unsupported'] as const

/** Can this calc result be approved into a payable snapshot? Only 'ok'. */
export function canApproveSnapshot(calc: Pick<PaymentCalc, 'status'>): { ok: boolean; reason?: string } {
  if (calc.status === 'ok') return { ok: true }
  return { ok: false, reason: `A ${calc.status.replace(/_/g, ' ')} calculation cannot be approved or paid — resolve the tax/GST status first.` }
}

/** Map the canonical calc result to a snapshot row (verbatim — no recompute). The
 *  contractor id + correction linkage are supplied by the caller. Full IRD number
 *  and review notes are deliberately NOT included (only the source row ids). */
export function calcToSnapshotRow(calc: PaymentCalc, contractorId: string): Record<string, unknown> {
  return {
    contractor_id: contractorId,
    service_schedule_id: calc.scheduleId,
    schedule_version_key: calc.scheduleVersionKey,
    calc_status: calc.status,
    calc_reason: calc.reason,
    calc_version: calc.calcVersion,
    rounding_method: calc.rounding,
    supply_date: calc.supplyDate,
    payment_method: calc.paymentMethod,
    payment_basis: calc.paymentBasis,
    rate_basis: calc.rateBasis,
    agreed_amount: calc.agreedAmount,
    tax_treatment: calc.taxTreatment,
    gst_resolution: calc.gstResolution,
    gst_history_id: calc.gstHistoryId,
    tax_declaration_id: calc.taxDeclarationId,
    declaration_type: calc.declarationType,
    withholding_rate: calc.withholdingRate,
    gross_ex_gst: calc.grossExGst,
    gst_amount: calc.gst,
    gross_incl_gst: calc.grossInclGst,
    withholding_amount: calc.withholdingAmount,
    net_bank: calc.netBank,
    sano_cost: calc.sanoCost,
    recoverable_gst: calc.recoverableGst,
  }
}
