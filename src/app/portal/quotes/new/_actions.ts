'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import type { PricingBreakdown, PricingMode } from '@/lib/quote-pricing'

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
      pricing_mode: input.pricing_mode ?? null,
      estimated_hours: input.estimated_hours ?? null,
      pricing_breakdown: input.pricing_breakdown ?? null,
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

  redirect(`/portal/quotes/${quote.id}`)
}
