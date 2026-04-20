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
    const out = buildCommercialDescription(descInputs())
    expect(out).toBe('Commercial cleaning for a 500m² office with 2 bathrooms and 1 kitchen, serviced twice per week')
  })

  it('weekly 1/2/3/4/5/6/7 render as once / twice / three / four / five / six / daily', () => {
    const f = (v: number) => buildCommercialDescription(descInputs({ visits_per_period: v, bathrooms: 0, kitchens: 0 }))
    expect(f(1)).toContain('once per week')
    expect(f(2)).toContain('twice per week')
    expect(f(3)).toContain('three times per week')
    expect(f(4)).toContain('four times per week')
    expect(f(5)).toContain('five times per week')
    expect(f(6)).toContain('six times per week')
    expect(f(7)).toContain('daily')
  })

  it('fortnightly renders as "every two weeks" (x1) and "twice per fortnight" (x2)', () => {
    expect(buildCommercialDescription(descInputs({ frequency_type: 'fortnightly', visits_per_period: 1, bathrooms: 0, kitchens: 0 })))
      .toContain('every two weeks')
    expect(buildCommercialDescription(descInputs({ frequency_type: 'fortnightly', visits_per_period: 2, bathrooms: 0, kitchens: 0 })))
      .toContain('twice per fortnight')
  })

  it('monthly 1/2/3 render as once / twice / 3 times per month', () => {
    const f = (v: number) => buildCommercialDescription(descInputs({ frequency_type: 'monthly', visits_per_period: v, bathrooms: 0, kitchens: 0 }))
    expect(f(1)).toContain('once per month')
    expect(f(2)).toContain('twice per month')
    expect(f(3)).toContain('3 times per month')
  })

  it('mixed properties listed with "plus"', () => {
    const out = buildCommercialDescription(descInputs({ office_m2: 400, warehouse_m2: 100, bathrooms: 0, kitchens: 0 }))
    expect(out).toContain('400m² office plus 100m² warehouse')
  })

  it('omits fixtures when both bathrooms and kitchens are zero', () => {
    const out = buildCommercialDescription(descInputs({ bathrooms: 0, kitchens: 0 }))
    expect(out).not.toContain('bathrooms')
    expect(out).not.toContain('kitchen')
  })

  it('lists only the non-zero fixture when one is zero', () => {
    expect(buildCommercialDescription(descInputs({ bathrooms: 2, kitchens: 0 }))).toContain('with 2 bathrooms')
    expect(buildCommercialDescription(descInputs({ bathrooms: 0, kitchens: 1 }))).toContain('with 1 kitchen')
  })
})

import { buildQuoteItemsFromCalc, type CommercialCalculationRow } from '../commercialPricingMapping'

function calcRow(over: Partial<CommercialCalculationRow> = {}): CommercialCalculationRow {
  return {
    id: 'calc-1',
    pricing_mode: 'make_money',
    total_per_clean: 498,
    monthly_value: 4313.16,
    extras_breakdown: { windows: 0, carpet: 0, hard_floor: 0, deep_clean: 0 },
    selected_pricing_view: 'per_clean',
    estimated_hours: 6.2,
    inputs: {
      property_type: 'office',
      office_m2: 500, warehouse_m2: 0, retail_m2: 0, medical_m2: 0,
      location_type: 'suburban',
      bathrooms: 2, kitchens: 1,
      windows: 0, desks: 0, bins: 0,
      frequency_type: 'weekly', visits_per_period: 2,
      traffic_level: 'medium', fitout_level: 'standard', access_difficulty: 'easy',
      carpet_clean_m2: 0, hard_floor_m2: 0, deep_clean: false,
      pricing_mode: 'make_money',
    },
    ...over,
  }
}

describe('buildQuoteItemsFromCalc', () => {
  it('returns only the core line when no extras', () => {
    const items = buildQuoteItemsFromCalc(calcRow())
    expect(items).toHaveLength(1)
    expect(items[0]).toEqual({
      label: 'Commercial cleaning — recurring service',
      price: 498,
      sort_order: 0,
    })
  })

  it('uses monthly_value when selected_pricing_view is monthly', () => {
    const items = buildQuoteItemsFromCalc(calcRow({ selected_pricing_view: 'monthly' }))
    expect(items[0].price).toBe(4313.16)
  })

  it('adds extra rows for each non-zero extra with labels matching the spec', () => {
    const items = buildQuoteItemsFromCalc(calcRow({
      extras_breakdown: { windows: 80, carpet: 200, hard_floor: 150, deep_clean: 200 },
      inputs: {
        ...calcRow().inputs,
        windows: 10,
        carpet_clean_m2: 50,
        hard_floor_m2: 30,
        deep_clean: true,
      },
    }))
    expect(items).toHaveLength(5)
    expect(items[0]).toMatchObject({ label: 'Commercial cleaning — recurring service', sort_order: 0 })
    expect(items[1]).toEqual({ label: 'Window cleaning — 10 windows (one-off)', price: 80,  sort_order: 1 })
    expect(items[2]).toEqual({ label: 'Carpet cleaning — 50 m² (one-off)',       price: 200, sort_order: 2 })
    expect(items[3]).toEqual({ label: 'Hard floor treatment — 30 m² (one-off)',  price: 150, sort_order: 3 })
    expect(items[4]).toEqual({ label: 'Deep clean — additional uplift (one-off)',price: 200, sort_order: 4 })
  })

  it('omits extras whose breakdown is 0 even if input was set', () => {
    const items = buildQuoteItemsFromCalc(calcRow({
      extras_breakdown: { windows: 80, carpet: 0, hard_floor: 0, deep_clean: 0 },
      inputs: { ...calcRow().inputs, windows: 10 },
    }))
    expect(items).toHaveLength(2)
    expect(items[1].label).toBe('Window cleaning — 10 windows (one-off)')
  })

  it('defaults to per_clean when selected_pricing_view is null', () => {
    const items = buildQuoteItemsFromCalc(calcRow({ selected_pricing_view: null }))
    expect(items[0].price).toBe(498)
  })
})
