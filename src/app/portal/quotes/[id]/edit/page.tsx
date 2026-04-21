// Dedicated edit route for an existing quote.
//
// Thin wrapper: loads the same data the detail page does and renders
// the existing <EditQuoteForm /> component. No new form code, no
// duplicate pricing logic — this exists so the "Edit Quote" button
// has a clear destination URL and the edit experience is on its own
// focused page (without the surrounding detail-page action buttons,
// share link, delete button, etc).
//
// `updateQuote` server action stays exactly as it is in
// src/app/portal/quotes/[id]/_actions.ts: UPDATE in place, preserves
// quote id + created_at, refreshes updated_at, preserves override
// audit fields.

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { EditQuoteForm } from '../_components/EditQuoteForm'

export const metadata: Metadata = { robots: 'noindex, nofollow' }

export default async function EditQuotePage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      client_id,
      status,
      property_category,
      type_of_clean,
      service_type,
      frequency,
      scope_size,
      service_category,
      service_type_code,
      property_type,
      bedrooms,
      bathrooms,
      site_type,
      areas_included,
      condition_tags,
      addons_wording,
      generated_scope,
      description_edited,
      service_address,
      preferred_dates,
      scheduled_clean_date,
      notes,
      base_price,
      discount,
      gst_included,
      payment_type,
      share_token,
      date_issued,
      valid_until,
      created_at,
      updated_at,
      sent_at,
      pricing_mode,
      estimated_hours,
      pricing_breakdown,
      is_price_overridden,
      override_price,
      override_reason,
      override_confirmed,
      override_confirmed_by,
      override_confirmed_at,
      calculated_price
    `)
    .eq('id', params.id)
    .single()

  if (error || !quote) notFound()

  // Parallel-load: items + clients (for the picker) + commercial details +
  // commercial scope (when commercial). All five queries fire together so
  // the page hydrates as fast as the detail page.
  const [
    { data: items },
    { data: clients },
    { data: commercialDetails },
    { data: commercialScope },
  ] = await Promise.all([
    supabase
      .from('quote_items')
      .select('id, label, price, sort_order')
      .eq('quote_id', params.id)
      .order('sort_order'),
    supabase
      .from('clients')
      .select('id, name, company_name')
      .order('name'),
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

  return (
    <div>
      <Link
        href={`/portal/quotes/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to quote
      </Link>

      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="text-2xl font-bold text-sage-800">Edit quote</h1>
        <span className="text-sm text-sage-500 font-medium">{quote.quote_number}</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 text-xs font-semibold uppercase tracking-wide">
          Editing
        </span>
      </div>

      <EditQuoteForm
        quote={quote}
        clients={clients ?? []}
        items={items ?? []}
        commercialDetails={commercialDetails ?? null}
        commercialScope={commercialScope ?? []}
        redirectAfterSaveTo={`/portal/quotes/${params.id}`}
      />
    </div>
  )
}
