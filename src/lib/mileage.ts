// Mileage logbook helpers — pure + testable.
//
// Home base and the reimbursement rate live here (app config, not the DB).
// The rate is a PLACEHOLDER — the accountant confirms the current IRD
// kilometre rate; the UI shows the dollar figure only as an estimate.

export const HOME_BASE = '35 Holbrook Street, Blockhouse Bay, Auckland'

// PLACEHOLDER — NOT a confirmed IRD rate. Set to the current IRD Tier 1
// kilometre rate once the accountant confirms it. Used for the on-screen
// estimate only; actual reimbursement is applied at payroll.
export const MILEAGE_RATE_PER_KM = 1.04 // NZD/km — CONFIRM with accountant

export interface MileageStop {
  label?: string | null
  address: string
}

export interface MileageLog {
  id: string
  logDate: string
  personLabel: string | null
  stops: MileageStop[]
  distanceKm: number
  notes: string | null
}

export const roundKm = (km: number): number => Math.round(km * 10) / 10

/** Estimated reimbursement — km × rate. Estimate only (rate is a placeholder). */
export function estimateReimbursement(km: number, ratePerKm: number = MILEAGE_RATE_PER_KM): number {
  return Math.round(km * ratePerKm * 100) / 100
}

/** Build the ordered address list for a trip: base → stops → base. */
export function tripAddresses(stops: MileageStop[], homeBase: string = HOME_BASE): string[] {
  const clean = stops.map((s) => s.address.trim()).filter(Boolean)
  if (clean.length === 0) return []
  return [homeBase, ...clean, homeBase]
}

export interface MileageTotals {
  totalKm: number
  logCount: number
  estimatedReimbursement: number
}

/** Roll up a set of logs into headline totals for a period. */
export function summariseMileage(logs: ReadonlyArray<{ distanceKm: number }>, ratePerKm: number = MILEAGE_RATE_PER_KM): MileageTotals {
  const totalKm = roundKm(logs.reduce((s, l) => s + (l.distanceKm || 0), 0))
  return {
    totalKm,
    logCount: logs.length,
    estimatedReimbursement: estimateReimbursement(totalKm, ratePerKm),
  }
}
