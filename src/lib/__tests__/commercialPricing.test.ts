import {
  BASE_RATES,
  FIXTURE_RATES,
  COMPLEXITY_UPLIFTS,
  LOCATION_UPLIFT,
  DEEP_CLEAN_MULTIPLIER,
  HOURLY_COST,
  MINIMUM_HOURS,
  SETUP_TIME,
  TRAVEL_TIME,
  FIXTURE_HOURS,
  PRODUCTION_RATES,
  normaliseFrequency,
  frequencyMultiplier,
  targetMargin,
  minimumCharge,
} from '../commercialPricing'

describe('commercialPricing — constants', () => {
  it('exposes spec-accurate base rates', () => {
    expect(BASE_RATES.office.make_money).toBe(0.80)
    expect(BASE_RATES.warehouse.win_work).toBe(0.35)
    expect(BASE_RATES.medical.premium).toBe(2.20)
  })

  it('exposes fixture rates with flat windows/carpet/hard_floor', () => {
    expect(FIXTURE_RATES.bathroom.make_money).toBe(30)
    expect(FIXTURE_RATES.window).toBe(8)
    expect(FIXTURE_RATES.carpet).toBe(4)
    expect(FIXTURE_RATES.hard_floor).toBe(5)
  })

  it('exposes complexity uplifts (matches spec values)', () => {
    expect(COMPLEXITY_UPLIFTS.traffic.high).toBe(0.10)
    expect(COMPLEXITY_UPLIFTS.fitout.premium).toBe(0.10)
    expect(COMPLEXITY_UPLIFTS.access.hard).toBe(0.15)
  })

  it('exposes location uplift, deep clean multiplier, hourly cost, min hours', () => {
    expect(LOCATION_UPLIFT.cbd).toBe(0.10)
    expect(LOCATION_UPLIFT.remote).toBe(0.20)
    expect(DEEP_CLEAN_MULTIPLIER).toBe(1.5)
    expect(HOURLY_COST).toBe(45)
    expect(MINIMUM_HOURS).toBe(1.5)
    expect(SETUP_TIME).toBe(0.25)
    expect(TRAVEL_TIME.cbd).toBe(0.30)
    expect(FIXTURE_HOURS.bathroom).toBe(0.25)
    expect(PRODUCTION_RATES.warehouse.low).toBe(300)
  })
})

describe('commercialPricing — normaliseFrequency', () => {
  it('weekly: visits_per_month = visits × 4.33, effective = visits', () => {
    const r = normaliseFrequency('weekly', 2)
    expect(r.visits_per_month).toBeCloseTo(8.66, 2)
    expect(r.effective_visits_per_week).toBe(2)
  })

  it('fortnightly: visits_per_month = visits × 2.165, effective = visits / 2', () => {
    const r = normaliseFrequency('fortnightly', 1)
    expect(r.visits_per_month).toBeCloseTo(2.165, 3)
    expect(r.effective_visits_per_week).toBe(0.5)
  })

  it('monthly: visits_per_month = visits, effective = visits / 4.33', () => {
    const r = normaliseFrequency('monthly', 1)
    expect(r.visits_per_month).toBe(1)
    expect(r.effective_visits_per_week).toBeCloseTo(0.231, 3)
  })
})

describe('commercialPricing — band lookups', () => {
  it('frequencyMultiplier bands (0.80 / 0.85 / 0.90 / 0.95 / 1.00 / 1.15)', () => {
    expect(frequencyMultiplier(5)).toBe(0.80)
    expect(frequencyMultiplier(4)).toBe(0.85)
    expect(frequencyMultiplier(3)).toBe(0.90)
    expect(frequencyMultiplier(2)).toBe(0.95)
    expect(frequencyMultiplier(1)).toBe(1.00)
    expect(frequencyMultiplier(0.5)).toBe(1.15)
  })

  it('targetMargin bands (0.35 / 0.38 / 0.40 / 0.45 / 0.50 / 0.55)', () => {
    expect(targetMargin(5)).toBe(0.35)
    expect(targetMargin(3)).toBe(0.40)
    expect(targetMargin(0.5)).toBe(0.55)
  })

  it('minimumCharge bands (120 / 130 / 140 / 150 / 160 / 180)', () => {
    expect(minimumCharge(5)).toBe(120)
    expect(minimumCharge(3)).toBe(140)
    expect(minimumCharge(0.5)).toBe(180)
  })
})
