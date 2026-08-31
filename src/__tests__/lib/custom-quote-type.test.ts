/**
 * Custom quote type.
 *
 * A one-off job that does not fit an existing service type (specialist
 * remediation, vehicle work, unusual site work) previously had to be faked by
 * picking an unrelated type and rewriting the generated wording by hand, or
 * built as a standalone HTML document outside the system entirely - which
 * meant hand-rolled print CSS and no correct A4 pagination.
 *
 * This routes those jobs through the existing structured-scope editor and the
 * proven QuoteDocument PDF pipeline instead.
 */

import {
  isStructuredScopeType,
  buildDefaultScopeFor,
  buildEmptyCustomScope,
  normaliseStructuredScope,
  FULL_PROPERTY_RESET_TITLE,
} from '@/lib/full-property-reset-scope'
import { isPricingEligible } from '@/lib/quote-pricing'
import { SERVICE_TYPES_BY_CATEGORY } from '@/lib/quote-wording'

describe('custom_quote - registration', () => {
  it('is offered as a commercial service type', () => {
    const codes = SERVICE_TYPES_BY_CATEGORY.commercial.map((t) => t.value)
    expect(codes).toContain('custom_quote')
  })

  it('uses the structured-scope editor', () => {
    expect(isStructuredScopeType('custom_quote')).toBe(true)
  })

  it('is priced manually, never by the engine', () => {
    // Not in service_multipliers, so the operator sets the price.
    expect(isPricingEligible('commercial', 'custom_quote')).toBe(false)
  })
})

describe('custom_quote - empty by default', () => {
  it('seeds an empty scope rather than cleaning tasks', () => {
    // A one-off job seeded with house-cleaning tasks means the operator
    // deletes more than they write.
    const scope = buildDefaultScopeFor('custom_quote')
    expect(scope.title).toBe('')
    expect(scope.intro).toBe('')
    expect(scope.notes).toEqual([])
    expect(scope.sections).toHaveLength(1)
    expect(scope.sections[0].heading).toBe('')
  })

  it('leaves the other structured types untouched', () => {
    expect(buildDefaultScopeFor('full_property_reset').title).toBe(FULL_PROPERTY_RESET_TITLE)
    expect(buildDefaultScopeFor('full_property_reset').sections.length).toBeGreaterThan(1)
  })
})

describe('reference fields', () => {
  it('round-trips label/value pairs', () => {
    const scope = normaliseStructuredScope({
      ...buildEmptyCustomScope(),
      title: 'Vehicle Interior Mould Remediation',
      referenceFields: [
        { label: 'Vehicle', value: '2015 Holden Captiva' },
        { label: 'Registration', value: 'HWP513' },
      ],
    })
    expect(scope!.referenceFields).toEqual([
      { label: 'Vehicle', value: '2015 Holden Captiva' },
      { label: 'Registration', value: 'HWP513' },
    ])
  })

  it('drops half-filled rows so no orphan label prints', () => {
    const scope = normaliseStructuredScope({
      ...buildEmptyCustomScope(),
      title: 'Something',
      referenceFields: [
        { label: 'Registration', value: 'HWP513' },
        { label: 'Odometer', value: '' },
        { label: '', value: 'orphan' },
      ],
    })
    expect(scope!.referenceFields).toHaveLength(1)
  })

  it('does not inherit the Full Property Reset title on a custom quote', () => {
    // An untitled car-groom quote reading "Full Property Reset" is worse than
    // no title at all.
    const scope = normaliseStructuredScope({
      ...buildEmptyCustomScope(),
      title: '',
      referenceFields: [{ label: 'Registration', value: 'HWP513' }],
    })
    expect(scope!.title).toBe('')
  })

  it('still defaults the title for a legacy FPR quote with no reference fields', () => {
    const scope = normaliseStructuredScope({
      title: '', expectedDuration: '', intro: '', sections: [],
      completion: '', notes: [], exclusions: [],
    })
    expect(scope!.title).toBe(FULL_PROPERTY_RESET_TITLE)
  })

  it('defaults to an empty list when absent', () => {
    const scope = normaliseStructuredScope({
      title: 'X', expectedDuration: '', intro: '', sections: [],
      completion: '', notes: [], exclusions: [],
    })
    expect(scope!.referenceFields).toEqual([])
  })
})
