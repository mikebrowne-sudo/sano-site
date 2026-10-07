/**
 * Clean-type options for the invoice details editor.
 *
 * invoices.type_of_clean stores the human LABEL ("End of Tenancy Clean"), not
 * a slug, and it's free text — live data already holds both "End of Tenancy
 * Clean" (17 invoices) and "End of Tenancy" (1). The editor must therefore
 * offer canonical labels AND preserve a non-canonical value rather than
 * silently rewriting it.
 */

import {
  cleanTypeLabels,
  isCanonicalCleanType,
  splitCleanType,
  resolveCleanType,
  CUSTOM_CLEAN_TYPE,
} from '@/lib/clean-type-options'

describe('cleanTypeLabels', () => {
  it('includes the clean types actually in use', () => {
    const labels = cleanTypeLabels()
    for (const expected of [
      'End of Tenancy Clean',
      'Move In / Move Out Clean',
      'Pre-Sale / Presentation Clean',
      'Handover / Presentation Clean',
      'Pre-Inspection Clean',
      'Deep Clean',
      'Routine Clean',
      'Standard Clean',
      'Full Property Reset',
      'One-Off Deep Clean',
    ]) {
      expect(labels).toContain(expected)
    }
  })

  it('has no duplicates (Custom Quote appears in two categories)', () => {
    const labels = cleanTypeLabels()
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('returns a non-empty list', () => {
    expect(cleanTypeLabels().length).toBeGreaterThan(5)
  })
})

describe('isCanonicalCleanType', () => {
  it('accepts a canonical label', () => {
    expect(isCanonicalCleanType('End of Tenancy Clean')).toBe(true)
  })

  it('rejects the legacy variant that drifted', () => {
    expect(isCanonicalCleanType('End of Tenancy')).toBe(false)
  })

  it.each([null, undefined, '', '   '])('rejects %s', (v) => {
    expect(isCanonicalCleanType(v)).toBe(false)
  })
})

describe('splitCleanType — opening the editor', () => {
  it('selects the dropdown entry for a canonical value', () => {
    expect(splitCleanType('End of Tenancy Clean')).toEqual({
      select: 'End of Tenancy Clean', custom: '',
    })
  })

  // The important one: a legacy value must survive being opened.
  it('routes a non-canonical value to the custom box', () => {
    expect(splitCleanType('End of Tenancy')).toEqual({
      select: CUSTOM_CLEAN_TYPE, custom: 'End of Tenancy',
    })
  })

  it('routes arbitrary hand-typed text to the custom box', () => {
    expect(splitCleanType('Builders clean + window track detail')).toEqual({
      select: CUSTOM_CLEAN_TYPE, custom: 'Builders clean + window track detail',
    })
  })

  it.each([null, undefined, ''])('treats %s as unset', (v) => {
    expect(splitCleanType(v)).toEqual({ select: '', custom: '' })
  })
})

describe('resolveCleanType — saving', () => {
  it('stores the selected canonical label', () => {
    expect(resolveCleanType('End of Tenancy Clean', '')).toBe('End of Tenancy Clean')
  })

  it('stores the custom text when Custom is selected', () => {
    expect(resolveCleanType(CUSTOM_CLEAN_TYPE, 'Vehicle interior detail')).toBe('Vehicle interior detail')
  })

  it('trims custom text', () => {
    expect(resolveCleanType(CUSTOM_CLEAN_TYPE, '  Spaced out  ')).toBe('Spaced out')
  })

  it('stores null for an empty custom box rather than an empty string', () => {
    expect(resolveCleanType(CUSTOM_CLEAN_TYPE, '   ')).toBeNull()
  })

  it('stores null when cleared to None', () => {
    expect(resolveCleanType('', '')).toBeNull()
  })

  it('round-trips a legacy value unchanged when untouched', () => {
    const { select, custom } = splitCleanType('End of Tenancy')
    expect(resolveCleanType(select, custom)).toBe('End of Tenancy')
  })

  it('round-trips every canonical label', () => {
    for (const label of cleanTypeLabels()) {
      const { select, custom } = splitCleanType(label)
      expect(resolveCleanType(select, custom)).toBe(label)
    }
  })
})
