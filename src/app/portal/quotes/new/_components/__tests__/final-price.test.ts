import { computeFinalPrice } from '../final-price'

describe('computeFinalPrice', () => {
  it('returns engine final_price when override is off', () => {
    const result = computeFinalPrice({
      is_price_overridden: false,
      override_price: '',
      engineFinalPrice: 320,
      manualBasePrice: 0,
    })
    expect(result).toBe(320)
  })

  it('returns override_price when override is on (ignores engine and discount)', () => {
    const result = computeFinalPrice({
      is_price_overridden: true,
      override_price: '275',
      engineFinalPrice: 320,
      manualBasePrice: 0,
    })
    expect(result).toBe(275)
  })

  it('returns manualBasePrice when engine is null and override is off', () => {
    const result = computeFinalPrice({
      is_price_overridden: false,
      override_price: '',
      engineFinalPrice: null,
      manualBasePrice: 450,
    })
    expect(result).toBe(450)
  })

  it('returns 0 when override on but override_price is invalid', () => {
    const result = computeFinalPrice({
      is_price_overridden: true,
      override_price: '',
      engineFinalPrice: 320,
      manualBasePrice: 0,
    })
    expect(result).toBe(0)
  })

  it('discount preservation: returns engine price unchanged when override toggled off after being on', () => {
    const off = computeFinalPrice({ is_price_overridden: false, override_price: '275', engineFinalPrice: 320, manualBasePrice: 0 })
    expect(off).toBe(320)
  })
})
