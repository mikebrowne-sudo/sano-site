import { cleanRemittanceAddress, noteAddsValue } from '@/lib/remittance-address'

describe('cleanRemittanceAddress', () => {
  it('strips postcode and country to street + suburb', () => {
    expect(cleanRemittanceAddress('4 Alderley Road, Mount Eden, Auckland 1024, New Zealand'))
      .toBe('4 Alderley Road, Mount Eden')
    expect(cleanRemittanceAddress('8/39 Pitt Street, Auckland Central, Auckland 1010, New Zealand'))
      .toBe('8/39 Pitt Street, Auckland Central')
    expect(cleanRemittanceAddress('28 Netherlands Avenue, Kelston, Auckland 0602, New Zealand'))
      .toBe('28 Netherlands Avenue, Kelston')
  })

  it('preserves a 4-digit street number (only strips a trailing postcode)', () => {
    expect(cleanRemittanceAddress('1024 Great North Road, Avondale, Auckland 0600, New Zealand'))
      .toBe('1024 Great North Road, Avondale')
  })

  it('drops an obvious duplicated consecutive segment', () => {
    expect(cleanRemittanceAddress('5 Smith St, Henderson, Henderson, Auckland 0610'))
      .toBe('5 Smith St, Henderson')
  })

  it('returns null / passes through gracefully', () => {
    expect(cleanRemittanceAddress(null)).toBeNull()
    expect(cleanRemittanceAddress('')).toBeNull()
    expect(cleanRemittanceAddress('36 Caroline Heights, Omaha')).toBe('36 Caroline Heights, Omaha')
  })
})

describe('noteAddsValue', () => {
  it('hides a note that just restates the address', () => {
    expect(noteAddsValue('8/39 Pitt St', '8/39 Pitt Street, Auckland Central')).toBe(false)
    expect(noteAddsValue('128 Marsden Ave', '128 Marsden Avenue, Mount Eden')).toBe(false)
    expect(noteAddsValue('28 Netherlands Avenue, Kelston', '28 Netherlands Avenue, Kelston')).toBe(false)
  })

  it('tolerates abbreviations and minor typos', () => {
    expect(noteAddsValue('4 Alderly Road Mt Eden', '4 Alderley Road, Mount Eden')).toBe(false)
  })

  it('shows a note that carries distinct info', () => {
    expect(noteAddsValue('Barfoot Royal Heights - 8/28 Buscomb Ave', '26 Buscomb Avenue, Henderson')).toBe(true)
    expect(noteAddsValue('Carpet clean - 2 Crudge St', '2 Crudge Street, Massey')).toBe(true)
  })

  it('shows the note when there is no address', () => {
    expect(noteAddsValue('Oven clean', null)).toBe(true)
  })

  it('hides an empty note', () => {
    expect(noteAddsValue('', '4 Alderley Road, Mount Eden')).toBe(false)
    expect(noteAddsValue(null, '4 Alderley Road, Mount Eden')).toBe(false)
  })
})
