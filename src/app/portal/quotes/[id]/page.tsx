import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { EditQuoteForm } from './_components/EditQuoteForm'
import { QuoteCustomerDetails } from './_components/QuoteCustomerDetails'
import Link from 'next/link'
import { ArrowLeft, Printer, FileText } from 'lucide-react'
import { SendQuotePanel } from './_components/SendQuotePanel'
import { ConvertToInvoiceButton } from './_components/ConvertToInvoiceButton'
import { MarkAsAcceptedButton } from './_components/MarkAsAcceptedButton'
import { RegenerateShareLink } from '../../_components/RegenerateShareLink'
import { firstName } from '@/lib/doc-helpers'
import { loadPricingSettings } from '@/lib/pricingSettings'
import { loadVersionChain } from '../_actions-versioning'
import { NotLatestBanner, ArchivedBanner } from './_components/NotLatestBanner'
import { VersionHistoryPanel } from './_components/VersionHistoryPanel'
import { ArchiveQuoteButton } from './_components/ArchiveQuoteButton'
import { StatusBadge } from '../../_components/StatusBadge'
import { displayQuoteNumber } from '@/lib/quote-versioning'
import { isQuoteConvertible } from '@/lib/quote-status'

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
      pricing_breakdown,
      is_price_overridden,
      override_price,
      override_reason,
      override_confirmed,
      override_confirmed_by,
      override_confirmed_at,
      calculated_price,
      contact_name,
      contact_email,
      contact_phone,
      accounts_contact_name,
      accounts_email,
      client_reference,
      requires_po,
      version_number,
      parent_quote_id,
      is_latest_version,
      version_note,
      deleted_at,
      deleted_by
    `)
    .eq('id', params.id)
    .single()

  if (error || !quote) notFound()

  // Load quote items, all clients, current client email, (for commercial
  // quotes) the commercial detail row + scope items, and the Phase 3A
  // pricing settings — all in parallel. Settings never throw (loader
  // falls back to in-code constants on any error).
  const [
    { data: items },
    { data: clients },
    { data: currentClient },
    { data: commercialDetails },
    { data: commercialScope },
    pricingSettings,
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
    loadPricingSettings(supabase),
  ])

  // Phase 6 — load the version chain so we can render the history panel
  // and resolve where to point the "Open vN" CTA when this isn't the latest.
  const versionChain = await loadVersionChain(quote.id)
  const latestVersion = versionChain.find((v) => v.is_latest_version) ?? null

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const shareUrl = `${siteUrl}/share/quote/${quote.share_token}`
  const displayNumber = displayQuoteNumber({
    quote_number: quote.quote_number as string,
    version_number: quote.version_number as number,
  })
  const isArchived = quote.deleted_at != null
  const canConvert = quote.is_latest_version && isQuoteConvertible(quote.status, true)

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
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-bold text-sage-800 truncate">{displayNumber}</h1>
          <StatusBadge kind="quote" status={quote.status ?? 'draft'} size="md" />
        </div>
        <div className="flex items-center gap-3">
          {quote.service_category === 'commercial' && (
            <a
              href={`/portal/quotes/${params.id}/proposal`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
            >
              <FileText size={16} />
              View Proposal
            </a>
          )}
          <a
            href={`/portal/quotes/${params.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
          >
            <Printer size={16} />
            Print / PDF
          </a>
          {!isArchived && quote.is_latest_version && quote.status !== 'accepted' && quote.status !== 'converted' && (
            <MarkAsAcceptedButton quoteId={quote.id} />
          )}
          {!isArchived && canConvert && <ConvertToInvoiceButton quoteId={quote.id} />}
          {!isArchived && quote.is_latest_version && (
            <SendQuotePanel
              quoteId={quote.id}
              quoteNumber={displayNumber}
              clientEmail={currentClient?.email ?? ''}
              clientName={firstName(currentClient?.name)}
              printUrl={shareUrl}
              primaryContactEmail={quote.contact_email ?? ''}
              accountsEmail={quote.accounts_email ?? ''}
              clientReference={quote.client_reference ?? ''}
            />
          )}
        </div>
      </div>
      <div className="flex justify-end mb-6 gap-2">
        <RegenerateShareLink table="quotes" id={quote.id} />
        {isAdmin && !isArchived && (
          <ArchiveQuoteButton
            quoteId={quote.id}
            quoteDisplayNumber={displayNumber}
            quoteStatus={quote.status ?? 'draft'}
          />
        )}
      </div>

      {isArchived && <ArchivedBanner deletedAt={quote.deleted_at as string} />}
      {!quote.is_latest_version && latestVersion && (
        <NotLatestBanner
          currentVersion={quote.version_number as number}
          latestVersionId={latestVersion.id as string}
          latestVersionNumber={latestVersion.version_number as number}
        />
      )}

      <QuoteCustomerDetails
        name={currentClient?.name ?? null}
        phone={currentClient?.phone ?? null}
        email={currentClient?.email ?? null}
        serviceAddress={quote.service_address ?? null}
        contactName={quote.contact_name ?? null}
        contactEmail={quote.contact_email ?? null}
        accountsEmail={quote.accounts_email ?? null}
        clientReference={quote.client_reference ?? null}
        requiresPo={quote.requires_po ?? null}
      />

      <VersionHistoryPanel chain={versionChain} currentId={quote.id} />

      <EditQuoteForm
        quote={quote}
        clients={clients ?? []}
        items={items ?? []}
        commercialDetails={commercialDetails ?? null}
        commercialScope={commercialScope ?? []}
        pricingSettings={pricingSettings}
      />
    </div>
  )
}
