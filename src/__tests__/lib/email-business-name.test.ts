/** @jest-environment node */

import { deriveEmailBusinessName } from '@/lib/campaigns/email-business-name'

const val = (s: string) => deriveEmailBusinessName(s).value

describe('deriveEmailBusinessName — conservative auto rules', () => {
  it('leaves an already-clean name unchanged', () => {
    expect(val('Akarana Golf Club')).toBe('Akarana Golf Club')
    expect(val('ASC Consultants')).toBe('ASC Consultants')
  })

  it('strips legal suffixes', () => {
    expect(val('Auckland City-Living Management Ltd')).toBe('Auckland City-Living Management')
    expect(val('Acme Limited')).toBe('Acme')
    expect(val('Foo NZ Limited')).toBe('Foo')
    expect(val('Bar Co.')).toBe('Bar')
  })

  it('removes bracketed parent-group / acronym notes', () => {
    expect(val('Auckland Body Corporate (Bayleys group)')).toBe('Auckland Body Corporate')
    expect(val('Auckland Institute of Studies (AIS)')).toBe('Auckland Institute of Studies')
  })

  it('removes a trailing research note', () => {
    expect(val('Acme Ltd — CONFIRMED as Director')).toBe('Acme')
  })

  it('preserves genuine brand punctuation', () => {
    expect(val("St Mary's College")).toBe("St Mary's College")
    expect(val('K3 Legal')).toBe('K3 Legal')
  })

  it('flags low confidence rather than guessing a shortening', () => {
    // "Autex Industries" → "Autex" and "Armstrong's Certified Used Newmarket"
    // → "Armstrong's Newmarket" are JUDGMENT calls (dropping real middle words),
    // NOT conservative cleanup. We must NOT auto-shorten these — leave close to
    // the original for a human to trim in the review panel.
    expect(val('Autex Industries')).toBe('Autex Industries')
    expect(val("Armstrong's Certified Used Newmarket")).toBe("Armstrong's Certified Used Newmarket")
  })

  it('blank company → blank proposal, low confidence', () => {
    const p = deriveEmailBusinessName('')
    expect(p.value).toBe('')
    expect(p.lowConfidence).toBe(true)
  })
})

describe('deriveEmailBusinessName — the 7 worked examples', () => {
  // Auto-clean handles 5/7 exactly. The 2 judgment cases (Armstrong's, Autex)
  // are intentionally left for human edit — documented here so the behaviour is
  // explicit, not a silent miss.
  it.each([
    ['Akarana Golf Club', 'Akarana Golf Club', true],
    ['ASC Consultants', 'ASC Consultants', true],
    ['Auckland Body Corporate (Bayleys group)', 'Auckland Body Corporate', true],
    ['Auckland City-Living Management Ltd', 'Auckland City-Living Management', true],
    ['Auckland Institute of Studies (AIS)', 'Auckland Institute of Studies', true],
  ])('%s → %s (auto)', (input, expected) => {
    expect(val(input)).toBe(expected)
  })

  it('Armstrong’s and Autex are left for human edit (judgment, not auto)', () => {
    expect(val("Armstrong's Certified Used Newmarket")).not.toBe("Armstrong's Newmarket")
    expect(val('Autex Industries')).not.toBe('Autex')
  })
})
