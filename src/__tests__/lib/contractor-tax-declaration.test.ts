import {
  validateDeclarationRate, isDeclarationExpired, declarationTaxState, formatRatePct,
  type DeclarationInput, type DeclarationRecord,
} from '@/lib/contractor-tax-declaration'

const TODAY = '2026-07-31'

describe('validateDeclarationRate — declaration-aware (not a blanket 10%)', () => {
  it('contractor-chosen resident: ≥10% required', () => {
    const base: DeclarationInput = { declarationType: 'contractor_chosen', residencyStatus: 'resident', withholdingRate: 0.20 }
    expect(validateDeclarationRate(base)).toBeNull()
    expect(validateDeclarationRate({ ...base, withholdingRate: 0.08 })).toMatch(/at least 10%/)
  })

  it('contractor-chosen non-resident: ≥15% required', () => {
    const base: DeclarationInput = { declarationType: 'contractor_chosen', residencyStatus: 'non_resident', withholdingRate: 0.15 }
    expect(validateDeclarationRate(base)).toBeNull()
    expect(validateDeclarationRate({ ...base, withholdingRate: 0.12 })).toMatch(/at least 15%/)
  })

  it('tailored rate below the normal minimum is allowed WITH a certificate + expiry', () => {
    const ok: DeclarationInput = { declarationType: 'tailored_rate', withholdingRate: 0.05, tailoredRateCertificateRef: 'TR-123', expiryDate: '2027-03-31' }
    expect(validateDeclarationRate(ok)).toBeNull()
    // …but not without the certificate ref
    expect(validateDeclarationRate({ ...ok, tailoredRateCertificateRef: '' })).toMatch(/tailored-rate certificate reference is required/)
    // …nor without an expiry
    expect(validateDeclarationRate({ ...ok, expiryDate: '' })).toMatch(/tailored-rate certificate expiry/)
  })

  it('exemption: no rate; certificate ref + expiry required', () => {
    expect(validateDeclarationRate({ declarationType: 'exemption', exemptionCertificateRef: 'EX-9', expiryDate: '2027-01-01' })).toBeNull()
    expect(validateDeclarationRate({ declarationType: 'exemption', expiryDate: '2027-01-01' })).toMatch(/exemption certificate reference is required/)
    expect(validateDeclarationRate({ declarationType: 'exemption', exemptionCertificateRef: 'EX-9' })).toMatch(/exemption certificate expiry/)
  })

  it('never guesses a missing rate for a rate-bearing type', () => {
    expect(validateDeclarationRate({ declarationType: 'ir330c_standard' })).toMatch(/withholding rate is required/)
  })

  it('rejects a rate outside [0,1)', () => {
    expect(validateDeclarationRate({ declarationType: 'contractor_chosen', withholdingRate: 20 })).toMatch(/between 0 and 1/)
  })
})

describe('isDeclarationExpired', () => {
  it('tailored/exemption expire; standard/chosen do not', () => {
    expect(isDeclarationExpired({ declarationType: 'exemption', expiryDate: '2026-07-01' }, TODAY)).toBe(true)
    expect(isDeclarationExpired({ declarationType: 'tailored_rate', expiryDate: '2027-01-01' }, TODAY)).toBe(false)
    expect(isDeclarationExpired({ declarationType: 'contractor_chosen', expiryDate: '2000-01-01' }, TODAY)).toBe(false)
  })
})

describe('declarationTaxState', () => {
  const verifiedChosen: DeclarationRecord = { id: 'a', status: 'verified', declarationType: 'contractor_chosen', withholdingRate: 0.20, expiryDate: null, effectiveDate: '2026-07-01' }

  it('no declaration → does not satisfy', () => {
    expect(declarationTaxState(null, TODAY).satisfiesGate).toBe(false)
  })
  it('submitted (pending) → does not satisfy', () => {
    expect(declarationTaxState({ ...verifiedChosen, status: 'submitted' }, TODAY).satisfiesGate).toBe(false)
  })
  it('rejected / superseded → does not satisfy', () => {
    expect(declarationTaxState({ ...verifiedChosen, status: 'rejected' }, TODAY).satisfiesGate).toBe(false)
    expect(declarationTaxState({ ...verifiedChosen, status: 'superseded' }, TODAY).satisfiesGate).toBe(false)
  })
  it('verified chosen → satisfies, carries the rate', () => {
    const s = declarationTaxState(verifiedChosen, TODAY)
    expect(s.satisfiesGate).toBe(true); expect(s.rate).toBe(0.20); expect(s.isExemption).toBe(false)
  })
  it('verified exemption → satisfies with zero withholding', () => {
    const s = declarationTaxState({ id: 'e', status: 'verified', declarationType: 'exemption', withholdingRate: null, expiryDate: '2027-01-01', effectiveDate: '2026-01-01' }, TODAY)
    expect(s.satisfiesGate).toBe(true); expect(s.isExemption).toBe(true); expect(s.rate).toBe(0)
  })
  it('verified but EXPIRED certificate → does not satisfy', () => {
    const s = declarationTaxState({ id: 'x', status: 'verified', declarationType: 'exemption', withholdingRate: null, expiryDate: '2026-06-01', effectiveDate: '2026-01-01' }, TODAY)
    expect(s.satisfiesGate).toBe(false); expect(s.reason).toMatch(/expired/)
  })
})

describe('formatRatePct', () => {
  it('formats decimals as percentages', () => {
    expect(formatRatePct(0.20)).toBe('20%')
    expect(formatRatePct(0.125)).toBe('12.50%')
    expect(formatRatePct(null)).toBe('—')
  })
})
