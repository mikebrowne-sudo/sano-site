import {
  calculateQuotePrice,
  isPricingEligible,
  HOURLY_RATE,
  SERVICE_FEE,
  MIN_JOB_HOURS,
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
  it('exposes expected constants', () => {
    expect(HOURLY_RATE).toBe(65)
    expect(SERVICE_FEE).toBe(25)
    expect(MIN_JOB_HOURS).toBe(2.25)
  })
})

describe('isPricingEligible', () => {
  it('is true for the 10 eligible residential/PM/airbnb service types', () => {
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

describe('calculateQuotePrice — scenario 1: 3-bed / 2-bath Standard / well-maintained / Standard mode', () => {
  const result = calculateQuotePrice(baseInput, 'standard')

  it('is eligible', () => { expect(result.eligible).toBe(true) })
  it('rounded hours = 6.5', () => { expect(result.estimated_hours).toBe(6.5) })
  it('calculated price = $447.50', () => { expect(result.calculated_price).toBe(447.5) })
  it('final price equals calculated when no override', () => { expect(result.final_price).toBe(447.5) })
  it('override_flag is false', () => { expect(result.breakdown?.override_flag).toBe(false) })
  it('buffer is standard (15%)', () => { expect(result.breakdown?.buffer_percent).toBe(0.15) })
  it('bathroom_hours is 0.5', () => { expect(result.breakdown?.bathroom_hours).toBe(0.5) })
})

describe('calculateQuotePrice — scenario 2: Deep + build-up + oven + fridge + Premium', () => {
  const result = calculateQuotePrice({
    ...baseInput,
    service_type_code: 'deep_clean',
    condition_tags: ['build_up_present'],
    addons_wording: ['oven_clean', 'fridge_clean'],
  }, 'premium')

  it('rounded hours = 14.0', () => { expect(result.estimated_hours).toBe(14.0) })
  it('buffer is heavy (20%)', () => { expect(result.breakdown?.buffer_percent).toBe(0.20) })
  it('addon hours sum to 1.5', () => { expect(result.breakdown?.addon_hours).toBe(1.5) })
  it('calculated price = $1007.80', () => { expect(result.calculated_price).toBeCloseTo(1007.8, 2) })
})

describe('calculateQuotePrice — scenario 3: minimum-hours activation', () => {
  // 1-bed / 1-bath Airbnb Turnover / well-maintained → base 2.25 × 0.9 = 2.025 < MIN
  const result = calculateQuotePrice({
    service_category: 'airbnb',
    service_type_code: 'turnover',
    bedrooms: 1,
    bathrooms: 1,
    condition_tags: ['well_maintained'],
    addons_wording: [],
  }, 'standard')

  it('minimum was applied', () => { expect(result.breakdown?.min_applied).toBe(true) })
  it('rounded hours = 3.0', () => { expect(result.estimated_hours).toBe(3.0) })
  it('calculated price = $220.00', () => { expect(result.calculated_price).toBe(220) })
})

describe('calculateQuotePrice — scenario 4: 4-bed / 3-bath EOT / furnished / Win', () => {
  const result = calculateQuotePrice({
    service_category: 'property_management',
    service_type_code: 'end_of_tenancy',
    bedrooms: 4,
    bathrooms: 3,
    condition_tags: ['furnished_property'],
    addons_wording: [],
  }, 'win')

  it('rounded hours = 17.0', () => { expect(result.estimated_hours).toBe(17.0) })
  it('buffer is heavy (20%)', () => { expect(result.breakdown?.buffer_percent).toBe(0.20) })
  it('bathroom_hours is 1.0', () => { expect(result.breakdown?.bathroom_hours).toBe(1.0) })
  it('calculated price = $1041.60', () => { expect(result.calculated_price).toBeCloseTo(1041.6, 2) })
})

describe('calculateQuotePrice — scenario 5: commercial is ineligible', () => {
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

describe('calculateQuotePrice — scenario 6: 7-bed clamps to 5-bed', () => {
  const result = calculateQuotePrice({
    service_category: 'residential',
    service_type_code: 'standard_clean',
    bedrooms: 7,
    bathrooms: 2,
    condition_tags: ['well_maintained'],
    addons_wording: [],
  }, 'standard')

  it('bed_count_clamped is true', () => { expect(result.breakdown?.bed_count_clamped).toBe(true) })
  it('bed_count_used is 5', () => { expect(result.breakdown?.bed_count_used).toBe(5) })
  it('base_hours is 8.0', () => { expect(result.breakdown?.base_hours).toBe(8.0) })
  it('rounded hours = 10.0', () => { expect(result.estimated_hours).toBe(10.0) })
  it('calculated price = $675.00', () => { expect(result.calculated_price).toBe(675) })
})

describe('calculateQuotePrice — scenario 7: 0-bed falls back to 1-bed', () => {
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
  it('rounded hours = 3.0', () => { expect(result.estimated_hours).toBe(3.0) })
  it('calculated price = $220.00', () => { expect(result.calculated_price).toBe(220) })
})

describe('calculateQuotePrice — scenario 7b: null bedrooms falls back to 1-bed', () => {
  const result = calculateQuotePrice({
    service_category: 'residential',
    service_type_code: 'standard_clean',
    bedrooms: null,
    bathrooms: null,
    condition_tags: [],
    addons_wording: [],
  }, 'standard')

  it('bed_count_fallback is true', () => { expect(result.breakdown?.bed_count_fallback).toBe(true) })
  it('bathroom_hours is 0 (null bathrooms treated as 1)', () => { expect(result.breakdown?.bathroom_hours).toBe(0) })
})

describe('calculateQuotePrice — override behaviour', () => {
  it('applies override and sets override_flag when override differs from calculated', () => {
    const result = calculateQuotePrice(baseInput, 'standard', 500)
    expect(result.final_price).toBe(500)
    expect(result.calculated_price).toBe(447.5)
    expect(result.breakdown?.override_flag).toBe(true)
  })

  it('treats an override equal to calculated as NOT overridden', () => {
    const result = calculateQuotePrice(baseInput, 'standard', 447.5)
    expect(result.final_price).toBe(447.5)
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

describe('calculateQuotePrice — pricing mode multipliers', () => {
  it('Win reduces price by 8% (before fee)', () => {
    const win = calculateQuotePrice(baseInput, 'win').calculated_price!
    const std = calculateQuotePrice(baseInput, 'standard').calculated_price!
    // (std - SERVICE_FEE) * 0.92 + SERVICE_FEE = win
    expect(win).toBeCloseTo((std - SERVICE_FEE) * 0.92 + SERVICE_FEE, 2)
  })

  it('Premium raises price by 8% (before fee)', () => {
    const prem = calculateQuotePrice(baseInput, 'premium').calculated_price!
    const std = calculateQuotePrice(baseInput, 'standard').calculated_price!
    expect(prem).toBeCloseTo((std - SERVICE_FEE) * 1.08 + SERVICE_FEE, 2)
  })
})

describe('calculateQuotePrice — multiplicative condition stacking', () => {
  // Deep (1.6) × build_up (1.25) × furnished (1.10) on 3-bed / 2-bath
  const result = calculateQuotePrice({
    ...baseInput,
    service_type_code: 'deep_clean',
    condition_tags: ['build_up_present', 'furnished_property'],
    addons_wording: [],
  }, 'standard')
  // 4.75 × 1.6 × 1.25 × 1.10 = 10.45
  // + bathroom 0.5 = 10.95
  // × 1.20 buffer = 13.14
  // ceil 0.5 = 13.5
  // × 65 × 1.00 = 877.50 + 25 = 902.50

  it('stacks conditions multiplicatively', () => {
    expect(result.estimated_hours).toBe(13.5)
    expect(result.calculated_price).toBe(902.5)
  })

  it('breakdown records each condition adjustment', () => {
    const tags = result.breakdown?.condition_adjustments.map(a => a.tag)
    expect(tags).toEqual(expect.arrayContaining(['build_up_present', 'furnished_property']))
  })
})

describe('calculateQuotePrice — high_use is flat hours, not percent', () => {
  const withHighUse = calculateQuotePrice({
    ...baseInput,
    condition_tags: ['well_maintained', 'high_use_areas'],
  }, 'standard').breakdown!

  const withoutHighUse = calculateQuotePrice(baseInput, 'standard').breakdown!

  it('adds exactly 0.5 to high_use_hours', () => {
    expect(withHighUse.high_use_hours).toBe(0.5)
    expect(withoutHighUse.high_use_hours).toBe(0)
  })
})

describe('calculateQuotePrice — breakdown stores both calculated_price and final_price', () => {
  it('when not overridden, calculated_price === final_price', () => {
    const bd = calculateQuotePrice(baseInput, 'standard').breakdown!
    expect(bd.calculated_price).toBe(bd.final_price)
  })
  it('when overridden, both are present and distinct', () => {
    const bd = calculateQuotePrice(baseInput, 'standard', 999).breakdown!
    expect(bd.calculated_price).toBe(447.5)
    expect(bd.final_price).toBe(999)
  })
})
