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

import { calculateCommercialPrice, type CommercialInputs } from '../commercialPricing'

function baseInputs(over: Partial<CommercialInputs> = {}): CommercialInputs {
  return {
    property_type: 'office',
    office_m2: 500,
    warehouse_m2: 0,
    retail_m2: 0,
    medical_m2: 0,
    location_type: 'suburban',
    bathrooms: 2,
    kitchens: 1,
    windows: 0,
    desks: 0,
    bins: 0,
    frequency_type: 'weekly',
    visits_per_period: 2,
    traffic_level: 'medium',
    fitout_level: 'standard',
    access_difficulty: 'easy',
    carpet_clean_m2: 0,
    hard_floor_m2: 0,
    deep_clean: false,
    pricing_mode: 'make_money',
    ...over,
  }
}

describe('calculateCommercialPrice — office, make_money, weekly x2', () => {
  const r = calculateCommercialPrice(baseInputs())

  it('returns all required fields', () => {
    expect(r).toHaveProperty('total_per_clean')
    expect(r).toHaveProperty('monthly_value')
    expect(r).toHaveProperty('estimated_hours')
    expect(r).toHaveProperty('estimated_cost')
    expect(r).toHaveProperty('profit')
    expect(r).toHaveProperty('margin')
    expect(r).toHaveProperty('effective_hourly_rate')
    expect(r).toHaveProperty('below_target_margin')
    expect(r).toHaveProperty('suggested_price')
    expect(r).toHaveProperty('minimum_applied')
    expect(r).toHaveProperty('pricing_status')
    expect(r).toHaveProperty('extras_total')
    expect(r).toHaveProperty('extras_breakdown')
  })

  it('computes core_subtotal = area_after + fixtures', () => {
    // area_base   = 500 * 0.80              = 400
    // freq_mul    = 0.95 (effWeekly=2)
    // complexity  = 1 + 0.05 + 0.05 + 0     = 1.10
    // location    = 1 + 0                   = 1.00
    // area_after  = 400 * 0.95 * 1.10 * 1   = 418.00
    // fixtures    = 2*30 + 1*20             = 80
    // core        = 498.00
    expect(r.total_per_clean).toBeCloseTo(498.00, 2)
  })

  it('extras are all zero when no extras chosen', () => {
    expect(r.extras_total).toBe(0)
    expect(r.extras_breakdown).toEqual({ windows: 0, carpet: 0, hard_floor: 0, deep_clean: 0 })
  })

  it('monthly_value = total_per_clean × visits_per_month (weekly × 2 = 8.66 visits/month)', () => {
    expect(r.monthly_value).toBeCloseTo(498.00 * 8.66, 1)
  })
})

describe('calculateCommercialPrice — minimum charge kicks in', () => {
  // tiny job: 20 m² office, weekly x1, win_work
  // area_base = 20 * 0.60 = 12
  // freq = 1.00, complexity = 1, location = 1 -> area_after = 12
  // fixtures = 0
  // core_subtotal = 12
  // min_charge (effWeekly=1) = 160
  const r = calculateCommercialPrice(baseInputs({
    office_m2: 20,
    bathrooms: 0,
    kitchens: 0,
    visits_per_period: 1,
    traffic_level: 'low',
    fitout_level: 'basic',
    pricing_mode: 'win_work',
  }))

  it('lifts total_per_clean to the minimum charge', () => {
    expect(r.total_per_clean).toBe(160)
    expect(r.minimum_applied).toBe(true)
  })
})

describe('calculateCommercialPrice — below_target_margin flag', () => {
  // heavy, cheap job: 2000 m² office, weekly x5, win_work
  // area_base = 2000 * 0.60 = 1200
  // freq = 0.80, complexity = 1 + 0 + 0 + 0 = 1.00, location = 1
  // area_after = 960; fixtures = 0 -> core = 960
  // area_hours: office+basic fitout -> rate 120 m²/hr; 2000/120 = 16.67
  // + setup 0.25 + travel 0.25 = 17.17 -> estimated_hours = 17.17
  // estimated_cost = 17.17 * 45 = 772.65
  // pre_min_margin = (960 - 772.65) / 960 = 0.195
  // target_margin at effWeekly=5 = 0.35 -> BELOW TARGET
  const r = calculateCommercialPrice(baseInputs({
    office_m2: 2000,
    bathrooms: 0,
    kitchens: 0,
    visits_per_period: 5,
    traffic_level: 'low',
    fitout_level: 'basic',
    pricing_mode: 'win_work',
  }))

  it('sets below_target_margin=true and emits a suggested_price', () => {
    expect(r.below_target_margin).toBe(true)
    expect(r.suggested_price).not.toBeNull()
    // suggested_price = estimated_cost / (1 - 0.35)
    expect(r.suggested_price!).toBeCloseTo(r.estimated_cost / 0.65, 1)
  })

  it('does not overwrite total_per_clean with suggested_price', () => {
    // total_per_clean stays at core (since min_charge 120 < 960)
    expect(r.total_per_clean).toBeCloseTo(960, 2)
  })
})

describe('calculateCommercialPrice — extras are one-off and do not leak into recurring metrics', () => {
  // baseline without extras
  const bare = calculateCommercialPrice(baseInputs())
  // same but with windows + carpet + hard floor + deep clean
  const withExtras = calculateCommercialPrice(baseInputs({
    windows: 10,
    carpet_clean_m2: 50,
    hard_floor_m2: 30,
    deep_clean: true,
  }))

  it('total_per_clean is identical with and without extras', () => {
    expect(withExtras.total_per_clean).toBeCloseTo(bare.total_per_clean, 2)
  })

  it('monthly_value is identical with and without extras', () => {
    expect(withExtras.monthly_value).toBeCloseTo(bare.monthly_value, 2)
  })

  it('estimated_hours is identical with and without extras', () => {
    expect(withExtras.estimated_hours).toBeCloseTo(bare.estimated_hours, 3)
  })

  it('populates extras_breakdown with spec-accurate flat rates', () => {
    expect(withExtras.extras_breakdown.windows).toBe(80)       // 10 * 8
    expect(withExtras.extras_breakdown.carpet).toBe(200)       // 50 * 4
    expect(withExtras.extras_breakdown.hard_floor).toBe(150)   // 30 * 5
  })

  it('deep_clean is priced as area_base × (1.5 - 1), not full 1.5×', () => {
    // baseInputs uses 500 m² office, make_money, so area_base = 400
    // deep_clean extra = 400 * 0.5 = 200
    expect(withExtras.extras_breakdown.deep_clean).toBeCloseTo(200, 2)
  })

  it('extras_total = sum of breakdown', () => {
    expect(withExtras.extras_total).toBeCloseTo(80 + 200 + 150 + 200, 2)
  })
})

describe('calculateCommercialPrice — mixed property types', () => {
  // 400 m² office + 100 m² warehouse, make_money, weekly x1
  // area_base = 400*0.80 + 100*0.50 = 320 + 50 = 370
  // freq = 1.00, complexity (mid/std/easy) = 1.10, location = 1
  // area_after = 370 * 1.10 = 407
  // fixtures = 60 (2 bathrooms) + 20 (1 kitchen) = 80
  // core = 487
  const r = calculateCommercialPrice(baseInputs({
    office_m2: 400,
    warehouse_m2: 100,
    visits_per_period: 1,
  }))

  it('sums per-type m² × base-rate correctly', () => {
    expect(r.total_per_clean).toBeCloseTo(487, 2)
  })

  it('sums per-type area_hours correctly', () => {
    // office 400/100 = 4.0, warehouse 100/300 = 0.333
    // fixture_hours = 2*0.25 + 1*0.20 = 0.70
    // travel + setup = 0.25 + 0.25 = 0.50
    // total = 5.533
    expect(r.estimated_hours).toBeCloseTo(5.533, 2)
  })
})

describe('calculateCommercialPrice — estimated_hours floors at MINIMUM_HOURS (1.5)', () => {
  // tiny office, basic fitout — raw hours would be < 1.5
  const r = calculateCommercialPrice(baseInputs({
    office_m2: 20,
    bathrooms: 0,
    kitchens: 0,
    fitout_level: 'basic',
    traffic_level: 'low',
  }))

  it('uses MINIMUM_HOURS when raw_hours is below 1.5', () => {
    expect(r.estimated_hours).toBe(1.5)
  })
})

describe('calculateCommercialPrice — pricing_status bands', () => {
  it('margin > 0.55 -> high_margin (premium mode, small job)', () => {
    const high = calculateCommercialPrice(baseInputs({ pricing_mode: 'premium', office_m2: 1000, visits_per_period: 1 }))
    expect(high.pricing_status).toBe('high_margin')
  })

  it('margin in [0.35, 0.55] -> healthy', () => {
    const healthy = calculateCommercialPrice(baseInputs({ pricing_mode: 'make_money' }))
    expect(healthy.pricing_status).toBe('healthy')
  })

  it('margin < 0.35 -> tight', () => {
    const tight = calculateCommercialPrice(baseInputs({
      pricing_mode: 'win_work',
      office_m2: 2000,
      visits_per_period: 5,
      traffic_level: 'low',
      fitout_level: 'basic',
    }))
    expect(tight.pricing_status).toBe('tight')
  })
})
