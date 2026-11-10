import {
  contractorRateLabel,
  gstExpectationToBool,
  needsPersonnelStep,
  normalisePersonnel,
  MAX_PERSONNEL,
  PERSONNEL_DECLARATION_TEXT,
} from '@/lib/contractor-onboarding-pack'

describe('contractorRateLabel', () => {
  it('says including GST when registered', () => {
    expect(contractorRateLabel(45, true)).toBe('$45 per hour including GST')
  })
  it('says no GST when not registered', () => {
    expect(contractorRateLabel(45, false)).toBe('$45 per hour (no GST)')
  })
  it('hedges when unknown', () => {
    expect(contractorRateLabel(45, null)).toBe('$45 per hour (including GST where registered)')
  })
  it('keeps cents when the rate has them', () => {
    expect(contractorRateLabel(32.5, true)).toBe('$32.50 per hour including GST')
  })
  it('dashes a missing rate', () => {
    expect(contractorRateLabel(null, true)).toBe('—')
  })
})

describe('gstExpectationToBool', () => {
  it('maps expectations', () => {
    expect(gstExpectationToBool('registered')).toBe(true)
    expect(gstExpectationToBool('not_registered')).toBe(false)
    expect(gstExpectationToBool('unsure')).toBeNull()
    expect(gstExpectationToBool(null)).toBeNull()
  })
})

describe('needsPersonnelStep', () => {
  it('applies to entities, not sole traders', () => {
    expect(needsPersonnelStep('company')).toBe(true)
    expect(needsPersonnelStep('partnership')).toBe(true)
    expect(needsPersonnelStep('trust')).toBe(true)
    expect(needsPersonnelStep('other')).toBe(true)
    expect(needsPersonnelStep('sole_trader')).toBe(false)
    expect(needsPersonnelStep('')).toBe(false)
    expect(needsPersonnelStep(null)).toBe(false)
  })
})

describe('normalisePersonnel', () => {
  it('trims, drops blanks and de-duplicates by name', () => {
    expect(normalisePersonnel([
      { name: '  Jane   Smith ', phone: ' 021 123 ' },
      { name: '', phone: '022' },
      { name: 'jane smith', phone: null },
      { name: 'Ana Lee' },
    ])).toEqual([
      { name: 'Jane Smith', phone: '021 123' },
      { name: 'Ana Lee', phone: null },
    ])
  })
  it('caps the list', () => {
    const many = Array.from({ length: MAX_PERSONNEL + 5 }, (_, i) => ({ name: `Person ${i}` }))
    expect(normalisePersonnel(many)).toHaveLength(MAX_PERSONNEL)
  })
})

describe('PERSONNEL_DECLARATION_TEXT', () => {
  it('covers identity, right to work, background checks, briefing and notice', () => {
    expect(PERSONNEL_DECLARATION_TEXT).toMatch(/identity checked/)
    expect(PERSONNEL_DECLARATION_TEXT).toMatch(/right to work/)
    expect(PERSONNEL_DECLARATION_TEXT).toMatch(/background-checked/)
    expect(PERSONNEL_DECLARATION_TEXT).toMatch(/briefed/)
    expect(PERSONNEL_DECLARATION_TEXT).toMatch(/in writing before sending anyone not listed/)
    expect(PERSONNEL_DECLARATION_TEXT).toMatch(/evidence of these checks on request/)
  })
})
