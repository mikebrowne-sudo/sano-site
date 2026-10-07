/** @jest-environment node */

import { reviewCompanyName, isCompanyNameClean, type CompanyNameFlag } from '@/lib/campaigns/company-name-quality'

const flags = (v: string | null | undefined): CompanyNameFlag[] =>
  reviewCompanyName(v).map((i) => i.flag)

describe('reviewCompanyName — clean names pass', () => {
  it.each([
    'Acme Legal',
    'Northside Accounting',
    'Bankside Chambers',
    'Rider Levett Bucknall',
    "St Mary's College",
    'K3 Legal',            // digit inside a normal short name is fine
    'BNZ',                 // short acronym allowed
    'NZTA',
  ])('accepts %s', (name) => {
    expect(isCompanyNameClean(name)).toBe(true)
    expect(reviewCompanyName(name)).toEqual([])
  })
})

describe('reviewCompanyName — flags unsafe values', () => {
  it('flags blank / whitespace', () => {
    expect(flags('')).toContain('blank')
    expect(flags('   ')).toContain('blank')
    expect(flags(null)).toContain('blank')
    expect(flags(undefined)).toContain('blank')
  })

  it('flags placeholder values', () => {
    expect(flags('N/A')).toContain('blank')
    expect(flags('unknown')).toContain('blank')
    expect(flags('TBC')).toContain('blank')
    expect(flags('test')).toContain('blank')
  })

  it('flags unusually long values', () => {
    expect(flags('A'.repeat(61) + ' Ltd')).toContain('too_long')
  })

  it('flags research / verification notes and job titles', () => {
    expect(flags('Bentleys Chartered Accountants — CONFIRMED as Director')).toEqual(
      expect.arrayContaining(['research_note']),
    )
    expect(flags('Oyster Property Group (VERIFY - via The Org)')).toContain('research_note')
    expect(flags('Acme Ltd, Managing Director')).toContain('research_note')
    expect(flags('Foo (likely; confirm before use)')).toContain('research_note')
  })

  it('flags a contact name mixed into the company field', () => {
    expect(flags('Bentleys — Nick den Heijer')).toContain('contact_name')
    expect(flags('Jane Smith — Acme Ltd')).toContain('contact_name')
  })

  it('flags emails, URLs and phone numbers', () => {
    expect(flags('Acme (info@acme.co.nz)')).toContain('contact_detail')
    expect(flags('Acme www.acme.com')).toContain('contact_detail')
    expect(flags('Acme Ltd 021 555 1234')).toContain('contact_detail')
    expect(flags('Acme +64 9 555 1234')).toContain('contact_detail')
  })

  it('flags brackets, pipes, arrows and long dashes', () => {
    expect(flags('Acme | Northside')).toContain('punctuation')
    expect(flags('Acme <group>')).toContain('punctuation')
    expect(flags('Acme => Ltd')).toContain('punctuation')
    expect(flags('Acme — Group')).toContain('punctuation')
  })

  it('flags duplicate adjacent words', () => {
    expect(flags('Acme Acme Ltd')).toContain('duplicate_word')
  })

  it('flags long all-uppercase phrases but NOT short acronym brands', () => {
    // long shouted phrase → flagged
    expect(flags('ACME CLEANING SERVICES')).toContain('all_caps')
    // legitimate acronym-style brands (2–10 chars, letters/digits/space/+/-/&) → NOT flagged
    for (const brand of ['ASB', 'BNZ', 'INNOWAY', 'BUPE', 'RCP', 'TAPAC', 'ASACE', 'CM-NZ', 'DVA+MORE', 'DFK ORB360', 'EMA', 'MFA', 'NZMA', 'BPM', 'DMFM', 'LDE', 'MEC', 'NXP']) {
      expect(flags(brand)).not.toContain('all_caps')
    }
    // 11+ chars all-caps is still flagged even without spaces
    expect(flags('ABCDEFGHIJK')).toContain('all_caps')
  })

  it('flags suspicious digits / internal references', () => {
    expect(flags('Acme #4821')).toContain('suspicious_digits')
    expect(flags('Acme id:99')).toContain('suspicious_digits')
    expect(flags('Acme 123456')).toContain('suspicious_digits')
    // a normal year-like short digit run inside a name is fine
    expect(flags('Studio 5')).not.toContain('suspicious_digits')
  })
})

describe('reviewCompanyName — real messy examples from the lead set', () => {
  it('catches the Bentleys research-note case', () => {
    const v =
      'Bentleys Chartered Accountants New Zealand — Nick den Heijer CONFIRMED as Director/Co-founder'
    const f = flags(v)
    expect(f).toEqual(expect.arrayContaining(['too_long', 'research_note', 'contact_name', 'punctuation']))
    expect(isCompanyNameClean(v)).toBe(false)
  })
})
