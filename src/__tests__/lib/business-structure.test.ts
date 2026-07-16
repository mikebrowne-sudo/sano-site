import { BUSINESS_STRUCTURES, businessStructureLabel } from '@/lib/business-structure'

describe('business-structure', () => {
  it('offers the five NZ options with stable stored values', () => {
    expect(BUSINESS_STRUCTURES.map((b) => b.value)).toEqual([
      'sole_trader', 'company', 'partnership', 'trust', 'other',
    ])
  })

  it('displays the legacy "company" value as a New Zealand limited company', () => {
    expect(businessStructureLabel('company')).toBe('New Zealand limited company')
  })

  it('labels the other known values in NZ terminology', () => {
    expect(businessStructureLabel('sole_trader')).toBe('Sole trader')
    expect(businessStructureLabel('partnership')).toBe('Partnership')
    expect(businessStructureLabel('trust')).toBe('Trust')
    expect(businessStructureLabel('other')).toBe('Other')
  })

  it('returns null for empty input and tidies unknown values', () => {
    expect(businessStructureLabel(null)).toBeNull()
    expect(businessStructureLabel(undefined)).toBeNull()
    expect(businessStructureLabel('')).toBeNull()
    expect(businessStructureLabel('some_legacy_value')).toBe('Some Legacy Value')
  })
})
