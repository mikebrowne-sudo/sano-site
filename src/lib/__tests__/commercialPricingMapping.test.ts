import { mapPricingMode } from '../commercialPricingMapping'

describe('mapPricingMode', () => {
  it('maps win_work -> win', () => {
    expect(mapPricingMode('win_work')).toBe('win')
  })
  it('maps make_money -> standard', () => {
    expect(mapPricingMode('make_money')).toBe('standard')
  })
  it('maps premium -> premium', () => {
    expect(mapPricingMode('premium')).toBe('premium')
  })
})

import { buildCommercialDescription } from '../commercialPricingMapping'
import type { CommercialInputs } from '../commercialPricing'

function descInputs(over: Partial<CommercialInputs> = {}): CommercialInputs {
  return {
    property_type: 'office',
    office_m2: 500,
    warehouse_m2: 0, retail_m2: 0, medical_m2: 0,
    location_type: 'suburban',
    bathrooms: 2, kitchens: 1,
    frequency_type: 'weekly',
    visits_per_period: 2,
    traffic_level: 'medium', fitout_level: 'standard', access_difficulty: 'easy',
    pricing_mode: 'make_money',
    ...over,
  }
}

describe('buildCommercialDescription', () => {
  it('single-property weekly x2 matches spec example', () => {
    const out = buildCommercialDescription(descInputs(), 'per_clean')
    expect(out).toBe('Commercial cleaning for a 500m² office with 2 bathrooms and 1 kitchen, serviced twice per week')
  })

  it('weekly 1/2/3/4/5/6/7 render as once / twice / three / four / five / six / daily', () => {
    const f = (v: number) => buildCommercialDescription(descInputs({ visits_per_period: v, bathrooms: 0, kitchens: 0 }), 'per_clean')
    expect(f(1)).toContain('once per week')
    expect(f(2)).toContain('twice per week')
    expect(f(3)).toContain('three times per week')
    expect(f(4)).toContain('four times per week')
    expect(f(5)).toContain('five times per week')
    expect(f(6)).toContain('six times per week')
    expect(f(7)).toContain('daily')
  })

  it('fortnightly renders as "every two weeks" (x1) and "twice per fortnight" (x2)', () => {
    expect(buildCommercialDescription(descInputs({ frequency_type: 'fortnightly', visits_per_period: 1, bathrooms: 0, kitchens: 0 }), 'per_clean'))
      .toContain('every two weeks')
    expect(buildCommercialDescription(descInputs({ frequency_type: 'fortnightly', visits_per_period: 2, bathrooms: 0, kitchens: 0 }), 'per_clean'))
      .toContain('twice per fortnight')
  })

  it('monthly 1/2/3 render as once / twice / 3 times per month', () => {
    const f = (v: number) => buildCommercialDescription(descInputs({ frequency_type: 'monthly', visits_per_period: v, bathrooms: 0, kitchens: 0 }), 'per_clean')
    expect(f(1)).toContain('once per month')
    expect(f(2)).toContain('twice per month')
    expect(f(3)).toContain('3 times per month')
  })

  it('mixed properties listed with "plus"', () => {
    const out = buildCommercialDescription(descInputs({ office_m2: 400, warehouse_m2: 100, bathrooms: 0, kitchens: 0 }), 'per_clean')
    expect(out).toContain('400m² office plus 100m² warehouse')
  })

  it('omits fixtures when both bathrooms and kitchens are zero', () => {
    const out = buildCommercialDescription(descInputs({ bathrooms: 0, kitchens: 0 }), 'per_clean')
    expect(out).not.toContain('bathrooms')
    expect(out).not.toContain('kitchen')
  })

  it('lists only the non-zero fixture when one is zero', () => {
    expect(buildCommercialDescription(descInputs({ bathrooms: 2, kitchens: 0 }), 'per_clean')).toContain('with 2 bathrooms')
    expect(buildCommercialDescription(descInputs({ bathrooms: 0, kitchens: 1 }), 'per_clean')).toContain('with 1 kitchen')
  })
})
