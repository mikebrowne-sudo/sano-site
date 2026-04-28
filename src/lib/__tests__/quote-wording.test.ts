import {
  ADDON_OPTIONS,
  CONDITION_OPTIONS,
  closingLineFor,
  filterAddonsForServiceType,
  generateQuoteScope,
  SERVICE_TYPES_BY_CATEGORY,
} from '../quote-wording'

describe('SERVICE_TYPES_BY_CATEGORY', () => {
  it('residential includes post_construction', () => {
    const codes = SERVICE_TYPES_BY_CATEGORY.residential.map((t) => t.value)
    expect(codes).toContain('post_construction')
    expect(codes).toContain('standard_clean')
    expect(codes).toContain('deep_clean')
    expect(codes).toContain('move_in_out')
    expect(codes).toContain('pre_sale')
  })
})

describe('filterAddonsForServiceType', () => {
  it('drops deprecated codes for any service type', () => {
    const visible = filterAddonsForServiceType('standard_clean').map((a) => a.value)
    expect(visible).not.toContain('interior_window')
    expect(visible).not.toContain('glass_doors')
    expect(visible).not.toContain('wall_spot_cleaning')
    expect(visible).not.toContain('skirting_detailing')
    expect(visible).not.toContain('outdoor_areas')
  })

  it('keeps the new high-value extras for standard clean', () => {
    const visible = filterAddonsForServiceType('standard_clean').map((a) => a.value)
    expect(visible).toEqual(expect.arrayContaining([
      'oven_clean', 'fridge_clean', 'carpet_cleaning',
      'upholstery_cleaning', 'exterior_window', 'pressure_washing',
      'rubbish_removal', 'garage_full',
    ]))
  })

  it('hides inside_cupboards / inside_wardrobes for end of tenancy + move-in-out', () => {
    const eot = filterAddonsForServiceType('end_of_tenancy').map((a) => a.value)
    expect(eot).not.toContain('inside_cupboards')
    expect(eot).not.toContain('inside_wardrobes')

    const move = filterAddonsForServiceType('move_in_out').map((a) => a.value)
    expect(move).not.toContain('inside_cupboards')
    expect(move).not.toContain('inside_wardrobes')
  })

  it('hides high_dusting for deep clean and post construction (already baseline)', () => {
    expect(filterAddonsForServiceType('deep_clean').map((a) => a.value)).not.toContain('high_dusting')
    expect(filterAddonsForServiceType('post_construction').map((a) => a.value)).not.toContain('high_dusting')
  })

  it('keeps inside_cupboards available for standard clean (legitimate extra)', () => {
    expect(filterAddonsForServiceType('standard_clean').map((a) => a.value)).toContain('inside_cupboards')
  })
})

describe('ADDON_OPTIONS — backwards compat for legacy codes', () => {
  it('every legacy code still resolves to a label + wording', () => {
    const legacy = [
      'interior_window', 'glass_doors', 'wall_spot_cleaning',
      'skirting_detailing', 'spot_treatment', 'outdoor_areas',
      'garage_clean', 'mould_treatment',
    ]
    for (const code of legacy) {
      const entry = ADDON_OPTIONS.find((a) => a.value === code)
      expect(entry).toBeDefined()
      expect(entry?.label).toBeTruthy()
      expect(entry?.wording).toBeTruthy()
    }
  })
})

describe('generateQuoteScope — structural rules', () => {
  it('returns empty string when category or type missing', () => {
    expect(generateQuoteScope({})).toBe('')
    expect(generateQuoteScope({ service_category: 'residential' })).toBe('')
  })

  it('contains no Sano 100-Point reference', () => {
    const out = generateQuoteScope({
      service_category: 'residential',
      service_type_code: 'standard_clean',
      bedrooms: 3, bathrooms: 2,
    })
    expect(out).not.toMatch(/100-?point/i)
    expect(out).not.toMatch(/sano 100/i)
  })

  it('does not list rooms as a checklist or use "This service includes"', () => {
    const out = generateQuoteScope({
      service_category: 'residential',
      service_type_code: 'standard_clean',
      bedrooms: 3, bathrooms: 2,
    })
    expect(out).not.toMatch(/this service includes/i)
    // Bullet patterns are forbidden:
    expect(out).not.toMatch(/^- /m)
  })

  it('emits 3-6 sentences for a basic standard clean', () => {
    const out = generateQuoteScope({
      service_category: 'residential',
      service_type_code: 'standard_clean',
      bedrooms: 3, bathrooms: 2,
    })
    const sentences = out.split(/(?<=\.)\s+/).filter(Boolean)
    expect(sentences.length).toBeGreaterThanOrEqual(3)
    expect(sentences.length).toBeLessThanOrEqual(6)
  })

  it('includes the service-specific closing for deep clean', () => {
    const out = generateQuoteScope({
      service_category: 'residential',
      service_type_code: 'deep_clean',
      bedrooms: 3, bathrooms: 2,
    })
    expect(out).toContain('top-to-bottom approach')
  })

  it('includes the handover-ready closing for end of tenancy', () => {
    const out = generateQuoteScope({
      service_category: 'property_management',
      service_type_code: 'end_of_tenancy',
      bedrooms: 3, bathrooms: 2,
    })
    expect(out).toContain('handover-ready standard')
  })

  it('includes the guest-ready closing for airbnb turnover', () => {
    const out = generateQuoteScope({
      service_category: 'airbnb',
      service_type_code: 'turnover',
      bedrooms: 2, bathrooms: 1,
    })
    expect(out).toContain('guest-ready standard')
  })

  it('weaves a condition-focus sentence when condition tags are set', () => {
    const out = generateQuoteScope({
      service_category: 'residential',
      service_type_code: 'standard_clean',
      bedrooms: 3, bathrooms: 2,
      condition_tags: ['build_up_present'],
    })
    expect(out).toMatch(/the property is showing build-up in places/i)
    expect(out).toMatch(/the focus will be/i)
  })

  it('uses "site" subject for commercial condition sentences', () => {
    const out = generateQuoteScope({
      service_category: 'commercial',
      service_type_code: 'maintenance',
      site_type: 'an office site',
      condition_tags: ['commercial_regular_use'],
    })
    expect(out).toMatch(/the site is a high-traffic site/i)
  })

  it('emits an extras sentence only when add-ons are selected', () => {
    const without = generateQuoteScope({
      service_category: 'residential',
      service_type_code: 'standard_clean',
      bedrooms: 3, bathrooms: 2,
    })
    expect(without).not.toMatch(/this includes oven|this includes carpet|this includes blinds/i)

    const withExtras = generateQuoteScope({
      service_category: 'residential',
      service_type_code: 'standard_clean',
      bedrooms: 3, bathrooms: 2,
      addons_wording: ['oven_clean', 'carpet_cleaning'],
    })
    expect(withExtras).toMatch(/this includes oven deep clean and carpet cleaning/i)
  })

  it('opens with bedroom/bathroom phrasing when the numbers are present', () => {
    const out = generateQuoteScope({
      service_category: 'residential',
      service_type_code: 'standard_clean',
      bedrooms: 3, bathrooms: 2,
    })
    expect(out).toMatch(/3-bedroom, 2-bathroom/i)
  })
})

describe('closingLineFor', () => {
  it('returns the post-construction closing', () => {
    expect(closingLineFor('residential', 'post_construction'))
      .toMatch(/remove dust and residue/i)
  })

  it('falls back to a generic line when keys are unknown', () => {
    expect(closingLineFor('residential', 'made_up_type'))
      .toMatch(/consistent, professional standard/i)
  })
})

describe('CONDITION_OPTIONS — focus phrases for the description engine', () => {
  it('every common residential condition tag has a focus phrase', () => {
    const required = ['well_maintained', 'average_condition', 'build_up_present', 'high_use_areas', 'vacant_property', 'recently_renovated']
    for (const code of required) {
      const opt = CONDITION_OPTIONS.find((c) => c.value === code)
      expect(opt?.focus).toBeTruthy()
    }
  })
})
