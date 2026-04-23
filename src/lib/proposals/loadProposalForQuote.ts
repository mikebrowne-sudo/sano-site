// Proposal Phase 2 — shared loader.
//
// Used by:
//   • /portal/quotes/[id]/proposal/preview  (HTML preview route)
//   • /api/proposals/[id]/pdf                (Puppeteer PDF route)
//
// Loads a commercial quote + its commercial details + scope items +
// addons + proposal settings, then runs everything through the existing
// buildProposalPayload + fromCommercialProposalPayload adapter to
// produce the slim ProposalTemplatePayload the new template renders.
//
// Returns null when:
//   • the quote doesn't exist
//   • the quote is not commercial
// Both routes treat null as 404 / "not available".
//
// Throws nothing — every failure path returns null. The caller decides
// the response shape.

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fromCommercialProposalPayload,
  type ProposalTemplatePayload,
} from './buildProposalPayload'
import { loadProposalSettings } from './proposal-settings'
import { buildProposalPayload } from '@/lib/commercialProposalMapping'
import type { CommercialQuoteDetails, CommercialScopeItem } from '@/lib/commercialQuote'

export async function loadProposalForQuote(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public'>,
  quoteId: string,
): Promise<{ payload: ProposalTemplatePayload; quoteNumber: string } | null> {
  // 1. Quote + linked client
  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      id, quote_number, status, accepted_at, date_issued, valid_until,
      service_category, service_address, notes,
      base_price, discount, gst_included, payment_type,
      contact_name, contact_email, contact_phone,
      accounts_contact_name, accounts_email,
      client_reference, requires_po,
      clients ( name, company_name, service_address, phone, email )
    `)
    .eq('id', quoteId)
    .single()

  if (error || !quote) return null
  if (quote.service_category !== 'commercial') return null

  // 2. Items + commercial details + scope items + settings, in parallel
  const [
    { data: items },
    { data: details },
    { data: scope },
    settings,
  ] = await Promise.all([
    supabase
      .from('quote_items')
      .select('id, label, price, sort_order')
      .eq('quote_id', quoteId)
      .order('sort_order'),
    supabase
      .from('commercial_quote_details')
      .select('*')
      .eq('quote_id', quoteId)
      .maybeSingle(),
    supabase
      .from('commercial_scope_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('display_order'),
    loadProposalSettings(supabase),
  ])

  // 3. Synthesise a minimal commercial-details stub when the quote
  //    hasn't filled them in yet — same fallback the preview route
  //    used previously, kept here so both routes behave identically.
  const detailsRow: CommercialQuoteDetails = (details as unknown as CommercialQuoteDetails | null) ?? {
    id: '',
    quote_id: quote.id as string,
    sector_category: 'custom',
    sector_subtype: null, building_type: null, service_days: null, service_window: null,
    access_requirements: null, consumables_by: null, occupancy_level: null, traffic_level: null,
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
    cleaning_standard: null, security_sensitive: false, induction_required: false,
    restricted_areas: false, restricted_areas_notes: null,
    created_at: '', updated_at: '',
  }

  // 4. Universal billing precedence — quote-level fields override
  //    any older values stored on commercial_quote_details. Same merge
  //    used by the existing /proposal route.
  const detailsWithUniversal: CommercialQuoteDetails = {
    ...detailsRow,
    contact_name:          (quote.contact_name as string | null)          ?? detailsRow.contact_name,
    contact_email:         (quote.contact_email as string | null)         ?? detailsRow.contact_email,
    contact_phone:         (quote.contact_phone as string | null)         ?? detailsRow.contact_phone,
    accounts_contact_name: (quote.accounts_contact_name as string | null) ?? detailsRow.accounts_contact_name,
    accounts_email:        (quote.accounts_email as string | null)        ?? detailsRow.accounts_email,
    client_reference:      (quote.client_reference as string | null)      ?? detailsRow.client_reference,
    requires_po:           (quote.requires_po as boolean | null)          ?? detailsRow.requires_po,
  }

  const client = quote.clients as unknown as {
    name: string | null
    company_name: string | null
    service_address: string | null
    phone: string | null
    email: string | null
  } | null

  // 5. Build the existing big ProposalPayload
  const legacy = buildProposalPayload({
    quote: {
      id: quote.id as string,
      quote_number: quote.quote_number as string,
      status: (quote.status as string | null) ?? null,
      date_issued: (quote.date_issued as string | null) ?? null,
      valid_until: (quote.valid_until as string | null) ?? null,
      accepted_at: (quote.accepted_at as string | null) ?? null,
      service_address: (quote.service_address as string | null) ?? null,
      notes: (quote.notes as string | null) ?? null,
      base_price: (quote.base_price as number) ?? 0,
      discount: (quote.discount as number | null) ?? null,
      gst_included: (quote.gst_included as boolean) ?? true,
      payment_type: (quote.payment_type as string | null) ?? null,
    },
    client,
    addons: (items ?? []).map((it) => ({
      label: it.label as string,
      price: (it.price as number) ?? 0,
      sort_order: (it.sort_order as number) ?? 0,
    })),
    details: detailsWithUniversal,
    scope: (scope as unknown as CommercialScopeItem[]) ?? [],
  })

  // 6. Map to the slim template payload (with settings merged in)
  const payload = fromCommercialProposalPayload(legacy, settings)
  return { payload, quoteNumber: quote.quote_number as string }
}
