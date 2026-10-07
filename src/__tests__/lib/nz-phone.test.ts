/**
 * NZ phone → E.164 for Twilio.
 *
 * Twilio rejects a local number with error 21211. Every phone in this database
 * is stored as a person types it, and the sender passed that string straight
 * through — so SMS could never have worked. 1,737 logged attempts, zero sent.
 *
 * The rule: drop the leading 0, prefix +64.
 *
 * The cases below are REAL formats taken from the live contractors and clients
 * tables (106 mobiles, 13 landlines, 1 junk row).
 */

import {
  toE164NZ,
  isSmsCapableNZ,
  isNZMobile,
  formatNZPhoneDisplay,
  NZ_COUNTRY_CODE,
} from '@/lib/nz-phone'

describe('toE164NZ — real contractor numbers', () => {
  it.each([
    ['0220337295',    '+64220337295'],   // Carol Browne
    ['022 024 2244',  '+64220242244'],   // Kritika Kumar
    ['021 0277 0941', '+642102770941'],  // Lose Kalekale
    ['021 208 5856',  '+64212085856'],   // Marina Rabangaki
    ['0211685553',    '+64211685553'],   // Michael Browne
    ['021 026 09416', '+642102609416'],  // Mosese Kalekale
    ['021 2851527',   '+64212851527'],   // Myrtle McGoon
    ['0210633476',    '+64210633476'],   // Nasrin Maleki
    ['022 611 9467',  '+64226119467'],   // Radhika Dhungel
    ['02203013219',   '+642203013219'],  // Upasni Devi
  ])('%s → %s', (input, expected) => {
    expect(toE164NZ(input)).toBe(expected)
  })
})

describe('toE164NZ — real client formats', () => {
  it.each([
    ['02041075100',   '+642041075100'],
    ['021 024 90910', '+642102490910'],
    ['021 0370447',   '+64210370447'],
    ['021 349 901',   '+6421349901'],
    ['02102297496',   '+642102297496'],
  ])('%s → %s', (input, expected) => {
    expect(toE164NZ(input)).toBe(expected)
  })
})

describe('toE164NZ — landlines normalise the same way', () => {
  it.each([
    ['09 123 4567', '+6491234567'],
    ['094441234',   '+6494441234'],
    ['03 555 1234', '+6435551234'],
  ])('%s → %s', (input, expected) => {
    expect(toE164NZ(input)).toBe(expected)
  })
})

describe('toE164NZ — formatting is stripped', () => {
  it.each([
    ['021-234-5678',   '+64212345678'],
    ['(021) 234 5678', '+64212345678'],
    ['021.234.5678',   '+64212345678'],
    ['  0212345678  ', '+64212345678'],
  ])('%s → %s', (input, expected) => {
    expect(toE164NZ(input)).toBe(expected)
  })
})

describe('toE164NZ — country-code forms', () => {
  it('leaves an existing +64 alone', () => {
    expect(toE164NZ('+64220337295')).toBe('+64220337295')
  })

  it('accepts +64 with spaces', () => {
    expect(toE164NZ('+64 22 033 7295')).toBe('+64220337295')
  })

  it('handles 0064 and bare 64', () => {
    expect(toE164NZ('0064220337295')).toBe('+64220337295')
    expect(toE164NZ('64220337295')).toBe('+64220337295')
  })

  it('accepts a number pasted without its leading 0', () => {
    expect(toE164NZ('220337295')).toBe('+64220337295')
  })
})

// Returning null rather than a guess matters: Twilio charges for a rejected
// send, and the failure is invisible to the operator.
describe('toE164NZ — refuses to guess', () => {
  it.each([null, undefined, '', '   ', 'no phone'])('rejects %s', (v) => {
    expect(toE164NZ(v)).toBeNull()
  })

  // A real junk row in the live clients table.
  it('rejects the "02" junk row rather than inventing digits', () => {
    expect(toE164NZ('02')).toBeNull()
  })

  it.each(['0', '021', '02123'])('rejects the too-short %s', (v) => {
    expect(toE164NZ(v)).toBeNull()
  })

  it('rejects an implausibly long number', () => {
    expect(toE164NZ('021234567890123')).toBeNull()
  })

  // Rewriting an Australian number as NZ would text a stranger.
  it.each(['+61412345678', '+1 555 123 4567', '+442071234567'])(
    'never rewrites the non-NZ %s as NZ', (v) => {
      expect(toE164NZ(v)).toBeNull()
    },
  )

  it('rejects a double-zero that suggests a bad strip', () => {
    expect(toE164NZ('0021234567')).toBeNull()
  })
})

describe('isSmsCapableNZ', () => {
  it('accepts a normalisable number', () => {
    expect(isSmsCapableNZ('0220337295')).toBe(true)
  })
  it.each([null, '', '02', '+61412345678'])('rejects %s', (v) => {
    expect(isSmsCapableNZ(v)).toBe(false)
  })
})

describe('isNZMobile — landlines cannot receive SMS', () => {
  it.each(['0220337295', '021 208 5856', '027 123 4567'])('%s is mobile', (v) => {
    expect(isNZMobile(v)).toBe(true)
  })

  it.each(['09 123 4567', '03 555 1234'])('%s is not mobile', (v) => {
    expect(isNZMobile(v)).toBe(false)
  })

  it('rejects junk', () => {
    expect(isNZMobile('02')).toBe(false)
  })
})

describe('formatNZPhoneDisplay', () => {
  it('groups a mobile for reading', () => {
    expect(formatNZPhoneDisplay('+64220337295')).toBe('022 033 7295')
  })

  it('passes junk through unchanged rather than mangling it', () => {
    expect(formatNZPhoneDisplay('02')).toBe('02')
    expect(formatNZPhoneDisplay(null)).toBe('')
  })
})

describe('the country code is +64', () => {
  it('is exported for callers', () => {
    expect(NZ_COUNTRY_CODE).toBe('+64')
  })
})
