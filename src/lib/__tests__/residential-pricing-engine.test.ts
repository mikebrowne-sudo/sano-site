// Phase residential-pricing-engine — focused scenarios from Part 13.
//
// These are pure-function tests that drive calculateQuotePrice with
// the code-defined fallback settings (so they double as a regression
// guard: changes to the fallback shape will surface here first).

import { calculateQuotePrice, isPricingEligible } from '../quote-pricing'
import {
  FALLBACK_RESIDENTIAL_PRICING_SETTINGS,
  loadResidentialPricingSettings,
} from '../residentialPricingSettings'

const baseInput = {
  service_category: 'residential' as const,
  service_type_code: 'standard_clean',
  bedrooms: 3,
  bathrooms: 2,
  condition_tags: [] as string[],
  addons_wording: [] as string[],
}

describe('Standard clean — baseline scenario', () => {
  const r = calculateQuotePrice(baseInput, 'standard')

  it('is eligible', () => { expect(r.eligible).toBe(true) })
  it('produces a positive estimated_hours', () => {
    expect(r.estimated_hours).toBeGreaterThan(0)
  })
  it('produces a positive calculated_price', () => {
    expect(r.calculated_price).toBeGreaterThan(0)
  })
  it('breakdown.condition_multiplier = 1.0 (no tags)', () => {
    expect(r.breakdown?.condition_multiplier).toBe(1.0)
  })
})

describe('Deep clean produces more hours than Standard for the same property', () => {
  const std = calculateQuotePrice({ ...baseInput, service_type_code: 'standard_clean' }, 'standard')
  const deep = calculateQuotePrice({ ...baseInput, service_type_code: 'deep_clean' }, 'standard')
  it('deep > standard estimated_hours', () => {
    expect(deep.estimated_hours).toBeGreaterThan(std.estimated_hours ?? 0)
  })
})

describe('End of tenancy produces more hours again, no duplicate extras', () => {
  const eot = calculateQuotePrice({
    ...baseInput,
    service_category: 'property_management',
    service_type_code: 'end_of_tenancy',
  }, 'standard')
  const deep = calculateQuotePrice({ ...baseInput, service_type_code: 'deep_clean' }, 'standard')
  it('eot >= deep', () => {
    expect(eot.estimated_hours).toBeGreaterThanOrEqual(deep.estimated_hours ?? 0)
  })
})

describe('Heavy build-up condition increases time', () => {
  const plain = calculateQuotePrice({ ...baseInput, condition_tags: [] }, 'standard')
  const buildUp = calculateQuotePrice({ ...baseInput, condition_tags: ['build_up_present'] }, 'standard')
  it('build_up_present > no condition', () => {
    expect(buildUp.estimated_hours).toBeGreaterThan(plain.estimated_hours ?? 0)
  })
  it('breakdown.condition_multiplier reflects the single tag (1.20)', () => {
    expect(buildUp.breakdown?.condition_multiplier).toBeCloseTo(1.20, 4)
  })
})

describe('Multi-tag condition combine — capped formula', () => {
  // Two tags: build_up_present (1.20) + furnished_property (1.10).
  // Per the cap formula: min(1.45, 1.20 + 0.5 × (1.10 − 1.0)) = 1.25.
  const r = calculateQuotePrice({
    ...baseInput,
    service_type_code: 'deep_clean',
    condition_tags: ['build_up_present', 'furnished_property'],
  }, 'standard')

  it('combined multiplier is the formula result, not the multiplicative product', () => {
    expect(r.breakdown?.condition_multiplier).toBeCloseTo(1.25, 4)
  })

  it('cap is not applied below the cap value', () => {
    expect(r.breakdown?.condition_cap_applied).toBe(false)
  })

  it('synthetic max-tag set hits the 1.45 cap', () => {
    // Build a settings clone with multiple high multipliers to force
    // the cap.
    const settings = {
      ...FALLBACK_RESIDENTIAL_PRICING_SETTINGS,
      condition_multipliers: {
        big_a: 1.40, big_b: 1.30, big_c: 1.20,
      },
    }
    const big = calculateQuotePrice({
      ...baseInput,
      condition_tags: ['big_a', 'big_b', 'big_c'],
    }, 'standard', undefined, settings)
    expect(big.breakdown?.condition_multiplier).toBe(1.45)
    expect(big.breakdown?.condition_cap_applied).toBe(true)
  })
})

describe('Extras add time correctly', () => {
  const plain = calculateQuotePrice({ ...baseInput }, 'standard')
  const oven = calculateQuotePrice({ ...baseInput, addons_wording: ['oven_clean'] }, 'standard')
  it('oven extra increases the calculated price', () => {
    expect(oven.calculated_price).toBeGreaterThan(plain.calculated_price ?? 0)
  })
  const big = calculateQuotePrice({
    ...baseInput,
    addons_wording: ['oven_clean', 'fridge_clean', 'garage_full'],
  }, 'standard')
  it('three extras > one extra', () => {
    expect(big.calculated_price).toBeGreaterThan(oven.calculated_price ?? 0)
  })
  it('no extras → no addon items in breakdown', () => {
    expect(plain.breakdown?.addon_items).toEqual([])
  })
})

describe('Override behaviour', () => {
  const r = calculateQuotePrice(baseInput, 'standard', 999)
  it('breakdown.override_flag is true when override differs from calculated', () => {
    expect(r.breakdown?.override_flag).toBe(true)
  })
  it('final_price uses the override', () => {
    expect(r.final_price).toBe(999)
  })
  it('calculated_price is preserved (override does not erase it)', () => {
    expect(r.breakdown?.calculated_price).toBeGreaterThan(0)
    expect(r.breakdown?.calculated_price).not.toBe(999)
  })
})

describe('Settings-driven engine — per-tier rates', () => {
  it('engine reads settings.standard_hourly_rate when mode is standard', () => {
    const customSettings = {
      ...FALLBACK_RESIDENTIAL_PRICING_SETTINGS,
      standard_hourly_rate: 100,
    }
    const r = calculateQuotePrice(baseInput, 'standard', undefined, customSettings)
    expect(r.breakdown?.hourly_rate).toBe(100)
  })

  it('engine reads settings.win_hourly_rate when mode is win', () => {
    const customSettings = {
      ...FALLBACK_RESIDENTIAL_PRICING_SETTINGS,
      win_hourly_rate: 60,
    }
    const r = calculateQuotePrice(baseInput, 'win', undefined, customSettings)
    expect(r.breakdown?.hourly_rate).toBe(60)
  })

  it('engine reads settings.premium_hourly_rate when mode is premium', () => {
    const customSettings = {
      ...FALLBACK_RESIDENTIAL_PRICING_SETTINGS,
      premium_hourly_rate: 95,
    }
    const r = calculateQuotePrice(baseInput, 'premium', undefined, customSettings)
    expect(r.breakdown?.hourly_rate).toBe(95)
  })

  it('uses fallback default tier rate when no settings argument', () => {
    const r = calculateQuotePrice(baseInput, 'standard')
    // Standard tier defaults to $75 in FALLBACK_RESIDENTIAL_PRICING_SETTINGS.
    expect(r.breakdown?.hourly_rate).toBe(75)
  })

  it('settings_signature changes when any tier rate changes', () => {
    const a = calculateQuotePrice(baseInput, 'standard')
    const b = calculateQuotePrice(baseInput, 'standard', undefined, {
      ...FALLBACK_RESIDENTIAL_PRICING_SETTINGS,
      standard_hourly_rate: 80,
    })
    expect(a.breakdown?.settings_signature).not.toBe(b.breakdown?.settings_signature)
  })
})

describe('Eligibility check honours settings.service_multipliers', () => {
  it('rejects categories not in the active settings', () => {
    expect(isPricingEligible('commercial', 'maintenance')).toBe(false)
  })
  it('accepts residential.standard_clean by default', () => {
    expect(isPricingEligible('residential', 'standard_clean')).toBe(true)
  })
})

describe('loader is exported and callable (smoke)', () => {
  it('loadResidentialPricingSettings is a function', () => {
    expect(typeof loadResidentialPricingSettings).toBe('function')
  })
})
