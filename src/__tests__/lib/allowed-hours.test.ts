import { resolveAllowedHours } from '@/lib/allowed-hours'

describe('resolveAllowedHours', () => {
  it('keeps an explicit Allowed hours value', () => {
    expect(resolveAllowedHours(3, '4')).toBe(3)
    expect(resolveAllowedHours(2.5, null)).toBe(2.5)
  })

  it('falls back to a plain-number Duration estimate when Allowed hours is blank', () => {
    expect(resolveAllowedHours(null, '4')).toBe(4)
    expect(resolveAllowedHours(undefined, '2.5')).toBe(2.5)
    expect(resolveAllowedHours(null, '  5  ')).toBe(5)
  })

  it('does NOT parse free-text / ambiguous estimates', () => {
    expect(resolveAllowedHours(null, '3 hours')).toBeNull()
    expect(resolveAllowedHours(null, '2-3 hours')).toBeNull()
    expect(resolveAllowedHours(null, 'half day')).toBeNull()
    expect(resolveAllowedHours(null, '')).toBeNull()
    expect(resolveAllowedHours(null, null)).toBeNull()
  })

  it('ignores zero / negative values', () => {
    expect(resolveAllowedHours(0, '4')).toBe(4)   // 0 allowed → fall back to estimate
    expect(resolveAllowedHours(null, '0')).toBeNull()
    expect(resolveAllowedHours(-2, null)).toBeNull()
  })
})
