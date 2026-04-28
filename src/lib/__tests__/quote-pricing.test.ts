import {
  calculateQuotePrice,
  isPricingEligible,
  HOURLY_RATES,
  HOURLY_RATE_WIN,
  HOURLY_RATE_STANDARD,
  HOURLY_RATE_PREMIUM,
  SERVICE_FEE,
  MIN_JOB_HOURS,
  BUFFER_STANDARD,
  BUFFER_HEAVY,
} from '../quote-pricing'
import type { PricingInput } from '../quote-pricing'

const baseInput: PricingInput = {
  service_category: 'residential',
  service_type_code: 'standard_clean',
  bedrooms: 3,
  bathrooms: 2,
  condition_tags: ['well_maintained'],
  addons_wording: [],
}

describe('quote-pricing — constants', () => {
  it('exposes per-mode hourly rates and service fee', () => {
    expect(HOURLY_RATE_WIN).toBe(65)
    expect(HOURLY_RATE_STANDARD).toBe(75)
    expect(HOURLY_RATE_PREMIUM).toBe(82)
    expect(HOURLY_RATES.win).toBe(65)
    expect(HOURLY_RATES.standard).toBe(75)
    expect(HOURLY_RATES.premium).toBe(82)
    expect(SERVICE_FEE).toBe(25)
  })

  it('exposes MIN_JOB_HOURS (2.0) and BUFFER constants (0.05, 0.08)', () => {
    expect(MIN_JOB_HOURS).toBe(2.0)
    expect(BUFFER_STANDARD).toBe(0.05)
    expect(BUFFER_HEAVY).toBe(0.08)
  })
})

describe('isPricingEligible', () => {
  it('is true for all 10 eligible residential/PM/airbnb service types', () => {
    const eligible: Array<[string, string]> = [
      ['residential', 'standard_clean'],
      ['residential', 'deep_clean'],
      ['residential', 'move_in_out'],
      ['residential', 'pre_sale'],
      ['property_management', 'routine'],
      ['property_management', 'end_of_tenancy'],
      ['property_management', 'pre_inspection'],
      ['property_management', 'handover'],
      ['airbnb', 'turnover'],
      ['airbnb', 'deep_reset'],
    ]
    for (const [cat, code] of eligible) {
      expect(isPricingEligible(cat as never, code)).toBe(true)
    }
  })

  it('is false for any commercial type', () => {
    for (const code of ['maintenance', 'detailed', 'initial', 'one_off_deep']) {
      expect(isPricingEligible('commercial', code)).toBe(false)
    }
  })

  it('is false when category or service type is missing', () => {
    expect(isPricingEligible(null, 'standard_clean')).toBe(false)
    expect(isPricingEligible('residential', null)).toBe(false)
    expect(isPricingEligible(null, null)).toBe(false)
  })
})

// ============================================================
// Canonical scenarios — values locked in spec section 3.10
// ============================================================

describe('Canonical A: 1-bed / 1-bath Standard Residential / no conditions / Win', () => {
  const result = calculateQuotePrice({
    service_category: 'residential',
    service_type_code: 'standard_clean',
    bedrooms: 1,
    bathrooms: 1,
    condition_tags: [],
    addons_wording: [],
  }, 'win')

  it('final_hours = 2.5', () => { expect(result.estimated_hours).toBe(2.5) })
  it('calculated_price = $187.50', () => { expect(result.calculated_price).toBe(187.5) })
  it('buffer is standard (5%)', () => { expect(result.breakdown?.buffer_percent).toBe(0.05) })
  it('hourly_rate = 65 (win)', () => { expect(result.breakdown?.hourly_rate).toBe(65) })
  it('frequency_multiplier = 1.0 (default)', () => { expect(result.breakdown?.frequency_multiplier).toBe(1.0) })
})

describe('Canonical B: 3-bed / 2-bath Standard Residential / no conditions / Win', () => {
  const result = calculateQuotePrice({
    service_category: 'residential',
    service_type_code: 'standard_clean',
    bedrooms: 3,
    bathrooms: 2,
    condition_tags: [],
    addons_wording: [],
  }, 'win')

  it('final_hours = 4.5', () => { expect(result.estimated_hours).toBe(4.5) })
  it('calculated_price = $317.50', () => { expect(result.calculated_price).toBe(317.5) })
  it('bathroom_hours = 0.5', () => { expect(result.breakdown?.bathroom_hours).toBe(0.5) })
})

describe('Canonical C: 4-bed / 2-bath Deep Residential / no conditions / Win', () => {
  const result = calculateQuotePrice({
    service_category: 'residential',
    service_type_code: 'deep_clean',
    bedrooms: 4,
    bathrooms: 2,
    condition_tags: [],
    addons_wording: [],
  }, 'win')

  it('final_hours = 9.5', () => { expect(result.estimated_hours).toBe(9.5) })
  it('calculated_price = $642.50', () => { expect(result.calculated_price).toBe(642.5) })
  it('buffer is heavy (8%)', () => { expect(result.breakdown?.buffer_percent).toBe(0.08) })
  it('service_multiplier = 1.6', () => { expect(result.breakdown?.service_multiplier).toBe(1.6) })
})

describe('Canonical D: 4-bed / 2-bath Standard Residential / no conditions / Win / one-off', () => {
  // 5.0 × 1.0 × 1.0 + 0.5 = 5.5 → × freq 1.0 = 5.5 → max(2.0, 5.5) = 5.5
  // × 1.05 = 5.775 → ceil 0.5 = 6.0 → × $65 + $25 = $415.00
  const result = calculateQuotePrice({
    service_category: 'residential',
    service_type_code: 'standard_clean',
    bedrooms: 4,
    bathrooms: 2,
    condition_tags: [],
    addons_wording: [],
  }, 'win')

  it('final_hours = 6.0', () => { expect(result.estimated_hours).toBe(6.0) })
  it('calculated_price = $415.00', () => { expect(result.calculated_price).toBe(415) })
  it('buffer is standard (5%)', () => { expect(result.breakdown?.buffer_percent).toBe(0.05) })
  it('bathroom_hours = 0.5', () => { expect(result.breakdown?.bathroom_hours).toBe(0.5) })
})

describe('Canonical E: 3-bed / 2-bath Standard Residential / weekly / Win', () => {
  // 3.5 × 1.0 × 1.0 + 0.5 = 4.0 → × freq 0.75 = 3.0 → max(2.0, 3.0) = 3.0
  // × 1.05 = 3.15 → ceil 0.5 = 3.5 → × $65 + $25 = $252.50
  const result = calculateQuotePrice({
    service_category: 'residential',
    service_type_code: 'standard_clean',
    bedrooms: 3,
    bathrooms: 2,
    condition_tags: [],
    addons_wording: [],
    frequency: 'weekly',
  }, 'win')

  it('final_hours = 3.5', () => { expect(result.estimated_hours).toBe(3.5) })
  it('calculated_price = $252.50', () => { expect(result.calculated_price).toBe(252.5) })
  it('frequency_multiplier = 0.75', () => { expect(result.breakdown?.frequency_multiplier).toBe(0.75) })
  it('min_applied = false (post-frequency hours 3.0 >= MIN 2.0)', () => { expect(result.breakdown?.min_applied).toBe(false) })
})

// ============================================================
// Broader scenario coverage
// ============================================================

describe('Scenario: 3-bed / 2-bath Standard / well-maintained / Standard mode', () => {
  const result = calculateQuotePrice(baseInput, 'standard')

  it('is eligible', () => { expect(result.eligible).toBe(true) })
  it('final_hours = 4.5', () => { expect(result.estimated_hours).toBe(4.5) })
  it('calculated_price = $362.50', () => { expect(result.calculated_price).toBe(362.5) })
  it('final_price equals calculated when no override', () => { expect(result.final_price).toBe(362.5) })
  it('override_flag is false', () => { expect(result.breakdown?.override_flag).toBe(false) })
  it('buffer is standard (5%)', () => { expect(result.breakdown?.buffer_percent).toBe(0.05) })
  it('hourly_rate = 75 (standard mode)', () => { expect(result.breakdown?.hourly_rate).toBe(75) })
})

describe('Scenario: 3-bed / 2-bath Deep + build-up + oven + fridge / Premium', () => {
  const result = calculateQuotePrice({
    ...baseInput,
    service_type_code: 'deep_clean',
    condition_tags: ['build_up_present'],
    addons_wording: ['oven_clean', 'fridge_clean'],
  }, 'premium')

  it('final_hours = 9.5', () => { expect(result.estimated_hours).toBe(9.5) })
  it('buffer is heavy (8%)', () => { expect(result.breakdown?.buffer_percent).toBe(0.08) })
  it('addon_hours = 1.5', () => { expect(result.breakdown?.addon_hours).toBe(1.5) })
  it('hourly_rate = 82 (premium mode)', () => { expect(result.breakdown?.hourly_rate).toBe(82) })
  it('calculated_price = $804.00', () => { expect(result.calculated_price).toBeCloseTo(804, 2) })
})

describe('Scenario: 1-bed Airbnb Turnover / well-maintained / Standard', () => {
  // Phase residential-pricing-tweaks: airbnb.turnover multiplier
  // normalised from 0.9 → 1.0. The job no longer dips below the
  // minimum-hours floor at 1 bed; pre_buffer matches the natural
  // hours total, not the floor.
  // 2.0 × 1.0 × 1.0 = 2.0 → × freq 1.0 = 2.0 → max(2.0, 2.0) = 2.0
  // × 1.05 = 2.10 → ceil 0.5 = 2.5 → × $75 + $25 = $212.50
  const result = calculateQuotePrice({
    service_category: 'airbnb',
    service_type_code: 'turnover',
    bedrooms: 1,
    bathrooms: 1,
    condition_tags: ['well_maintained'],
    addons_wording: [],
  }, 'standard')

  it('minimum is NOT applied (hours land exactly on the floor)', () => {
    expect(result.breakdown?.min_applied).toBe(false)
  })
  it('final_hours = 2.5', () => { expect(result.estimated_hours).toBe(2.5) })
  it('calculated_price = $212.50', () => { expect(result.calculated_price).toBe(212.5) })
  it('pre_buffer_hours = 2.0', () => { expect(result.breakdown?.pre_buffer_hours).toBe(2.0) })
  it('service_multiplier = 1.0 (post-normalisation)', () => {
    expect(result.breakdown?.service_multiplier).toBe(1.0)
  })
})

describe('Scenario: 4-bed / 3-bath PM End-of-Tenancy / furnished / Win', () => {
  // 5.0 × 1.65 × 1.10 = 9.075 → + 1.0 bath = 10.075 → × freq 1.0 = 10.075
  // max(2.0, 10.075) = 10.075 → × 1.08 = 10.881 → ceil 0.5 = 11.0
  // × $65 + $25 = $740.00
  const result = calculateQuotePrice({
    service_category: 'property_management',
    service_type_code: 'end_of_tenancy',
    bedrooms: 4,
    bathrooms: 3,
    condition_tags: ['furnished_property'],
    addons_wording: [],
  }, 'win')

  it('final_hours = 11.0', () => { expect(result.estimated_hours).toBe(11.0) })
  it('buffer is heavy (8%)', () => { expect(result.breakdown?.buffer_percent).toBe(0.08) })
  it('bathroom_hours = 1.0', () => { expect(result.breakdown?.bathroom_hours).toBe(1.0) })
  it('service_multiplier = 1.65', () => { expect(result.breakdown?.service_multiplier).toBe(1.65) })
  it('calculated_price = $740.00', () => { expect(result.calculated_price).toBe(740) })
})

describe('Scenario: commercial is ineligible', () => {
  const result = calculateQuotePrice({
    service_category: 'commercial',
    service_type_code: 'maintenance',
    bedrooms: null,
    bathrooms: null,
    condition_tags: [],
    addons_wording: [],
  }, 'standard')

  it('eligible is false', () => { expect(result.eligible).toBe(false) })
  it('all result numbers are null', () => {
    expect(result.estimated_hours).toBeNull()
    expect(result.calculated_price).toBeNull()
    expect(result.final_price).toBeNull()
    expect(result.breakdown).toBeNull()
  })
})

describe('Scenario: 7-bed clamps to 6-bed', () => {
  // 7.5 × 1.0 × 1.0 + 0.5 = 8.0 → × 1.0 = 8.0 → max(2.0, 8.0) = 8.0
  // × 1.05 = 8.40 → ceil 0.5 = 8.5 → × $75 + $25 = $662.50
  const result = calculateQuotePrice({
    service_category: 'residential',
    service_type_code: 'standard_clean',
    bedrooms: 7,
    bathrooms: 2,
    condition_tags: ['well_maintained'],
    addons_wording: [],
  }, 'standard')

  it('bed_count_clamped is true', () => { expect(result.breakdown?.bed_count_clamped).toBe(true) })
  it('bed_count_used is 6', () => { expect(result.breakdown?.bed_count_used).toBe(6) })
  it('base_hours is 7.5', () => { expect(result.breakdown?.base_hours).toBe(7.5) })
  it('final_hours = 8.5', () => { expect(result.estimated_hours).toBe(8.5) })
  it('calculated_price = $662.50', () => { expect(result.calculated_price).toBe(662.5) })
})

describe('Scenario: 0-bed falls back to 1-bed', () => {
  // 2.0 × 1.0 × 1.0 + 0 = 2.0 → × 1.0 = 2.0 → max(2.0, 2.0) = 2.0 (min_applied = false)
  // × 1.05 = 2.10 → ceil 0.5 = 2.5 → × $75 + $25 = $212.50
  const result = calculateQuotePrice({
    service_category: 'residential',
    service_type_code: 'standard_clean',
    bedrooms: 0,
    bathrooms: 1,
    condition_tags: ['well_maintained'],
    addons_wording: [],
  }, 'standard')

  it('bed_count_fallback is true', () => { expect(result.breakdown?.bed_count_fallback).toBe(true) })
  it('bed_count_used is 1', () => { expect(result.breakdown?.bed_count_used).toBe(1) })
  it('final_hours = 2.5', () => { expect(result.estimated_hours).toBe(2.5) })
  it('calculated_price = $212.50', () => { expect(result.calculated_price).toBe(212.5) })
})

describe('Scenario: null bedrooms falls back to 1-bed; null bathrooms treated as 1', () => {
  const result = calculateQuotePrice({
    service_category: 'residential',
    service_type_code: 'standard_clean',
    bedrooms: null,
    bathrooms: null,
    condition_tags: [],
    addons_wording: [],
  }, 'standard')

  it('bed_count_fallback is true', () => { expect(result.breakdown?.bed_count_fallback).toBe(true) })
  it('bathroom_hours = 0 (null bathrooms treated as 1)', () => { expect(result.breakdown?.bathroom_hours).toBe(0) })
})

// ============================================================
// Override behaviour
// ============================================================

describe('Override behaviour', () => {
  it('applies override and sets override_flag when different from calculated', () => {
    const result = calculateQuotePrice(baseInput, 'standard', 500)
    expect(result.final_price).toBe(500)
    expect(result.calculated_price).toBe(362.5)
    expect(result.breakdown?.override_flag).toBe(true)
  })

  it('treats an override equal to calculated as NOT overridden', () => {
    const result = calculateQuotePrice(baseInput, 'standard', 362.5)
    expect(result.final_price).toBe(362.5)
    expect(result.breakdown?.override_flag).toBe(false)
  })

  it('ignores override when ineligible', () => {
    const result = calculateQuotePrice({
      service_category: 'commercial',
      service_type_code: 'maintenance',
      bedrooms: null, bathrooms: null, condition_tags: [], addons_wording: [],
    }, 'standard', 500)
    expect(result.final_price).toBeNull()
  })
})

// ============================================================
// Pricing mode = direct hourly rate selection (no post-multiplier)
// ============================================================

describe('Pricing mode selects hourly rate directly', () => {
  // Same billable hours for all three modes (4.5) — price difference is purely the rate.
  const win = calculateQuotePrice(baseInput, 'win')
  const std = calculateQuotePrice(baseInput, 'standard')
  const prem = calculateQuotePrice(baseInput, 'premium')

  it('Win uses $65/hr', () => {
    expect(win.breakdown?.hourly_rate).toBe(65)
    expect(win.calculated_price).toBe(4.5 * 65 + 25)       // 317.50
  })

  it('Standard uses $75/hr', () => {
    expect(std.breakdown?.hourly_rate).toBe(75)
    expect(std.calculated_price).toBe(4.5 * 75 + 25)       // 362.50
  })

  it('Premium uses $82/hr', () => {
    expect(prem.breakdown?.hourly_rate).toBe(82)
    expect(prem.calculated_price).toBe(4.5 * 82 + 25)      // 394.00
  })

  it('pricing_mode_multiplier is always 1.0 post-revision (kept for UI legacy field access)', () => {
    expect(win.breakdown?.pricing_mode_multiplier).toBe(1.0)
    expect(std.breakdown?.pricing_mode_multiplier).toBe(1.0)
    expect(prem.breakdown?.pricing_mode_multiplier).toBe(1.0)
  })
})

// ============================================================
// Multiplicative condition stacking
// ============================================================

describe('Condition adjustments — capped combine formula', () => {
  // Phase residential-pricing-engine: combined condition multiplier
  // is now min(cap, m1 + 0.5 × Σ(m_i − 1.0) for i ≥ 2). Cap = 1.45.
  //
  // 3-bed / 2-bath Deep (1.6) × condition combined (1.25), standard mode
  //   m1 = 1.20 (build_up_present), m2 = 1.10 (furnished_property)
  //   combined = 1.20 + 0.5 × (1.10 − 1.0) = 1.25  (cap not reached)
  // 3.5 × 1.6 × 1.25 = 7.0 → + 0.5 bath = 7.5 → × freq 1.0 = 7.5
  // max(2.0, 7.5) = 7.5 → × 1.08 heavy = 8.10 → ceil 0.5 = 8.5
  // × $75 + $25 = $662.50
  const result = calculateQuotePrice({
    ...baseInput,
    service_type_code: 'deep_clean',
    condition_tags: ['build_up_present', 'furnished_property'],
  }, 'standard')

  it('condition_multiplier = 1.25 (cap formula, not multiplicative)', () => {
    expect(result.breakdown?.condition_multiplier).toBeCloseTo(1.25, 4)
  })
  it('condition_cap_applied is false (1.25 < 1.45)', () => {
    expect(result.breakdown?.condition_cap_applied).toBe(false)
  })
  it('final_hours = 8.5', () => { expect(result.estimated_hours).toBe(8.5) })
  it('calculated_price = $662.50', () => { expect(result.calculated_price).toBe(662.5) })
  it('breakdown records each condition adjustment', () => {
    const tags = result.breakdown?.condition_adjustments.map(a => a.tag)
    expect(tags).toEqual(expect.arrayContaining(['build_up_present', 'furnished_property']))
  })
})

// ============================================================
// high_use_areas is flat hours (not percent)
// ============================================================

describe('high_use_areas is flat hours, not percent', () => {
  const withHighUse = calculateQuotePrice({
    ...baseInput,
    condition_tags: ['well_maintained', 'high_use_areas'],
  }, 'standard').breakdown!

  const withoutHighUse = calculateQuotePrice(baseInput, 'standard').breakdown!

  it('adds exactly 0.5 to high_use_hours', () => {
    expect(withHighUse.high_use_hours).toBe(0.5)
    expect(withoutHighUse.high_use_hours).toBe(0)
  })

  it('records high_use_areas as an "hours" adjustment in breakdown', () => {
    const note = withHighUse.condition_adjustments.find(a => a.tag === 'high_use_areas')
    expect(note?.type).toBe('hours')
    expect(note?.value).toBe(0.5)
  })
})

// ============================================================
// Frequency multiplier
// ============================================================

describe('Frequency multiplier mapping', () => {
  function freqMultiplierOf(frequency: string | null | undefined, xPerWeek?: number) {
    return calculateQuotePrice({
      ...baseInput,
      frequency: frequency ?? null,
      x_per_week: xPerWeek ?? null,
    }, 'standard').breakdown!.frequency_multiplier
  }

  it('one_off → 1.0', () => { expect(freqMultiplierOf('one_off')).toBe(1.0) })
  it('monthly → 1.0', () => { expect(freqMultiplierOf('monthly')).toBe(1.0) })
  it('weekly → 0.75', () => { expect(freqMultiplierOf('weekly')).toBe(0.75) })
  it('fortnightly → 0.85', () => { expect(freqMultiplierOf('fortnightly')).toBe(0.85) })
  it('x_per_week count=1 → 0.75', () => { expect(freqMultiplierOf('x_per_week', 1)).toBe(0.75) })
  it('x_per_week count=2 → 0.60', () => { expect(freqMultiplierOf('x_per_week', 2)).toBe(0.60) })
  it('x_per_week count=3 → 0.50', () => { expect(freqMultiplierOf('x_per_week', 3)).toBe(0.50) })
  it('x_per_week count=5 → 0.50', () => { expect(freqMultiplierOf('x_per_week', 5)).toBe(0.50) })
  it('null / empty / undefined → 1.0', () => {
    expect(freqMultiplierOf(null)).toBe(1.0)
    expect(freqMultiplierOf(undefined)).toBe(1.0)
    expect(freqMultiplierOf('')).toBe(1.0)
  })
  it('unknown frequency key → 1.0', () => {
    expect(freqMultiplierOf('bogus')).toBe(1.0)
  })
})

describe('Frequency: minimum floor applies AFTER frequency discount', () => {
  // 1×1 Airbnb Turnover / weekly / Standard
  // 2.0 × 1.0 × 1.0 = 2.0 → × 0.75 weekly = 1.5 → max(2.0, 1.5) = 2.0 (min_applied=true)
  // × 1.05 = 2.10 → ceil 0.5 = 2.5 → × $75 + $25 = $212.50
  const result = calculateQuotePrice({
    service_category: 'airbnb',
    service_type_code: 'turnover',
    bedrooms: 1,
    bathrooms: 1,
    condition_tags: ['well_maintained'],
    addons_wording: [],
    frequency: 'weekly',
  }, 'standard')

  it('frequency_multiplier = 0.75', () => { expect(result.breakdown?.frequency_multiplier).toBe(0.75) })
  it('min_applied = true', () => { expect(result.breakdown?.min_applied).toBe(true) })
  it('pre_buffer_hours = 2.0 (min floor)', () => { expect(result.breakdown?.pre_buffer_hours).toBe(2.0) })
  it('final_hours = 2.5', () => { expect(result.estimated_hours).toBe(2.5) })
  it('calculated_price = $212.50', () => { expect(result.calculated_price).toBe(212.5) })
})

describe('Frequency: fortnightly reduces billable hours', () => {
  // 3×2 Standard / fortnightly / Standard
  // 3.5 × 1.0 × 1.0 + 0.5 = 4.0 → × 0.85 = 3.40 → max(2.0, 3.40) = 3.40
  // × 1.05 = 3.57 → ceil 0.5 = 4.0 → × $75 + $25 = $325.00
  const result = calculateQuotePrice({
    ...baseInput,
    condition_tags: [],
    frequency: 'fortnightly',
  }, 'standard')

  it('frequency_multiplier = 0.85', () => { expect(result.breakdown?.frequency_multiplier).toBe(0.85) })
  it('final_hours = 4.0', () => { expect(result.estimated_hours).toBe(4.0) })
  it('calculated_price = $325.00', () => { expect(result.calculated_price).toBe(325) })
})

describe('Frequency: x_per_week=2 reduces billable further', () => {
  // 3×2 Standard / 2×/week / Standard
  // 4.0 × 0.60 = 2.40 → max(2.0, 2.40) = 2.40 → × 1.05 = 2.52 → ceil 0.5 = 3.0
  // × $75 + $25 = $250.00
  const result = calculateQuotePrice({
    ...baseInput,
    condition_tags: [],
    frequency: 'x_per_week',
    x_per_week: 2,
  }, 'standard')

  it('frequency_multiplier = 0.60', () => { expect(result.breakdown?.frequency_multiplier).toBe(0.60) })
  it('final_hours = 3.0', () => { expect(result.estimated_hours).toBe(3.0) })
  it('calculated_price = $250.00', () => { expect(result.calculated_price).toBe(250) })
})

// ============================================================
// 6-bed without clamp
// ============================================================

describe('6-bed is the maximum natural value (no clamp)', () => {
  const result = calculateQuotePrice({
    service_category: 'residential',
    service_type_code: 'standard_clean',
    bedrooms: 6,
    bathrooms: 1,
    condition_tags: [],
    addons_wording: [],
  }, 'standard')

  it('bed_count_used = 6', () => { expect(result.breakdown?.bed_count_used).toBe(6) })
  it('bed_count_clamped = false', () => { expect(result.breakdown?.bed_count_clamped).toBe(false) })
  it('base_hours = 7.5', () => { expect(result.breakdown?.base_hours).toBe(7.5) })
})

// ============================================================
// Breakdown: legacy + new field-name parity
// ============================================================

describe('Breakdown exposes both UI-legacy and new spec field names with identical values', () => {
  const bd = calculateQuotePrice(baseInput, 'standard').breakdown!

  it('rounded_hours === final_hours', () => { expect(bd.rounded_hours).toBe(bd.final_hours) })
  it('hourly_rate === hourly_rate_used', () => { expect(bd.hourly_rate).toBe(bd.hourly_rate_used) })
  it('service_type_multiplier === service_multiplier', () => { expect(bd.service_type_multiplier).toBe(bd.service_multiplier) })
})

describe('Breakdown stores both calculated_price and final_price', () => {
  it('when not overridden, calculated_price === final_price', () => {
    const bd = calculateQuotePrice(baseInput, 'standard').breakdown!
    expect(bd.calculated_price).toBe(bd.final_price)
  })

  it('when overridden, both are present and distinct', () => {
    const bd = calculateQuotePrice(baseInput, 'standard', 999).breakdown!
    expect(bd.calculated_price).toBe(362.5)
    expect(bd.final_price).toBe(999)
  })
})
