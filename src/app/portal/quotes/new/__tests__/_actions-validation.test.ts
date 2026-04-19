import { validateCreateQuoteOverride, type CreateQuoteOverridePayload } from '../_actions-validation'

function base(): CreateQuoteOverridePayload {
  return {
    is_price_overridden: false,
    override_price: null,
    override_reason: null,
    override_confirmed: false,
  }
}

describe('validateCreateQuoteOverride', () => {
  it('passes when override is off', () => {
    expect(validateCreateQuoteOverride(base())).toBeNull()
  })

  it('rejects override on with null price', () => {
    expect(validateCreateQuoteOverride({ ...base(), is_price_overridden: true, override_reason: 'x', override_confirmed: true }))
      .toMatch(/price/i)
  })

  it('rejects override on with non-positive price', () => {
    expect(validateCreateQuoteOverride({ ...base(), is_price_overridden: true, override_price: 0, override_reason: 'x', override_confirmed: true }))
      .toMatch(/price/i)
  })

  it('rejects override on with empty reason', () => {
    expect(validateCreateQuoteOverride({ ...base(), is_price_overridden: true, override_price: 100, override_reason: '   ', override_confirmed: true }))
      .toMatch(/reason/i)
  })

  it('rejects override on without confirmation', () => {
    expect(validateCreateQuoteOverride({ ...base(), is_price_overridden: true, override_price: 100, override_reason: 'x', override_confirmed: false }))
      .toMatch(/confirm/i)
  })

  it('passes when all override fields are valid', () => {
    expect(validateCreateQuoteOverride({ is_price_overridden: true, override_price: 250, override_reason: 'Customer negotiated', override_confirmed: true })).toBeNull()
  })
})
