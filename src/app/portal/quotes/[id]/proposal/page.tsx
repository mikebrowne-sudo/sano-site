// Dedicated commercial proposal route — internal view.
//
// Loads quote + client + commercial_quote_details + commercial_scope_items
// and renders the CommercialProposalTemplate. Commercial-only: gracefully
// fails for non-commercial quotes with an inline message + back link. The
// regular quote detail/edit flow is untouched.
//
// A future public share route (e.g. /share/proposal/[token]) can import
// the same template + mapping module without changes.

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CommercialProposalTemplate } from '@/app/portal/quotes/_components/commercial/CommercialProposalTemplate'
import { buildProposalPayload } from '@/lib/commercialProposalMapping'
import type { CommercialQuoteDetails, CommercialScopeItem } from '@/lib/commercialQuote'

export const metadata: Metadata = { robots: 'noindex, nofollow' }

export default async function CommercialProposalPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

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
    .eq('id', params.id)
    .single()

  if (error || !quote) notFound()

  // Graceful fail for non-commercial quotes.
  if (quote.service_category !== 'commercial') {
    return (
      <div style={{ maxWidth: 640, margin: '80px auto', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <Link
          href={`/portal/quotes/${params.id}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#076653', textDecoration: 'none', fontSize: 14, marginBottom: 16 }}
        >
          <ArrowLeft size={14} /> Back to quote
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#06231D', margin: '0 0 10px' }}>Commercial proposal unavailable</h1>
        <p style={{ fontSize: 14, color: '#5C6B64', lineHeight: 1.6, margin: 0 }}>
          The commercial proposal view is only available for quotes with <code>service_category = &#39;commercial&#39;</code>.
          This quote&apos;s category is <code>{quote.service_category ?? 'not set'}</code>. Edit the quote and set the service
          category to commercial to access the proposal.
        </p>
      </div>
    )
  }

  const [
    { data: items },
    { data: details },
    { data: scope },
  ] = await Promise.all([
    supabase
      .from('quote_items')
      .select('id, label, price, sort_order')
      .eq('quote_id', params.id)
      .order('sort_order'),
    supabase
      .from('commercial_quote_details')
      .select('*')
      .eq('quote_id', params.id)
      .maybeSingle(),
    supabase
      .from('commercial_scope_items')
      .select('*')
      .eq('quote_id', params.id)
      .order('display_order'),
  ])

  // Commercial details row missing — render the template with an empty
  // details placeholder so the operator sees what's still to capture.
  // We synthesise a minimal stub so the mapping functions (which expect
  // a non-null details row) run cleanly.
  const detailsRow: CommercialQuoteDetails = (details as unknown as CommercialQuoteDetails | null) ?? {
    id: '',
    quote_id: quote.id as string,
    sector_category: 'custom',
    sector_subtype: null,
    building_type: null,
    service_days: null,
    service_window: null,
    access_requirements: null,
    consumables_by: null,
    occupancy_level: null,
    traffic_level: null,
    total_area_m2: null,
    carpet_area_m2: null,
    hard_floor_area_m2: null,
    floor_count: null,
    toilets_count: null,
    urinals_count: null,
    showers_count: null,
    basins_count: null,
    kitchens_count: null,
    desks_count: null,
    offices_count: null,
    meeting_rooms_count: null,
    reception_count: null,
    corridors_stairs_notes: null,
    external_glass_notes: null,
    compliance_notes: null,
    assumptions: null,
    exclusions: null,
    sector_fields: {},
    selected_margin_tier: null,
    labour_cost_basis: null,
    estimated_service_hours: null,
    estimated_weekly_hours: null,
    estimated_monthly_hours: null,
    // Phase 5A — tender field stub defaults
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    accounts_email: null,
    accounts_contact_name: null,
    client_reference: null,
    requires_po: false,
    contract_term: null,
    notice_period_days: null,
    service_start_date: null,
    cleaning_standard: null,
    security_sensitive: false,
    induction_required: false,
    restricted_areas: false,
    restricted_areas_notes: null,
    created_at: '',
    updated_at: '',
  }

  // Phase 5D — universal contact / billing / reference fields now live on
  // quotes. Override the legacy commercial_quote_details columns so the
  // proposal mappers (which read details.{field}) see the authoritative
  // values. COALESCE-style precedence: quote first, fall back to details.
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

  const payload = buildProposalPayload({
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

  return <CommercialProposalTemplate payload={payload} />
}
