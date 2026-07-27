import { resolveTermsAsAt, supersedeDate, type PayTerms } from '@/lib/payroll/pay-terms'

const term = (over: Partial<PayTerms>): PayTerms => ({
  standardWeeklyHours: 20,
  hourlyRate: 30,
  workingPattern: null,
  payFrequency: 'weekly',
  payday: 'monday',
  basis: 'advance',
  effectiveFrom: '2026-07-27',
  effectiveTo: null,
  ...over,
})

describe('resolveTermsAsAt', () => {
  const v1 = term({ id: 'v1', hourlyRate: 30, effectiveFrom: '2026-07-27', effectiveTo: '2026-08-30' })
  const v2 = term({ id: 'v2', hourlyRate: 32, effectiveFrom: '2026-08-31', effectiveTo: null })
  const all = [v2, v1] // deliberately unordered

  it('returns the current (open-ended) version for a date in its range', () => {
    expect(resolveTermsAsAt(all, '2026-09-15')?.id).toBe('v2')
    expect(resolveTermsAsAt(all, '2026-08-31')?.id).toBe('v2') // boundary = effectiveFrom
  })

  it('returns the historical version for a date within its closed range', () => {
    expect(resolveTermsAsAt(all, '2026-07-27')?.id).toBe('v1') // boundary = effectiveFrom
    expect(resolveTermsAsAt(all, '2026-08-30')?.id).toBe('v1') // boundary = effectiveTo
    expect(resolveTermsAsAt(all, '2026-08-10')?.id).toBe('v1')
  })

  it('is null before any version starts', () => {
    expect(resolveTermsAsAt(all, '2026-07-01')).toBeNull()
  })

  it('is null inside a gap between versions', () => {
    const gapV1 = term({ id: 'g1', effectiveFrom: '2026-01-01', effectiveTo: '2026-03-31' })
    const gapV2 = term({ id: 'g2', effectiveFrom: '2026-06-01', effectiveTo: null })
    expect(resolveTermsAsAt([gapV1, gapV2], '2026-04-15')).toBeNull()
  })

  it('prefers the version with the latest effectiveFrom if ranges overlap', () => {
    const a = term({ id: 'a', effectiveFrom: '2026-07-01', effectiveTo: null })
    const b = term({ id: 'b', effectiveFrom: '2026-07-27', effectiveTo: null })
    expect(resolveTermsAsAt([a, b], '2026-08-01')?.id).toBe('b')
  })

  it('returns null for an empty set', () => {
    expect(resolveTermsAsAt([], '2026-08-01')).toBeNull()
  })
})

describe('supersedeDate (effective_to to stamp on the prior version)', () => {
  it('is the day before the new version takes effect', () => {
    expect(supersedeDate('2026-08-31')).toBe('2026-08-30')
  })
  it('handles month boundaries', () => {
    expect(supersedeDate('2026-08-01')).toBe('2026-07-31')
    expect(supersedeDate('2026-01-01')).toBe('2025-12-31')
  })
})
