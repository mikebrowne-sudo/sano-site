import { normalizeGstNumber, findSharedGstProfiles, sharedGstWarning } from '@/lib/shared-gst-number'

const profiles = [
  { id: 'a', full_name: 'Anishal Kumar', gst_number: '123-456-789' },
  { id: 'b', full_name: 'Kritika Kumar', gst_number: '123456789' }, // same number, no dashes
  { id: 'c', full_name: 'Someone Else', gst_number: '999-888-777' },
  { id: 'd', full_name: null, gst_number: '123 456 789' }, // same number, spaces, unnamed
]

describe('normalizeGstNumber', () => {
  it('reduces to digits so formatting never masks a match', () => {
    expect(normalizeGstNumber('123-456-789')).toBe('123456789')
    expect(normalizeGstNumber('123 456 789')).toBe('123456789')
    expect(normalizeGstNumber(null)).toBe('')
    expect(normalizeGstNumber('  ')).toBe('')
  })
})

describe('findSharedGstProfiles', () => {
  it('finds other active profiles with the same number regardless of formatting', () => {
    const others = findSharedGstProfiles('123-456-789', 'a', profiles)
    expect(others.map((o) => o.id).sort()).toEqual(['b', 'd'])
  })

  it('excludes the profile itself', () => {
    expect(findSharedGstProfiles('123456789', 'b', profiles).some((o) => o.id === 'b')).toBe(false)
  })

  it('returns nothing for a blank/absent number (never a false positive)', () => {
    expect(findSharedGstProfiles(null, 'a', profiles)).toEqual([])
    expect(findSharedGstProfiles('   ', 'a', profiles)).toEqual([])
  })

  it('returns nothing when the number is unique', () => {
    expect(findSharedGstProfiles('999-888-777', 'c', profiles)).toEqual([])
  })
})

describe('sharedGstWarning', () => {
  it('is null when nothing is shared', () => {
    expect(sharedGstWarning('123-456-789', [])).toBeNull()
    expect(sharedGstWarning(null, profiles)).toBeNull()
  })

  it('lists the other profiles and stays non-blocking in tone', () => {
    const others = findSharedGstProfiles('123-456-789', 'a', profiles)
    const msg = sharedGstWarning('123-456-789', others)!
    expect(msg).toContain('Kritika Kumar')
    expect(msg).toContain('Unnamed contractor') // null name is handled
    expect(msg).toContain('2 other active contractor profiles')
    expect(msg).toContain('nothing is blocked')
  })

  it('uses the singular for a single collision', () => {
    const one = [{ id: 'b', full_name: 'Kritika Kumar', gst_number: '123456789' }]
    expect(sharedGstWarning('123456789', one)).toContain('1 other active contractor profile:')
  })
})
