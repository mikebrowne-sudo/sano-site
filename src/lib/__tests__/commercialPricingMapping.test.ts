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
