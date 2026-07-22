import { buildRemittanceReference, groupContractorsForRemittance } from '@/lib/remittance-reference'

describe('buildRemittanceReference', () => {
  it('formats FIRSTNAME + PAYROLL + DDMMYY', () => {
    expect(buildRemittanceReference('Kritika Kumar', '2026-07-22')).toBe('KRITIKAPAYROLL220726')
  })
  it('uses the first token of a company name and strips punctuation', () => {
    expect(buildRemittanceReference('VMK LTD', '2026-07-22')).toBe('VMKPAYROLL220726')
    expect(buildRemittanceReference("O'Brien Cleaning", '2026-01-05')).toBe('OBRIENPAYROLL050126')
  })
  it('handles single-day/month dates and empty names gracefully', () => {
    expect(buildRemittanceReference('Sam', '2026-03-09')).toBe('SAMPAYROLL090326')
    expect(buildRemittanceReference('', '2026-07-22')).toBe('PAYROLL220726')
  })
})

describe('groupContractorsForRemittance', () => {
  const kritika = { id: 'k', full_name: 'Kritika Kumar', company_name: 'VMK LTD', gst_number: '130-908-969' }
  const anishal = { id: 'a', full_name: 'Anishal Kumar', company_name: 'VMK LTD', gst_number: '130908969' }
  const marina = { id: 'm', full_name: 'Marina Rabangaki', company_name: 'Moi-Ra Enterprise', gst_number: '135-712-264' }
  const solo = { id: 's', full_name: 'Sam Smith', company_name: null, gst_number: null }

  it('combines a couple sharing a GST number into one company remittance', () => {
    const groups = groupContractorsForRemittance([kritika, anishal])
    expect(groups).toHaveLength(1)
    expect(groups[0].combined).toBe(true)
    expect(groups[0].contractorIds.sort()).toEqual(['a', 'k'])
    expect(groups[0].payeeName).toBe('VMK LTD')
    expect(buildRemittanceReference(groups[0].referenceName, '2026-07-22')).toBe('VMKPAYROLL220726')
  })

  it('keeps unique / no-GST contractors separate', () => {
    const groups = groupContractorsForRemittance([kritika, anishal, marina, solo])
    expect(groups).toHaveLength(3) // VMK couple + Marina + Sam
    const marinaG = groups.find((g) => g.contractorIds.includes('m'))!
    expect(marinaG.combined).toBe(false)
    expect(marinaG.payeeName).toBe('Marina Rabangaki')
    const soloG = groups.find((g) => g.contractorIds.includes('s'))!
    expect(soloG.payeeName).toBe('Sam Smith')
  })
})
