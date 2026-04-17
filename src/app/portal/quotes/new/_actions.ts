'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

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

  // Service details
  property_category?: string
  type_of_clean?: string
  service_type?: string
  frequency?: string
  scope_size?: string
  service_address?: string
  preferred_dates?: string
  scheduled_clean_date?: string
  notes?: string

  // Pricing
  base_price: number
  discount: number
  gst_included: boolean
  payment_type?: string

  // Add-ons
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
      service_address: input.service_address || null,
      preferred_dates: input.preferred_dates || null,
      scheduled_clean_date: input.scheduled_clean_date || null,
      notes: input.notes || null,
      base_price: input.base_price,
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
