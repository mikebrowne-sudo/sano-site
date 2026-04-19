import { validateOverride, type OverrideInput } from '../override-validation'

describe('validateOverride', () => {
  function base(): OverrideInput {
    return {
      is_price_overridden: false,
      override_price: '',
      override_reason: '',
      override_confirmed: false,
    }
  }

  it('returns no errors when override is off, regardless of other fields', () => {
    const errs = validateOverride({ ...base(), override_price: '0', override_reason: '' })
    expect(errs).toEqual({})
  })

  it('requires override_price > 0 when override is on', () => {
    const errs = validateOverride({ ...base(), is_price_overridden: true, override_price: '0', override_reason: 'x', override_confirmed: true })
    expect(errs.override_price).toBeDefined()
  })

  it('rejects negative override_price', () => {
    const errs = validateOverride({ ...base(), is_price_overridden: true, override_price: '-5', override_reason: 'x', override_confirmed: true })
    expect(errs.override_price).toBeDefined()
  })

  it('rejects empty or whitespace-only reason', () => {
    const errs = validateOverride({ ...base(), is_price_overridden: true, override_price: '100', override_reason: '   ', override_confirmed: true })
    expect(errs.override_reason).toBeDefined()
  })

  it('requires confirmation', () => {
    const errs = validateOverride({ ...base(), is_price_overridden: true, override_price: '100', override_reason: 'Customer negotiated', override_confirmed: false })
    expect(errs.override_confirmed).toBeDefined()
  })

  it('rejects price below $0.01', () => {
    const errs = validateOverride({ ...base(), is_price_overridden: true, override_price: '0.001', override_reason: 'x', override_confirmed: true })
    expect(errs.override_price).toBeDefined()
  })

  it('rejects price exceeding $99,999,999.99', () => {
    const errs = validateOverride({ ...base(), is_price_overridden: true, override_price: '100000000', override_reason: 'x', override_confirmed: true })
    expect(errs.override_price).toBeDefined()
  })

  it('rejects scientific notation that exceeds max via parseFloat', () => {
    const errs = validateOverride({ ...base(), is_price_overridden: true, override_price: '1e10', override_reason: 'x', override_confirmed: true })
    expect(errs.override_price).toBeDefined()
  })

  it('returns no errors when all required fields are valid', () => {
    const errs = validateOverride({
      is_price_overridden: true,
      override_price: '250',
      override_reason: 'Customer negotiated',
      override_confirmed: true,
    })
    expect(errs).toEqual({})
  })
})
