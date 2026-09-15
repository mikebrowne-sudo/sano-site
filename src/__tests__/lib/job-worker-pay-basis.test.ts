import {
  payBasisOf,
  isPayablePerOccurrence,
  isSetAmountPerVisit,
  isHoursIndependent,
  payBasisLabel,
} from '@/lib/job-worker-pay-basis'

describe('payBasisOf', () => {
  it('maps the three known bases', () => {
    expect(payBasisOf('hourly')).toBe('hourly')
    expect(payBasisOf('per_visit')).toBe('per_visit')
    expect(payBasisOf('fixed')).toBe('fixed')
  })

  it('treats null / unknown as hourly (the historical default)', () => {
    expect(payBasisOf(null)).toBe('hourly')
    expect(payBasisOf(undefined)).toBe('hourly')
    expect(payBasisOf('')).toBe('hourly')
    expect(payBasisOf('something_new')).toBe('hourly')
  })
})

describe('isPayablePerOccurrence — the distinction that was missing', () => {
  it('a RETAINER is not payable per occurrence', () => {
    // Myrtle's Pukekohe contract: $1,500/month, cleans not separately paid.
    // Approving an occurrence would pay her twice.
    expect(isPayablePerOccurrence('fixed')).toBe(false)
  })

  it('a SET AMOUNT PER VISIT is payable per occurrence', () => {
    // NZCL 58B Trias Road: $126 per clean. This is the case that was
    // wrongly blocked when per-visit and retainer both used 'fixed'.
    expect(isPayablePerOccurrence('per_visit')).toBe(true)
  })

  it('hourly is payable per occurrence', () => {
    expect(isPayablePerOccurrence('hourly')).toBe(true)
    expect(isPayablePerOccurrence(null)).toBe(true)
  })
})

describe('isSetAmountPerVisit', () => {
  it('is true only for per_visit', () => {
    expect(isSetAmountPerVisit('per_visit')).toBe(true)
    expect(isSetAmountPerVisit('fixed')).toBe(false)
    expect(isSetAmountPerVisit('hourly')).toBe(false)
    expect(isSetAmountPerVisit(null)).toBe(false)
  })
})

describe('isHoursIndependent', () => {
  it('is true for both non-hourly bases', () => {
    // This is what the two bases genuinely share — and why they were
    // conflated in the first place.
    expect(isHoursIndependent('per_visit')).toBe(true)
    expect(isHoursIndependent('fixed')).toBe(true)
    expect(isHoursIndependent('hourly')).toBe(false)
    expect(isHoursIndependent(null)).toBe(false)
  })
})

describe('payBasisLabel', () => {
  it('names each basis distinctly', () => {
    expect(payBasisLabel('fixed')).toBe('Retainer')
    expect(payBasisLabel('per_visit')).toBe('Set amount per visit')
    expect(payBasisLabel('hourly')).toBe('Hourly')
    expect(payBasisLabel(null)).toBe('Hourly')
  })
})
