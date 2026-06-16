import {
  proposedAccountName,
  structuredBranchFields,
  isCompanyNamedContact,
  looksLikeTestRecord,
  duplicateClientIds,
  analyzeAccount,
} from '@/lib/account-cleanup'

describe('structuredBranchFields', () => {
  it('splits a company-led record into parent brand + branch + display', () => {
    expect(structuredBranchFields('Barfoot & Thompson', 'Greenlane')).toEqual({
      company: 'Barfoot & Thompson',
      branch: 'Greenlane',
      display: 'Barfoot & Thompson - Greenlane',
    })
  })
  it('returns null for person-led or already-combined records', () => {
    expect(structuredBranchFields('Kevin Maio', 'Barfoot & Thompson - Royal Heights')).toBeNull()
    expect(structuredBranchFields('Ray White Lochores - Birkenhead', null)).toBeNull()
  })
})

describe('proposedAccountName', () => {
  it('combines a company-led name + branch', () => {
    expect(proposedAccountName('Barfoot & Thompson', 'Greenlane')).toBe('Barfoot & Thompson - Greenlane')
  })
  it('does not propose for person-led records (flag for review instead)', () => {
    expect(proposedAccountName('Kevin Maio', 'Barfoot & Thompson - Royal Heights')).toBeNull()
    expect(proposedAccountName('Mercedes', 'Property Scouts Auckland Bays')).toBeNull()
  })
  it('does not duplicate when already combined / no company', () => {
    expect(proposedAccountName('Ray White Lochores - Birkenhead', null)).toBeNull()
    expect(proposedAccountName('Wendell Property', 'Wendell Property')).toBeNull()
  })
})

describe('isCompanyNamedContact', () => {
  it('flags company-named contacts, not people', () => {
    expect(isCompanyNamedContact('Barfoot & Thompson - Ponsonby', 'Barfoot & Thompson')).toBe(true)
    expect(isCompanyNamedContact('Wendell Property')).toBe(true)
    expect(isCompanyNamedContact('Amy Hutchings', 'Ray White Lochores - Birkenhead')).toBe(false)
    expect(isCompanyNamedContact('')).toBe(false)
  })
})

describe('looksLikeTestRecord', () => {
  it('flags obvious test/junk', () => {
    expect(looksLikeTestRecord('test', 'test', null)).toBe(true)
    expect(looksLikeTestRecord('Ashlee Diamond', 'wife', null)).toBe(true)
    expect(looksLikeTestRecord('Barfoot & Thompson', 'Greenlane', 'x@barfoot.co.nz')).toBe(false)
  })
})

describe('duplicateClientIds', () => {
  it('flags true duplicates (same email, or same name + same branch) but not separate branches', () => {
    const ids = duplicateClientIds([
      { id: '1', name: 'Ghee Cariappa', company_name: 'Sansom Limited', email: 'ghee@sansom.co.nz' },
      { id: '2', name: 'Ghee Cariappa', company_name: 'Sansom Limited', email: 'ghee@sansom.co.nz' },
      { id: '3', name: 'Barfoot & Thompson', company_name: 'Ellerslie', email: 'ellerslie.rental@barfoot.co.nz' },
      { id: '4', name: 'Barfoot & Thompson', company_name: 'Ponsonby', email: 'ponsonby.rental@barfoot.co.nz' },
      { id: '5', name: 'Unique Co', company_name: null, email: 'a@b.com' },
    ])
    expect(ids.has('1')).toBe(true)  // same name + branch + email
    expect(ids.has('2')).toBe(true)
    expect(ids.has('3')).toBe(false) // Barfoot branches: same name, different branch → not a duplicate
    expect(ids.has('4')).toBe(false)
    expect(ids.has('5')).toBe(false)
  })
})

describe('analyzeAccount', () => {
  it('flags a branch-split company account and proposes a rename', () => {
    const a = analyzeAccount({
      name: 'Barfoot & Thompson', companyName: 'Greenlane', email: 'greenlane.rental@barfoot.co.nz',
      contacts: [{ full_name: 'Jamie Marshall', email: 'j@x.com', contact_type: 'primary' }],
    })
    expect(a.flags.branchSplit).toBe(true)
    expect(a.proposedName).toBe('Barfoot & Thompson - Greenlane')
    expect(a.suggestedAction).toMatch(/Rename/)
    expect(a.flags.noRealContact).toBe(false)
  })

  it('flags an account whose only contact is company-named', () => {
    const a = analyzeAccount({
      name: 'Barfoot & Thompson', companyName: 'Ponsonby', email: null,
      contacts: [{ full_name: 'Barfoot & Thompson - Ponsonby', email: null, contact_type: 'primary' }],
    })
    expect(a.flags.companyNamedContact).toBe(true)
    expect(a.flags.noRealContact).toBe(true)
    expect(a.riskLevel).toBe('high')
    expect(a.suggestedAction).toMatch(/real contact/i)
  })

  it('flags person/company maybe swapped', () => {
    const a = analyzeAccount({
      name: 'Kirsty-ann Ofamooni', companyName: 'Wendell Property', email: 'k@wendell.co.nz',
      contacts: [{ full_name: 'Kirsty-ann Ofamooni', email: 'k@wendell.co.nz', contact_type: 'primary' }],
    })
    expect(a.flags.personMaybeWrongField).toBe(true)
  })

  it('leaves a clean account unflagged', () => {
    const a = analyzeAccount({
      name: 'Ray White Lochores - Birkenhead', companyName: null, email: 'birkenhead.nz@raywhite.com',
      contacts: [{ full_name: 'Amy Hutchings', email: 'amy@x.com', contact_type: 'primary' }],
    })
    expect(a.hasAnyFlag).toBe(false)
    expect(a.riskLevel).toBe('low')
  })
})
