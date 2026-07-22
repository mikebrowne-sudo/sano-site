// Mileage reimbursement — pure rate resolution + calculation.
//
// Rates live in the dated `mileage_rate_config` table (IRD 2025/26 rates,
// applied to 2026/27 reimbursements — see the migration). This module never
// hard-codes rates; it resolves whatever config applies on the trip date.
//
// TIER IS CHOSEN MANUALLY by an authorised user, never inferred here: Tier 1
// covers the vehicle's first 14,000 km of TOTAL annual travel (including
// private km), which Sano cannot know from work mileage alone.
//
// A mileage reimbursement is NON-TAXABLE: it is added to net pay after PAYE and
// excluded from gross / PAYE / ACC / KiwiSaver / IRD Employment Information.

export type VehicleType = 'petrol' | 'diesel' | 'petrol_hybrid' | 'electric'
export type MileageTier = 1 | 2

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  petrol_hybrid: 'Petrol hybrid',
  electric: 'Electric',
}

export interface MileageRateConfig {
  /** ISO date (yyyy-mm-dd) the rate takes effect. */
  effectiveFrom: string
  vehicleType: VehicleType
  tier: MileageTier
  ratePerKm: number
  sourceLabel: string
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * The applicable rate = the latest config effective on/before `onDate` for the
 * given vehicle type + tier. ISO dates compare lexically, so string order is
 * chronological. Returns null when nothing applies (caller surfaces an error
 * rather than guessing a rate).
 */
export function resolveMileageRate(
  configs: MileageRateConfig[],
  params: { vehicleType: VehicleType; tier: MileageTier; onDate: string },
): MileageRateConfig | null {
  const eligible = configs
    .filter(
      (c) =>
        c.vehicleType === params.vehicleType &&
        c.tier === params.tier &&
        c.effectiveFrom <= params.onDate,
    )
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))
  return eligible[0] ?? null
}

/** Reimbursement = km × rate, rounded to cents. Non-taxable. */
export function computeMileageReimbursement(km: number, ratePerKm: number): number {
  if (!(km > 0) || !(ratePerKm > 0)) return 0
  return round2(km * ratePerKm)
}
