import {
  resolveMileageRate,
  computeMileageReimbursement,
  type MileageRateConfig,
} from '@/lib/payroll/mileage-rates'

// Mirrors the seeded IRD 2025/26 rates (see the rate-config migration).
const LABEL = 'IRD 2025/26 kilometre rates (applied to 2026/27 reimbursements pending official 2026/27 rates)'
const SEED: MileageRateConfig[] = [
  { effectiveFrom: '2025-04-01', vehicleType: 'petrol', tier: 1, ratePerKm: 1.2, sourceLabel: LABEL },
  { effectiveFrom: '2025-04-01', vehicleType: 'petrol', tier: 2, ratePerKm: 0.37, sourceLabel: LABEL },
  { effectiveFrom: '2025-04-01', vehicleType: 'diesel', tier: 1, ratePerKm: 1.3, sourceLabel: LABEL },
  { effectiveFrom: '2025-04-01', vehicleType: 'diesel', tier: 2, ratePerKm: 0.38, sourceLabel: LABEL },
  { effectiveFrom: '2025-04-01', vehicleType: 'petrol_hybrid', tier: 1, ratePerKm: 0.9, sourceLabel: LABEL },
  { effectiveFrom: '2025-04-01', vehicleType: 'petrol_hybrid', tier: 2, ratePerKm: 0.24, sourceLabel: LABEL },
  { effectiveFrom: '2025-04-01', vehicleType: 'electric', tier: 1, ratePerKm: 1.22, sourceLabel: LABEL },
  { effectiveFrom: '2025-04-01', vehicleType: 'electric', tier: 2, ratePerKm: 0.23, sourceLabel: LABEL },
]

describe('resolveMileageRate', () => {
  it('resolves every seeded vehicle type + tier', () => {
    const on = '2026-07-27'
    expect(resolveMileageRate(SEED, { vehicleType: 'petrol', tier: 1, onDate: on })?.ratePerKm).toBe(1.2)
    expect(resolveMileageRate(SEED, { vehicleType: 'petrol', tier: 2, onDate: on })?.ratePerKm).toBe(0.37)
    expect(resolveMileageRate(SEED, { vehicleType: 'diesel', tier: 1, onDate: on })?.ratePerKm).toBe(1.3)
    expect(resolveMileageRate(SEED, { vehicleType: 'diesel', tier: 2, onDate: on })?.ratePerKm).toBe(0.38)
    expect(resolveMileageRate(SEED, { vehicleType: 'petrol_hybrid', tier: 1, onDate: on })?.ratePerKm).toBe(0.9)
    expect(resolveMileageRate(SEED, { vehicleType: 'petrol_hybrid', tier: 2, onDate: on })?.ratePerKm).toBe(0.24)
    expect(resolveMileageRate(SEED, { vehicleType: 'electric', tier: 1, onDate: on })?.ratePerKm).toBe(1.22)
    expect(resolveMileageRate(SEED, { vehicleType: 'electric', tier: 2, onDate: on })?.ratePerKm).toBe(0.23)
  })

  it('Carol (petrol, Tier 1) resolves to $1.20', () => {
    const r = resolveMileageRate(SEED, { vehicleType: 'petrol', tier: 1, onDate: '2026-07-27' })
    expect(r?.ratePerKm).toBe(1.2)
    expect(r?.sourceLabel).toContain('IRD 2025/26')
  })

  it('ignores config effective after the trip date', () => {
    expect(resolveMileageRate(SEED, { vehicleType: 'petrol', tier: 1, onDate: '2025-01-01' })).toBeNull()
  })

  it('picks the latest config effective on/before the date', () => {
    const withUpdate: MileageRateConfig[] = [
      ...SEED,
      { effectiveFrom: '2026-04-01', vehicleType: 'petrol', tier: 1, ratePerKm: 1.25, sourceLabel: 'IRD 2026/27' },
    ]
    expect(resolveMileageRate(withUpdate, { vehicleType: 'petrol', tier: 1, onDate: '2026-03-31' })?.ratePerKm).toBe(1.2)
    expect(resolveMileageRate(withUpdate, { vehicleType: 'petrol', tier: 1, onDate: '2026-04-01' })?.ratePerKm).toBe(1.25)
  })
})

describe('computeMileageReimbursement', () => {
  it('km × rate, rounded to cents', () => {
    expect(computeMileageReimbursement(50, 1.2)).toBe(60) // Carol: 50 km petrol T1
    expect(computeMileageReimbursement(33.3, 1.2)).toBe(39.96)
    expect(computeMileageReimbursement(12.5, 0.9)).toBe(11.25)
  })

  it('is zero for non-positive km or rate', () => {
    expect(computeMileageReimbursement(0, 1.2)).toBe(0)
    expect(computeMileageReimbursement(50, 0)).toBe(0)
  })
})
