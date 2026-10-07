import {
  structureFieldRules, validateStructureSubmission, entityDisplayLines,
  requiresAuthorityDeclaration, AUTHORITY_TO_BIND_DECLARATION,
  type StructureSubmission,
} from '@/lib/contractor-structure-fields'

describe('structureFieldRules', () => {
  it('sole trader signs personally: no legal-entity name, no company number, no signatory', () => {
    const r = structureFieldRules('sole_trader')
    expect(r.isEntity).toBe(false)
    expect(r.legalName.show).toBe(false)
    expect(r.companyNumber.show).toBe(false)
    expect(r.signatory.show).toBe(false)
  })

  it('company: legal name + company number + signatory all required', () => {
    const r = structureFieldRules('company')
    expect(r.legalName.required).toBe(true)
    expect(r.legalName.label).toBe('Company legal name')
    expect(r.companyNumber.show && r.companyNumber.required).toBe(true)
    expect(r.signatory.required).toBe(true)
  })

  it('trust / partnership: legal name + signatory required, no company number', () => {
    for (const s of ['trust', 'partnership'] as const) {
      const r = structureFieldRules(s)
      expect(r.legalName.required).toBe(true)
      expect(r.companyNumber.show).toBe(false)
      expect(r.signatory.required).toBe(true)
    }
    expect(structureFieldRules('trust').legalName.label).toBe('Trust name')
    expect(structureFieldRules('partnership').legalName.label).toBe('Partnership name')
  })

  it('NZBN shown for all, required for none', () => {
    for (const s of ['sole_trader', 'company', 'partnership', 'trust', 'other'] as const) {
      expect(structureFieldRules(s).nzbn.show).toBe(true)
      expect(structureFieldRules(s).nzbn.required).toBe(false)
    }
  })
})

describe('validateStructureSubmission', () => {
  const soleOk: StructureSubmission = { structure: 'sole_trader', fullName: 'Jane Cleaner', signedName: 'Jane Cleaner' }

  it('sole trader: signature must match full legal name', () => {
    expect(validateStructureSubmission(soleOk)).toBeNull()
    expect(validateStructureSubmission({ ...soleOk, signedName: 'J Cleaner' })).toMatch(/match your full legal name/)
  })

  it('company: requires legal name, company number, signatory name + capacity', () => {
    const base: StructureSubmission = { structure: 'company', fullName: 'Jane Cleaner', signedName: 'Jane Cleaner' }
    expect(validateStructureSubmission(base)).toMatch(/Company legal name is required/)
    expect(validateStructureSubmission({ ...base, legalName: 'Moi-Ra Ltd' })).toMatch(/Company number is required/)
    expect(validateStructureSubmission({ ...base, legalName: 'Moi-Ra Ltd', companyNumber: '123' })).toMatch(/signatory’s name is required/)
    expect(validateStructureSubmission({ ...base, legalName: 'Moi-Ra Ltd', companyNumber: '123', signatoryName: 'Jane Cleaner' })).toMatch(/capacity/)
  })

  it('company: signature must match the authorised signatory', () => {
    const full: StructureSubmission = {
      structure: 'company', fullName: 'Jane Cleaner', legalName: 'Moi-Ra Ltd', companyNumber: '123',
      signatoryName: 'Jane Cleaner', signatoryCapacity: 'Director', signedName: 'Someone Else',
    }
    expect(validateStructureSubmission({ ...full, authorityConfirmed: true })).toMatch(/match the authorised signatory/)
    expect(validateStructureSubmission({ ...full, signedName: 'Jane Cleaner', authorityConfirmed: true })).toBeNull()
  })

  it('trust: legal name + signatory required', () => {
    const t: StructureSubmission = { structure: 'trust', fullName: 'Jane Trustee', signedName: 'Jane Trustee' }
    expect(validateStructureSubmission(t)).toMatch(/Trust name is required/)
    expect(validateStructureSubmission({ ...t, legalName: 'Cleaner Family Trust', signatoryName: 'Jane Trustee', signatoryCapacity: 'Trustee', authorityConfirmed: true })).toBeNull()
  })
})

describe('authority-to-bind declaration', () => {
  it('required for company, partnership, trust, other — NOT for sole trader', () => {
    expect(requiresAuthorityDeclaration('sole_trader')).toBe(false)
    for (const s of ['company', 'partnership', 'trust', 'other'] as const) {
      expect(requiresAuthorityDeclaration(s)).toBe(true)
    }
  })

  const entityBase = (structure: 'company' | 'partnership' | 'trust'): StructureSubmission => ({
    structure, fullName: 'Jane Signatory', signedName: 'Jane Signatory',
    legalName: 'Acme Entity', companyNumber: structure === 'company' ? '123' : null,
    signatoryName: 'Jane Signatory', signatoryCapacity: structure === 'trust' ? 'Trustee' : structure === 'partnership' ? 'Partner' : 'Director',
  })

  it('company cannot sign without confirming authority', () => {
    expect(validateStructureSubmission(entityBase('company'))).toMatch(/authorised to sign on behalf/)
    expect(validateStructureSubmission({ ...entityBase('company'), authorityConfirmed: true })).toBeNull()
  })
  it('partnership cannot sign without confirming authority', () => {
    expect(validateStructureSubmission(entityBase('partnership'))).toMatch(/authorised to sign on behalf/)
    expect(validateStructureSubmission({ ...entityBase('partnership'), authorityConfirmed: true })).toBeNull()
  })
  it('trust cannot sign without confirming authority', () => {
    expect(validateStructureSubmission(entityBase('trust'))).toMatch(/authorised to sign on behalf/)
    expect(validateStructureSubmission({ ...entityBase('trust'), authorityConfirmed: true })).toBeNull()
  })
  it('sole trader is never asked for the declaration (passes without it)', () => {
    expect(validateStructureSubmission({ structure: 'sole_trader', fullName: 'Sole Person', signedName: 'Sole Person' })).toBeNull()
  })
  it('the declaration wording is the exact required sentence', () => {
    expect(AUTHORITY_TO_BIND_DECLARATION).toBe('I confirm that I am authorised to enter into and sign this agreement on behalf of the contracting entity.')
  })
})

describe('entityDisplayLines', () => {
  it('renders company entity lines', () => {
    expect(entityDisplayLines({ structure: 'company', legalName: 'Moi-Ra Limited', tradingName: 'Moi-Ra Cleaning', companyNumber: '8765432', nzbn: '9429000000000' }))
      .toEqual(['Moi-Ra Limited', 'Trading as Moi-Ra Cleaning', 'Company no. 8765432', 'NZBN 9429000000000'])
  })
  it('omits trading name when equal to legal name; omits absent fields', () => {
    expect(entityDisplayLines({ legalName: 'X Ltd', tradingName: 'X Ltd' })).toEqual(['X Ltd'])
  })
})
