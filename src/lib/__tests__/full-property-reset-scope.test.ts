import {
  buildDefaultResetScope,
  buildResetIntro,
  buildResetCompletion,
  normaliseStructuredScope,
  isStructuredScope,
  FULL_PROPERTY_RESET_SECTIONS,
  FULL_PROPERTY_RESET_NOTES,
  FULL_PROPERTY_RESET_TITLE,
  type StructuredScope,
} from '@/lib/full-property-reset-scope'

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
