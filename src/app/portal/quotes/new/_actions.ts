'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import type { PricingBreakdown, PricingMode } from '@/lib/quote-pricing'
import { validateCreateQuoteOverride } from './_actions-validation'
import type {
  CommercialDetailsInput,
  CommercialScopeItemInput,
} from '../_actions-commercial'

interface AddonInput {
  label: string
  price: number
  sort_order: number
}

interface NewClientInput {
  name: string
  company_name?: string
  email?: string
  phone?: string
  service_address?: string
  billing_address?: string
  billing_same_as_service?: boolean
}

interface CreateQuoteInput {
  // Client
  client_id?: string
  new_client?: NewClientInput

  // Service details (legacy)
  property_category?: string
  type_of_clean?: string
  service_type?: string
  scope_size?: string
  // Service details (structured builder — Phase 1 of quote wording system)
  service_category?: string
  service_type_code?: string
  property_type?: string
  bedrooms?: number
  bathrooms?: number
  site_type?: string
  areas_included?: string[]
  condition_tags?: string[]
  addons_wording?: string[]
  generated_scope?: string
  description_edited?: boolean

  frequency?: string
  service_address?: string
  preferred_dates?: string
  scheduled_clean_date?: string
  notes?: string

  // Pricing
  base_price: number
  discount: number
  gst_included: boolean
  payment_type?: string

  // Pricing engine fields (null when ineligible)
  pricing_mode?: PricingMode
  estimated_hours?: number
  pricing_breakdown?: PricingBreakdown
  calculated_price?: number | null

  // Commercial calculator integration (null when not calc-driven)
  commercial_calc_id?: string | null

  // Commercial quote engine (Phase 0+1) — only applied when service_category === 'commercial'.
  commercial_details?: CommercialDetailsInput
  commercial_scope?: CommercialScopeItemInput[]

  // Override fields
  is_price_overridden?: boolean
  override_price?: number | null
  override_reason?: string | null
  override_confirmed?: boolean

  // Add-ons (priced line items — distinct from addons_wording)
  addons: AddonInput[]
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export async function createQuote(input: CreateQuoteInput) {
  const supabase = createClient()

  const overrideErr = validateCreateQuoteOverride({
    is_price_overridden: input.is_price_overridden ?? false,
    override_price: input.override_price ?? null,
    override_reason: input.override_reason ?? null,
    override_confirmed: input.override_confirmed ?? false,
  })
  if (overrideErr) return { error: overrideErr }

  const { data: { user } } = await supabase.auth.getUser()
  const overrideConfirmedBy = input.is_price_overridden && user?.id ? user.id : null
  const overrideConfirmedAt = input.is_price_overridden && user?.id ? new Date().toISOString() : null

  const today = new Date().toISOString().slice(0, 10)
  const validUntil = addDaysISO(today, 30)

  // 1. Resolve client_id — create new client if needed
  let clientId = input.client_id

  if (!clientId && input.new_client) {
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .insert({
        name: input.new_client.name,
        company_name: input.new_client.company_name || null,
        email: input.new_client.email || null,
        phone: input.new_client.phone || null,
        service_address: input.new_client.service_address || null,
        billing_address: input.new_client.billing_same_as_service ? null : (input.new_client.billing_address || null),
        billing_same_as_service: input.new_client.billing_same_as_service ?? true,
      })
      .select('id')
      .single()

    if (clientErr || !client) {
      return { error: `Failed to create client: ${clientErr?.message}` }
    }
    clientId = client.id
  }

  if (!clientId) {
    return { error: 'A client is required.' }
  }

  // 2. Create quote
  const { data: quote, error: quoteErr } = await supabase
    .from('quotes')
    .insert({
      client_id: clientId,
      property_category: input.property_category || null,
      type_of_clean: input.type_of_clean || null,
      service_type: input.service_type || null,
      frequency: input.frequency || null,
      scope_size: input.scope_size || null,
      // Structured scope fields
      service_category: input.service_category || null,
      service_type_code: input.service_type_code || null,
      property_type: input.property_type || null,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
      site_type: input.site_type || null,
      areas_included: input.areas_included ?? [],
      condition_tags: input.condition_tags ?? [],
      addons_wording: input.addons_wording ?? [],
      generated_scope: input.generated_scope || null,
      description_edited: input.description_edited ?? false,
      service_address: input.service_address || null,
      preferred_dates: input.preferred_dates || null,
      scheduled_clean_date: input.scheduled_clean_date || null,
      notes: input.notes || null,
      base_price: input.base_price,
      calculated_price: input.calculated_price ?? null,
      is_price_overridden: input.is_price_overridden ?? false,
      override_price: input.override_price ?? null,
      override_reason: input.override_reason ?? null,
      override_confirmed: input.override_confirmed ?? false,
      override_confirmed_by: overrideConfirmedBy,
      override_confirmed_at: overrideConfirmedAt,
      pricing_mode: input.pricing_mode ?? null,
      estimated_hours: input.estimated_hours ?? null,
      pricing_breakdown: input.pricing_breakdown ?? null,
      commercial_calc_id: input.commercial_calc_id ?? null,
      discount: input.discount,
      gst_included: input.gst_included,
      payment_type: input.payment_type || 'cash_sale',
      date_issued: today,
      valid_until: validUntil,
    })
    .select('id')
    .single()

  if (quoteErr || !quote) {
    return { error: `Failed to create quote: ${quoteErr?.message}` }
  }

  // 3. Create quote_items
  if (input.addons.length > 0) {
    const items = input.addons.map((a) => ({
      quote_id: quote.id,
      label: a.label,
      price: a.price,
      sort_order: a.sort_order,
    }))

    const { error: itemsErr } = await supabase
      .from('quote_items')
      .insert(items)

    if (itemsErr) {
      return { error: `Quote created but add-ons failed: ${itemsErr.message}` }
    }
  }

  // 4. Commercial — only when this is a commercial quote. Runs after the
  // quote row exists so foreign keys resolve. Inlined (rather than calling
  // saveCommercialDetails / saveCommercialScope) so the nested actions'
  // revalidatePath calls don't preempt the outer redirect() below. The
  // public commercial actions are still used by the edit flow, where they
  // run as top-level client-invoked actions and can safely revalidate.
  if (input.service_category === 'commercial') {
    if (input.commercial_details) {
      const cd = input.commercial_details
      const { error: detailsErr } = await supabase
        .from('commercial_quote_details')
        .insert({
          quote_id: quote.id,
          sector_category: cd.sector_category,
          sector_subtype: cd.sector_subtype ?? null,
          building_type: cd.building_type ?? null,
          service_days: cd.service_days ?? null,
          service_window: cd.service_window ?? null,
          access_requirements: cd.access_requirements ?? null,
          consumables_by: cd.consumables_by ?? null,
          occupancy_level: cd.occupancy_level ?? null,
          traffic_level: cd.traffic_level ?? null,
          total_area_m2: cd.total_area_m2 ?? null,
          carpet_area_m2: cd.carpet_area_m2 ?? null,
          hard_floor_area_m2: cd.hard_floor_area_m2 ?? null,
          floor_count: cd.floor_count ?? null,
          toilets_count: cd.toilets_count ?? null,
          urinals_count: cd.urinals_count ?? null,
          showers_count: cd.showers_count ?? null,
          basins_count: cd.basins_count ?? null,
          kitchens_count: cd.kitchens_count ?? null,
          desks_count: cd.desks_count ?? null,
          offices_count: cd.offices_count ?? null,
          meeting_rooms_count: cd.meeting_rooms_count ?? null,
          reception_count: cd.reception_count ?? null,
          corridors_stairs_notes: cd.corridors_stairs_notes ?? null,
          external_glass_notes: cd.external_glass_notes ?? null,
          compliance_notes: cd.compliance_notes ?? null,
          assumptions: cd.assumptions ?? null,
          exclusions: cd.exclusions ?? null,
          sector_fields: cd.sector_fields ?? {},
          selected_margin_tier: cd.selected_margin_tier ?? null,
          labour_cost_basis: cd.labour_cost_basis ?? null,
          estimated_service_hours: cd.estimated_service_hours ?? null,
          estimated_weekly_hours: cd.estimated_weekly_hours ?? null,
          estimated_monthly_hours: cd.estimated_monthly_hours ?? null,
        })
      if (detailsErr) {
        return { error: `Quote created but commercial details failed: ${detailsErr.message}` }
      }
    }

    if (input.commercial_scope && input.commercial_scope.length > 0) {
      const rows = input.commercial_scope.map((i, idx) => ({
        quote_id: quote.id,
        area_type: i.area_type ?? null,
        task_group: i.task_group ?? null,
        task_name: i.task_name,
        frequency: i.frequency ?? null,
        quantity_type: i.quantity_type ?? null,
        quantity_value: i.quantity_value ?? null,
        unit_minutes: i.unit_minutes ?? null,
        production_rate: i.production_rate ?? null,
        included: i.included ?? true,
        notes: i.notes ?? null,
        display_order: i.display_order ?? idx,
      }))
      const { error: scopeErr } = await supabase
        .from('commercial_scope_items')
        .insert(rows)
      if (scopeErr) {
        return { error: `Quote created but commercial scope failed: ${scopeErr.message}` }
      }
    }
  }

  redirect(`/portal/quotes/${quote.id}`)
}
