/**
 * Manual scope sections — end-to-end through the proposal payload.
 *
 * Covers the two behaviours that would be silently wrong on a client
 * PDF: manual sections must render AFTER the generated (costed) groups,
 * and they must not leak into the Service Overview "Areas covered"
 * cell, which lists areas of the site rather than extra tasks.
 */

import { buildProposalPayload } from '@/lib/commercialProposalMapping'
import { fromCommercialProposalPayload } from '@/lib/proposals/buildProposalPayload'
import type { CommercialQuoteDetails, CommercialScopeItem } from '@/lib/commercialQuote'

function details(overrides: Partial<CommercialQuoteDetails> = {}): CommercialQuoteDetails {
  return {
    id: 'd1', quote_id: 'q1',
    sector_category: 'office', sector_subtype: null, building_type: null,
    service_days: ['mon'], service_window: null,
    access_requirements: null, consumables_by: null,
    occupancy_level: null, traffic_level: null,
    total_area_m2: null, carpet_area_m2: null, hard_floor_area_m2: null, floor_count: null,
    toilets_count: null, urinals_count: null, showers_count: null, basins_count: null,
    kitchens_count: null, desks_count: null, offices_count: null, meeting_rooms_count: null,
    reception_count: null, corridors_stairs_notes: null, external_glass_notes: null,
    compliance_notes: null, assumptions: null, exclusions: null, sector_fields: {},
    selected_margin_tier: null, labour_cost_basis: null,
    estimated_service_hours: null, estimated_weekly_hours: null, estimated_monthly_hours: null,
    contact_name: null, contact_email: null, contact_phone: null,
    accounts_email: null, accounts_contact_name: null,
    client_reference: null, requires_po: false,
    contract_term: null, notice_period_days: null, service_start_date: null,
    is_one_off: false, manual_scope_sections: [],
    cleaning_standard: null, security_sensitive: false, induction_required: false,
    restricted_areas: false, restricted_areas_notes: null,
    created_at: '', updated_at: '',
    ...overrides,
  }
}

function scopeItem(overrides: Partial<CommercialScopeItem> = {}): CommercialScopeItem {
  return {
    id: 's1', quote_id: 'q1',
    area_type: 'general_areas', task_group: null,
    task_name: 'Vacuum all carpeted areas',
    frequency: 'weekly', quantity_type: null, quantity_value: null,
    unit_minutes: 10, production_rate: null, input_mode: 'measured',
    included: true, notes: null, display_order: 0, created_at: '',
    ...overrides,
  }
}

function build(manual: unknown) {
  const legacy = buildProposalPayload({
    quote: {
      id: 'q1', quote_number: 'QT-0001', status: 'draft',
      date_issued: null, valid_until: null, accepted_at: null,
      service_address: '1 Test St', notes: null,
      base_price: 1000, discount: null, gst_included: true, payment_type: null,
    },
    client: { name: 'Test Co', company_name: 'Test Co', service_address: '1 Test St', phone: null, email: null },
    addons: [],
    details: details({ manual_scope_sections: manual as never }),
    scope: [scopeItem()],
  })
  return fromCommercialProposalPayload(legacy)
}

describe('manual scope sections in the proposal payload', () => {
  it('appends manual sections after the generated scope groups', () => {
    const payload = build([
      { title: 'Deep clean extras', items: ['Degrease filters', 'Steam clean seating'] },
    ])

    const titles = payload.scopeSections.map((s) => s.title)
    expect(titles[titles.length - 1]).toBe('Deep clean extras')
    // The generated group still leads.
    expect(titles.length).toBeGreaterThan(1)
    expect(titles[0]).not.toBe('Deep clean extras')
  })

  it('renders manual items verbatim, with no frequency suffix', () => {
    const payload = build([{ title: 'Extras', items: ['Degrease filters'] }])
    const manual = payload.scopeSections.find((s) => s.title === 'Extras')

    expect(manual?.items).toEqual(['Degrease filters'])
    // Costed rows get "(weekly)" etc; manual rows are not costed so
    // there is no frequency to state.
    expect(manual?.items[0]).not.toMatch(/\(/)
  })

  it('keeps manual sections out of "Areas covered"', () => {
    const payload = build([{ title: 'Deep clean extras', items: ['Degrease filters'] }])
    expect(payload.areasCovered).not.toContain('Deep clean extras')
    expect(payload.scopeSections.map((s) => s.title)).toContain('Deep clean extras')
  })

  it('falls back to a neutral heading for an untitled section', () => {
    const payload = build([{ title: '', items: ['Wash internal glass'] }])
    expect(payload.scopeSections.map((s) => s.title)).toContain('Additional scope')
  })

  it('changes nothing when there are no manual sections', () => {
    const withNone = build([])
    const withNull = build(null)

    expect(withNone.scopeSections).toEqual(withNull.scopeSections)
    expect(withNone.scopeSections.map((s) => s.title)).toEqual(withNone.areasCovered)
  })

  it('does not let malformed jsonb reach the rendered scope', () => {
    const payload = build(['garbage', null, { items: [] }, 42])
    expect(payload.scopeSections.map((s) => s.title)).not.toContain('Additional scope')
    expect(payload.scopeSections.map((s) => s.title)).toEqual(payload.areasCovered)
  })
})
