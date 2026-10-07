/**
 * Hospitality sector — field pack, multiplier, and proposal wording.
 *
 * Restaurants, bars and breweries were previously quoted as `custom`, which
 * gave no sector prompts and no venue-aware proposal copy. These pin the new
 * sector end to end: the enum accepts it, the engine prices it, and the
 * proposal says the things a venue operator actually needs to read.
 *
 * The wording tests matter most. Proposal copy is customer-facing and is
 * built only from captured fields — an unanswered field must produce NO
 * sentence rather than an assumption made on the client's behalf.
 */

import {
  isSectorCategory,
  SECTOR_FIELD_PACKS,
  SECTOR_MULTIPLIER,
  type CommercialQuoteDetails,
} from '@/lib/commercialQuote'
import { buildSiteUnderstanding, sectorLabel } from '@/lib/commercialProposalMapping'

function details(sectorFields: Record<string, unknown> = {}): CommercialQuoteDetails {
  return {
    sector_category: 'hospitality',
    sector_fields: sectorFields,
    security_sensitive: false,
    induction_required: false,
    restricted_areas: false,
  } as unknown as CommercialQuoteDetails
}

describe('hospitality — sector plumbing', () => {
  it('is a valid sector category', () => {
    expect(isSectorCategory('hospitality')).toBe(true)
  })

  it('has a field pack covering the venue-specific cost drivers', () => {
    const keys = SECTOR_FIELD_PACKS.hospitality.map((f) => f.key)
    // The fields that actually move the hours on a venue.
    expect(keys).toEqual(expect.arrayContaining([
      'hospitality_type',
      'commercial_kitchen_in_scope',
      'access_timing',
      'outdoor_areas_in_scope',
      'seasonal_variation_notes',
      'consumables_scope',
    ]))
  })

  it('prices at a venue multiplier above office', () => {
    expect(SECTOR_MULTIPLIER.hospitality).toBeGreaterThan(SECTOR_MULTIPLIER.office)
  })

  it('has a customer-facing label', () => {
    expect(sectorLabel('hospitality')).toBe('Hospitality')
  })
})

describe('hospitality — proposal wording', () => {
  it('says nothing when no hospitality fields were captured', () => {
    // The discipline that matters: no captured data means no sentence, never
    // an assumption written on the client's behalf.
    expect(buildSiteUnderstanding(details())).toBe('')
  })

  it('names the venue type and licensed status', () => {
    const out = buildSiteUnderstanding(details({
      hospitality_type: 'brewery', licensed_premises: true, covers_seated: 120,
    }))
    expect(out).toContain('licensed brewery')
    expect(out).toContain('120 covers')
  })

  it('states the kitchen boundary plainly when excluded', () => {
    const out = buildSiteUnderstanding(details({ commercial_kitchen_in_scope: 'excluded' }))
    expect(out).toContain('remains the responsibility of your own team')
    expect(out).toContain('exclusions below')
  })

  it('scopes the kitchen to floors only when that is the arrangement', () => {
    const out = buildSiteUnderstanding(details({ commercial_kitchen_in_scope: 'floors_only' }))
    expect(out).toContain('floors only')
  })

  it('describes access timing in the client’s terms', () => {
    const evening = buildSiteUnderstanding(details({ access_timing: 'post_close_evening' }))
    expect(evening).toContain('after close each evening')

    const morning = buildSiteUnderstanding(details({ access_timing: 'pre_open_morning' }))
    expect(morning).toContain('before opening each morning')
  })

  it('covers outdoor areas and surfaces when in scope', () => {
    const out = buildSiteUnderstanding(details({
      outdoor_areas_in_scope: true,
      outdoor_surface_types: ['limestone', 'paving'],
    }))
    expect(out).toContain('Outdoor areas are included')
    expect(out).toContain('limestone')
  })

  it('disclaims playground safety inspection when a playground is present', () => {
    const out = buildSiteUnderstanding(details({
      outdoor_areas_in_scope: true, playground_present: true,
    }))
    // Real liability line — tidying is not a safety inspection.
    expect(out).toContain('not included')
    expect(out).toMatch(/safety inspection/i)
  })

  it('records seasonal variation and points at per-visit pricing', () => {
    const out = buildSiteUnderstanding(details({
      seasonal_variation_notes: '4 cleans per week in winter, 5 per week over summer',
    }))
    expect(out).toContain('4 cleans per week in winter')
    expect(out).toContain('charged per visit')
  })

  it('states who supplies consumables', () => {
    const out = buildSiteUnderstanding(details({ consumables_scope: 'client_supplies' }))
    expect(out).toMatch(/supplied by you/i)
  })

  it('uses no forbidden brand phrases', () => {
    const out = buildSiteUnderstanding(details({
      hospitality_type: 'restaurant', licensed_premises: true, covers_seated: 80,
      commercial_kitchen_in_scope: 'excluded', access_timing: 'post_close_evening',
      outdoor_areas_in_scope: true, outdoor_surface_types: ['decking'],
      playground_present: true, consumables_scope: 'sano_supplies',
      seasonal_variation_notes: '4 in winter, 5 in summer',
    })).toLowerCase()
    expect(out).not.toContain('premium')
    expect(out).not.toContain('eco-friendly')
    expect(out).not.toContain('industry-leading')
  })
})
