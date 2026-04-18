import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { EditQuoteForm } from './_components/EditQuoteForm'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { SendQuotePanel } from './_components/SendQuotePanel'
import { ConvertToInvoiceButton } from './_components/ConvertToInvoiceButton'
import { MarkAsAcceptedButton } from './_components/MarkAsAcceptedButton'
import { RegenerateShareLink } from '../../_components/RegenerateShareLink'
import { DeleteButton } from '../../_components/DeleteButton'
import { firstName } from '@/lib/doc-helpers'

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === 'michael@sano.nz'

  // Load quote
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
      pricing_mode,
      estimated_hours,
      pricing_breakdown
    `)
    .eq('id', params.id)
    .single()

  if (error || !quote) notFound()

  // Load quote items, all clients, and current client email in parallel
  const [{ data: items }, { data: clients }, { data: currentClient }] = await Promise.all([
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
      .from('clients')
      .select('name, email')
      .eq('id', quote.client_id)
      .single(),
  ])

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const shareUrl = `${siteUrl}/share/quote/${quote.share_token}`

  return (
    <div>
      <Link
        href="/portal/quotes"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to quotes
      </Link>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-sage-800">{quote.quote_number}</h1>
        <div className="flex items-center gap-3">
          <a
            href={`/portal/quotes/${params.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
          >
            <Printer size={16} />
            Print / PDF
          </a>
          {quote.status !== 'accepted' && <MarkAsAcceptedButton quoteId={quote.id} />}
          <ConvertToInvoiceButton quoteId={quote.id} />
          <SendQuotePanel
            quoteId={quote.id}
            quoteNumber={quote.quote_number}
            clientEmail={currentClient?.email ?? ''}
            clientName={firstName(currentClient?.name)}
            printUrl={shareUrl}
          />
        </div>
      </div>
      <div className="flex justify-end mb-6">
        <RegenerateShareLink table="quotes" id={quote.id} />
        {isAdmin && <DeleteButton type="quote" id={quote.id} />}
      </div>

      <EditQuoteForm
        quote={quote}
        clients={clients ?? []}
        items={items ?? []}
      />
    </div>
  )
}
