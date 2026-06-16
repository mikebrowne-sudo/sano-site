import { resolveGreeting, isPersonName, greetingFirstName } from '@/lib/email-greeting'

describe('resolveGreeting — person names', () => {
  it('greets a real person by first name', () => {
    expect(resolveGreeting(['Jamie Marshall'], 'Barfoot & Thompson')).toBe('Hi Jamie,')
    expect(resolveGreeting(['Deepika Gautam'], 'Barfoot & Thompson')).toBe('Hi Deepika,')
    expect(resolveGreeting(['Monique Baker'], 'Barfoot & Thompson')).toBe('Hi Monique,')
    expect(resolveGreeting(['Amy Hutchings'], 'Ray White Lochores - Birkenhead')).toBe('Hi Amy,')
    expect(resolveGreeting(['Rebecca'], 'Barfoot & Thompson')).toBe('Hi Rebecca,')
  })
})

describe('resolveGreeting — company/branch names fall back', () => {
  it('never greets with a company / account / branch name', () => {
    expect(resolveGreeting(['Barfoot & Thompson'], 'Barfoot & Thompson')).toBe('Hi there,')
    expect(resolveGreeting(['Barfoot & Thompson - Ponsonby'], 'Barfoot & Thompson')).toBe('Hi there,')
    expect(resolveGreeting(['Barfoot - Ellerslie'], 'Barfoot & Thompson')).toBe('Hi there,')
    expect(resolveGreeting(['Wendell Property'], 'Wendell Property')).toBe('Hi there,')
    expect(resolveGreeting(['Ray White Lochores'], 'Ray White Lochores')).toBe('Hi there,')
    expect(resolveGreeting(['Property Scouts Auckland Bays'], null)).toBe('Hi there,')
  })

  it('falls back when the candidate just echoes the account name', () => {
    expect(resolveGreeting(['Acme Cleaning Co'], 'Acme Cleaning Co')).toBe('Hi there,')
  })
})

describe('resolveGreeting — blanks and ordering', () => {
  it('falls back for blank / null / empty candidates', () => {
    expect(resolveGreeting([], 'Anything')).toBe('Hi there,')
    expect(resolveGreeting([null, undefined, '   '], 'Anything')).toBe('Hi there,')
  })

  it('uses the first person-like candidate, skipping company-like ones', () => {
    // linked contact is company-like, snapshot contact is a real person
    expect(resolveGreeting(['Barfoot & Thompson', 'Jamie Marshall'], 'Barfoot & Thompson')).toBe('Hi Jamie,')
    // accounts contact used only after others fail
    expect(resolveGreeting([null, null, 'Tim Vaugh'], 'Pukekohe Golf Club')).toBe('Hi Tim,')
  })
})

describe('isPersonName / greetingFirstName', () => {
  it('classifies names sensibly', () => {
    expect(isPersonName('Jamie Marshall', 'Barfoot & Thompson')).toBe(true)
    expect(isPersonName('Barfoot & Thompson', 'Barfoot & Thompson')).toBe(false)
    expect(isPersonName('Wendell Property')).toBe(false)
    expect(isPersonName('', 'X')).toBe(false)
    expect(isPersonName(null)).toBe(false)
  })

  it('extracts the first name or null', () => {
    expect(greetingFirstName('Deepika Gautam')).toBe('Deepika')
    expect(greetingFirstName('Barfoot & Thompson - Ponsonby')).toBeNull()
  })
})
