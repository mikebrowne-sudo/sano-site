import {
  buildDefaultResetScope,
  buildResetIntro,
  buildResetCompletion,
  normaliseStructuredScope,
  isStructuredScope,
  FULL_PROPERTY_RESET_SECTIONS,
  FULL_PROPERTY_RESET_NOTES,
  FULL_PROPERTY_RESET_TITLE,
  buildDefaultHousekeepingScope,
  buildHousekeepingIntro,
  buildDefaultScopeFor,
  isStructuredScopeType,
  STRUCTURED_SCOPE_CODES,
  RESIDENTIAL_HOUSEKEEPING_TITLE,
  RESIDENTIAL_HOUSEKEEPING_SECTIONS,
  RESIDENTIAL_HOUSEKEEPING_EXCLUSIONS,
  type StructuredScope,
} from '@/lib/full-property-reset-scope'
import { SERVICE_TYPES_BY_CATEGORY, supportsRecurring } from '@/lib/quote-wording'
import { isPricingEligible } from '@/lib/quote-pricing'

describe('buildDefaultResetScope — approved standard scope', () => {
  it('loads the standard title, sections and notes', () => {
    const s = buildDefaultResetScope()
    expect(s.title).toBe(FULL_PROPERTY_RESET_TITLE)
    expect(s.sections.map((x) => x.heading)).toEqual(FULL_PROPERTY_RESET_SECTIONS.map((x) => x.heading))
    expect(s.notes).toEqual(FULL_PROPERTY_RESET_NOTES)
    expect(s.exclusions).toEqual([])
    expect(s.expectedDuration).toBe('')
  })

  it('deep-copies sections so edits never mutate the shared template', () => {
    const a = buildDefaultResetScope()
    a.sections[0].items.push('Custom line')
    a.sections[0].heading = 'Changed'
    const b = buildDefaultResetScope()
    expect(b.sections[0].heading).toBe(FULL_PROPERTY_RESET_SECTIONS[0].heading)
    expect(b.sections[0].items).toEqual(FULL_PROPERTY_RESET_SECTIONS[0].items)
    expect(FULL_PROPERTY_RESET_SECTIONS[0].items).not.toContain('Custom line')
  })
})

describe('buildResetIntro — generated from available details only', () => {
  it('includes the duration clause when a duration is provided', () => {
    const intro = buildResetIntro({ expectedDuration: 'two days', sections: FULL_PROPERTY_RESET_SECTIONS })
    expect(intro).toContain('two days')
    expect(intro).toContain('property reset')
  })

  it('omits any duration wording when none is provided (never invents one)', () => {
    const intro = buildResetIntro({ expectedDuration: '', sections: FULL_PROPERTY_RESET_SECTIONS })
    expect(intro).not.toMatch(/\bday(s)?\b/i)
    expect(intro).not.toMatch(/approximately/i)
  })

  it('mentions item handling / rubbish / carpet only when the scope contains them', () => {
    const withCarpet = buildResetIntro({ sections: [{ heading: 'Carpets', items: ['Shampoo-extract carpets'] }] })
    expect(withCarpet).toContain('carpet and floor care')

    const noCarpet = buildResetIntro({ sections: [{ heading: 'Windows', items: ['Clean interior windows'] }] })
    expect(noCarpet).not.toContain('carpet and floor care')
    // Always includes the safe, non-invented baseline.
    expect(noCarpet).toContain('room-by-room deep cleaning')
  })
})

describe('buildResetCompletion', () => {
  it('includes the duration when given, omits it cleanly otherwise', () => {
    expect(buildResetCompletion('two days')).toContain('approximately two days')
    expect(buildResetCompletion('')).not.toMatch(/approximately/)
    expect(buildResetCompletion('')).toContain('carefully and respectfully')
  })
})

describe('regeneration protects manual edits', () => {
  it('regenerating the intro (buildResetIntro) never returns the sections', () => {
    // The editor calls buildResetIntro and assigns ONLY to intro; this test
    // documents that the function has no access to / no effect on sections.
    const scope = buildDefaultResetScope()
    scope.sections[0].items = ['MANUAL EDIT — keep me']
    scope.notes = ['MANUAL NOTE']
    const newIntro = buildResetIntro({
      expectedDuration: scope.expectedDuration,
      sections: scope.sections,
    })
    // Simulate the editor's regenerate: replace intro only.
    const after: StructuredScope = { ...scope, intro: newIntro }
    expect(after.sections[0].items).toEqual(['MANUAL EDIT — keep me'])
    expect(after.notes).toEqual(['MANUAL NOTE'])
    expect(after.intro).toBe(newIntro)
  })
})

describe('normaliseStructuredScope — storage + historical compatibility', () => {
  it('returns null for legacy / free-text quotes (no structured_scope)', () => {
    expect(normaliseStructuredScope(null)).toBeNull()
    expect(normaliseStructuredScope(undefined)).toBeNull()
    expect(normaliseStructuredScope('just a string')).toBeNull()
    expect(normaliseStructuredScope({})).toBeNull() // no sections array
    expect(isStructuredScope({ sections: [] })).toBe(true)
  })

  it('round-trips a full structured scope', () => {
    const s = buildDefaultResetScope()
    s.expectedDuration = 'two days'
    const round = normaliseStructuredScope(JSON.parse(JSON.stringify(s)))
    expect(round).not.toBeNull()
    expect(round!.title).toBe(FULL_PROPERTY_RESET_TITLE)
    expect(round!.expectedDuration).toBe('two days')
    expect(round!.sections.length).toBe(FULL_PROPERTY_RESET_SECTIONS.length)
  })

  it('tolerates partial / malformed stored JSON', () => {
    const partial = normaliseStructuredScope({ sections: [{ heading: 'Only heading' }] })
    expect(partial).not.toBeNull()
    expect(partial!.sections[0].heading).toBe('Only heading')
    expect(partial!.sections[0].items).toEqual([]) // missing items -> empty
    expect(partial!.title).toBe(FULL_PROPERTY_RESET_TITLE) // missing title -> default
    expect(partial!.notes).toEqual([])
    expect(partial!.exclusions).toEqual([])
  })

  it('coerces non-string items/notes to strings', () => {
    const s = normaliseStructuredScope({
      sections: [{ heading: 'X', items: [1, 2, null] }],
      notes: [true, 'ok'],
    })
    expect(s!.sections[0].items).toEqual(['1', '2', ''])
    expect(s!.notes).toEqual(['true', 'ok'])
  })
})

// ── Residential Housekeeping (second structured-scope service) ───────────────

describe('Residential Housekeeping default scope', () => {
  it('loads the housekeeping title, grouped sections, exclusions and service conditions', () => {
    const s = buildDefaultHousekeepingScope()
    expect(s.title).toBe(RESIDENTIAL_HOUSEKEEPING_TITLE)
    expect(s.title).toBe('Weekly residential housekeeping service')
    expect(s.sections.map((x) => x.heading)).toEqual(RESIDENTIAL_HOUSEKEEPING_SECTIONS.map((x) => x.heading))
    expect(s.sections.map((x) => x.heading)).toEqual(
      ['General cleaning', 'Kitchen', 'Bathrooms', 'Laundry & linen', 'Tidying & detailed tasks'],
    )
    expect(s.exclusions).toEqual(RESIDENTIAL_HOUSEKEEPING_EXCLUSIONS)
    expect(s.notes.length).toBeGreaterThan(0)
  })

  it('defaults weekly hours + service days to BLANK (entered per quote, not baked in)', () => {
    const s = buildDefaultHousekeepingScope()
    expect(s.weeklyHours).toBe('')
    expect(s.serviceDays).toBe('')
    // No specific hours or days baked into the default scope anywhere.
    const text = JSON.stringify(s)
    expect(text).not.toMatch(/20 hours/)
    expect(text).not.toMatch(/Monday, Wednesday and Friday/)
    // Blank → neutral fallback intro, never a placeholder or broken bracket.
    expect(s.intro).toContain('within the agreed weekly service allocation')
    expect(s.intro).not.toMatch(/\[|\]|undefined|up to\s+hours/)
  })

  it('communicates the service in WORDING only — no rate/qty/hourly figure', () => {
    const text = JSON.stringify(buildDefaultHousekeepingScope())
    expect(text).not.toMatch(/\$45|45\.00|per hour|\/hr|hourly rate/i)
    expect(text).not.toMatch(/\d+\s*[x×]\s*\$?\d/)
  })

  it('excludes cooking, groceries, childcare and out-of-allocation work', () => {
    const ex = buildDefaultHousekeepingScope().exclusions.join(' | ').toLowerCase()
    expect(ex).toContain('cooking')
    expect(ex).toContain('grocery')
    expect(ex).toContain('childcare')
    expect(ex).toContain('outside the agreed weekly time allocation')
  })

  it('deep-copies sections so edits never mutate the shared template', () => {
    const a = buildDefaultHousekeepingScope()
    a.sections[0].items.push('Custom line')
    const b = buildDefaultHousekeepingScope()
    expect(b.sections[0].items).not.toContain('Custom line')
    expect(RESIDENTIAL_HOUSEKEEPING_SECTIONS[0].items).not.toContain('Custom line')
  })
})

describe('buildHousekeepingIntro — weekly hours + service days are DESCRIPTIVE, blank-safe', () => {
  it('names both when hours + days are given', () => {
    const intro = buildHousekeepingIntro({ weeklyHours: '20', serviceDays: 'Monday, Wednesday and Friday' })
    expect(intro).toContain('up to 20 hours')
    expect(intro).toContain('per week, generally provided across Monday, Wednesday and Friday')
  })
  it('names hours only when days are blank', () => {
    const intro = buildHousekeepingIntro({ weeklyHours: '15', serviceDays: '' })
    expect(intro).toContain('up to 15 hours of residential housekeeping and cleaning support per week.')
    expect(intro).not.toMatch(/across\s*\./)
  })
  it('names days only when hours are blank', () => {
    const intro = buildHousekeepingIntro({ weeklyHours: '', serviceDays: 'Tuesday and Thursday' })
    expect(intro).toContain('within the agreed weekly service allocation, generally across Tuesday and Thursday')
    expect(intro).not.toMatch(/up to\s+hours/)
  })
  it('falls back to neutral wording when BOTH are blank — no placeholder or broken text', () => {
    const intro = buildHousekeepingIntro({ weeklyHours: '', serviceDays: '' })
    expect(intro).toContain('Residential housekeeping and cleaning support provided within the agreed weekly service allocation.')
    expect(intro).not.toMatch(/\[|\]|undefined|null|up to\s+hours|across\s*\./)
  })
  it('trims whitespace-only values to the blank fallback', () => {
    expect(buildHousekeepingIntro({ weeklyHours: '   ', serviceDays: '  ' }))
      .toContain('within the agreed weekly service allocation.')
  })
  it('preserves entered weekly hours + days through normalise (round-trip)', () => {
    const s = buildDefaultHousekeepingScope()
    s.weeklyHours = '20'
    s.serviceDays = 'Monday, Wednesday and Friday'
    const round = normaliseStructuredScope(JSON.parse(JSON.stringify(s)))
    expect(round!.weeklyHours).toBe('20')
    expect(round!.serviceDays).toBe('Monday, Wednesday and Friday')
  })
})

describe('isStructuredScopeType + buildDefaultScopeFor — structured services', () => {
  it('recognises the structured service codes and nothing else', () => {
    // custom_quote joined the list so one-off jobs (specialist remediation,
    // vehicle work) can use the same scope editor and PDF pipeline instead of
    // being built as standalone documents outside the system.
    expect(STRUCTURED_SCOPE_CODES).toEqual([
      'full_property_reset',
      'residential_housekeeping',
      'custom_quote',
    ])
    expect(isStructuredScopeType('full_property_reset')).toBe(true)
    expect(isStructuredScopeType('residential_housekeeping')).toBe(true)
    expect(isStructuredScopeType('custom_quote')).toBe(true)
    expect(isStructuredScopeType('standard_clean')).toBe(false)
    expect(isStructuredScopeType('')).toBe(false)
    expect(isStructuredScopeType(null)).toBe(false)
    expect(isStructuredScopeType(undefined)).toBe(false)
  })

  it('dispatches the correct default scope per code (FPR unchanged)', () => {
    expect(buildDefaultScopeFor('residential_housekeeping').title).toBe(RESIDENTIAL_HOUSEKEEPING_TITLE)
    expect(buildDefaultScopeFor('full_property_reset').title).toBe(FULL_PROPERTY_RESET_TITLE)
    // Unknown / default falls back to the reset scope (existing behaviour).
    expect(buildDefaultScopeFor(null).title).toBe(FULL_PROPERTY_RESET_TITLE)
  })

  it('a housekeeping scope round-trips through normalise unchanged (real title kept)', () => {
    const s = buildDefaultHousekeepingScope()
    const round = normaliseStructuredScope(JSON.parse(JSON.stringify(s)))
    expect(round!.title).toBe(RESIDENTIAL_HOUSEKEEPING_TITLE) // NOT defaulted to FPR title
    expect(round!.sections.length).toBe(RESIDENTIAL_HOUSEKEEPING_SECTIONS.length)
    expect(round!.exclusions).toEqual(RESIDENTIAL_HOUSEKEEPING_EXCLUSIONS)
  })
})

describe('service taxonomy — Residential Housekeeping registration', () => {
  it('appears as a residential service type, never commercial', () => {
    const residential = SERVICE_TYPES_BY_CATEGORY.residential.map((t) => t.value)
    expect(residential).toContain('residential_housekeeping')
    expect(residential).toContain('full_property_reset') // FPR still present
    for (const cat of ['property_management', 'airbnb', 'commercial'] as const) {
      expect(SERVICE_TYPES_BY_CATEGORY[cat].map((t) => t.value)).not.toContain('residential_housekeeping')
    }
  })
  it('is labelled "Residential Housekeeping" in the selector', () => {
    const entry = SERVICE_TYPES_BY_CATEGORY.residential.find((t) => t.value === 'residential_housekeeping')
    expect(entry?.label).toBe('Residential Housekeeping')
  })

  it('is MANUAL-priced (not pricing-eligible) — no rate×qty calculator, like FPR', () => {
    // Not in service_multipliers → isPricingEligible false → forced manual price.
    expect(isPricingEligible('residential', 'residential_housekeeping')).toBe(false)
    expect(isPricingEligible('residential', 'full_property_reset')).toBe(false)
    // A normal residential clean stays calculator-eligible (unchanged).
    expect(isPricingEligible('residential', 'standard_clean')).toBe(true)
  })

  it('is NOT recurring — the weekly nature is wording only (no frequency engine)', () => {
    expect(supportsRecurring('residential', 'residential_housekeeping')).toBe(false)
  })
})
