import { buildPricingLabel } from '../doc-helpers'

describe('buildPricingLabel', () => {
  it('falls back to "Service" when nothing is supplied', () => {
    expect(buildPricingLabel({})).toBe('Service')
  })

  it('uses property_category when set without type_of_clean', () => {
    expect(buildPricingLabel({ property_category: 'Residential' })).toBe('Residential clean')
  })

  it('uses type_of_clean and trims trailing "cleaning"', () => {
    expect(buildPricingLabel({ type_of_clean: 'deep cleaning' })).toBe('deep clean')
  })

  it('prefers service_description over the structured fields', () => {
    expect(buildPricingLabel({
      type_of_clean: 'regular cleaning',
      property_category: 'Residential',
      service_description: 'Two-bedroom end-of-tenancy clean',
    })).toBe('Two-bedroom end-of-tenancy clean')
  })

  it('uses only the first non-blank line of multi-line service_description', () => {
    expect(buildPricingLabel({
      service_description: '\n\n  End of tenancy clean — full property  \nIncludes oven and fridge\nCarpet steam clean',
    })).toBe('End of tenancy clean — full property')
  })

  it('falls back when service_description is whitespace only', () => {
    expect(buildPricingLabel({
      service_description: '   \n  \n',
      type_of_clean: 'regular cleaning',
    })).toBe('regular clean')
  })

  it('treats null service_description as absent', () => {
    expect(buildPricingLabel({
      service_description: null,
      property_category: 'Commercial',
    })).toBe('Commercial clean')
  })
})
