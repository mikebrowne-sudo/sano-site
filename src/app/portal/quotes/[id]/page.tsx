import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { EditQuoteForm } from './_components/EditQuoteForm'
import { QuoteCustomerDetails } from './_components/QuoteCustomerDetails'
import Link from 'next/link'
import { ArrowLeft, Printer, Pencil } from 'lucide-react'
import { SendQuotePanel } from './_components/SendQuotePanel'
import { ConvertToInvoiceButton } from './_components/ConvertToInvoiceButton'
import { MarkAsAcceptedButton } from './_components/MarkAsAcceptedButton'
import { RegenerateShareLink } from '../../_components/RegenerateShareLink'
import { DeleteButton } from '../../_components/DeleteButton'
import { CommercialDeleteButton } from '../_components/commercial/CommercialDeleteButton'
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

  // Load quote items, all clients, current client email, and (for commercial
  // quotes) the commercial detail row + scope items — all in parallel.
  const [
    { data: items },
    { data: clients },
    { data: currentClient },
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
      .from('clients')
      .select('name, phone, email')
      .eq('id', quote.client_id)
      .single(),
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
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-sage-800">{quote.quote_number}</h1>
          <QuoteAuditLine
            updatedAt={(quote.updated_at as string | null) ?? null}
            sentAt={(quote.sent_at as string | null) ?? null}
            status={(quote.status as string | null) ?? null}
          />
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/portal/quotes/${params.id}/edit`}
            className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
          >
            <Pencil size={16} />
            Edit Quote
          </Link>
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
        {isAdmin && (
          quote.service_category === 'commercial'
            ? <CommercialDeleteButton quoteId={quote.id} />
            : <DeleteButton type="quote" id={quote.id} />
        )}
      </div>

      <QuoteCustomerDetails
        name={currentClient?.name ?? null}
        phone={currentClient?.phone ?? null}
        email={currentClient?.email ?? null}
        serviceAddress={quote.service_address ?? null}
      />

      <EditQuoteForm
        quote={quote}
        clients={clients ?? []}
        items={items ?? []}
        commercialDetails={commercialDetails ?? null}
        commercialScope={commercialScope ?? []}
      />
    </div>
  )
}

// ── Audit line shown under the quote number ────────────────────────
// Renders "Last updated: <date>" plus an "Edited after send" pill when
// the quote was sent and has subsequently been updated. updated_at is
// the row's last-modified timestamp (Supabase row default); sent_at is
// stamped by sendQuoteEmail in the [id]/_actions.ts file.

function QuoteAuditLine({
  updatedAt,
  sentAt,
  status,
}: {
  updatedAt: string | null
  sentAt: string | null
  status: string | null
}) {
  if (!updatedAt) return null
  const updated = new Date(updatedAt)
  const updatedLabel = updated.toLocaleDateString('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) + ' · ' + updated.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })
  const editedAfterSend =
    status === 'sent'
      && !!sentAt
      && new Date(updatedAt).getTime() > new Date(sentAt).getTime() + 5_000 // 5s slack
  return (
    <div className="flex items-center gap-2 text-xs text-sage-600">
      <span>Last updated {updatedLabel}</span>
      {editedAfterSend && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold uppercase tracking-wide">
          Edited after send
        </span>
      )}
    </div>
  )
}
