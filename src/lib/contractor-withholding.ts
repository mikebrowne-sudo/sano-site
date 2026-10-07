// Contractor schedular withholding liability — pure helpers (DB-free).
//
// A withholding line is created from an APPROVED payment tax snapshot only, and
// frozen from it. Period is the monthly IRD period for the payday (reuses
// irdPaymentPeriod). No money movement here.

import { irdPaymentPeriod, type IrdPeriod } from './payroll/ird-liability'

export interface ApprovedSnapshotForWithholding {
  id: string
  contractorId: string
  status: string          // must be 'approved'
  calcStatus: string      // must be 'ok'
  supplyDate: string
  withholdingRate: number | null
  grossExGst: number | null
  withholdingAmount: number | null
  netBank: number | null
  calcVersion: string
  taxTreatment: string | null
}

/** Only an APPROVED, 'ok', schedular snapshot with a positive withholding amount
 *  can create a liability line. Returns an error string or null. */
export function validateWithholdingSource(s: ApprovedSnapshotForWithholding): string | null {
  if (s.status !== 'approved') return 'Only an approved payment snapshot can create a withholding line.'
  if (s.calcStatus !== 'ok') return 'The snapshot calculation is not resolved (ok) — cannot create a withholding line.'
  if (s.taxTreatment !== 'schedular_payment') return 'Withholding lines apply only to schedular_payment schedules.'
  if ((s.withholdingAmount ?? 0) <= 0) return 'This snapshot has no withholding to account for.'
  return null
}

/** The IRD period for a payday (monthly, due the 20th following). */
export function withholdingPeriod(payday: string): IrdPeriod {
  return irdPaymentPeriod(payday)
}

/** Map an approved snapshot + payday to the frozen withholding-line row (the
 *  withholding_period_id + contractor_id are supplied by the caller). The frozen
 *  figures must match the snapshot exactly (the DB trigger enforces it too). */
export function snapshotToWithholdingRow(s: ApprovedSnapshotForWithholding, payday: string): Record<string, unknown> {
  return {
    contractor_id: s.contractorId,
    payment_snapshot_id: s.id,
    payday,
    supply_date: s.supplyDate,
    withholding_rate: s.withholdingRate,
    gross_ex_gst: s.grossExGst,
    withholding_amount: s.withholdingAmount,
    net_bank: s.netBank,
    calc_version: s.calcVersion,
    filing_status: 'not_filed',
    status: 'active',
  }
}
