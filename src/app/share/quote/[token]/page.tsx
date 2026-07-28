import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { AcceptQuote } from './_components/AcceptQuote'
import { getServiceSupabase } from '@/lib/supabase-service'
import { AutoPrint } from '../../_components/AutoPrint'
import { SharePdfButton } from '../../_components/SharePdfButton'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { QuoteDocument } from '@/components/document/QuoteDocument'

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const supabase = getServiceSupabase()
  const { data } = await supabase
    .from('quotes')
    .select('quote_number')
    .eq('share_token', params.token)
    .is('deleted_at', null)
    .single()
  const number = data?.quote_number ?? 'unknown'
  return {
    title: sanitizePdfFilename(`Sano Quote - ${number}`),
    robots: 'noindex, nofollow',
  }
}

// Phase 5.5.6 — share routes now read via the service-role client so we
// can drop the wide-open public RLS on `clients`. The share_token in
// the URL is still the only credential needed; service-role bypasses
// RLS but the query is keyed by token + deleted_at IS NULL, so an
// unauthorized caller cannot enumerate other clients' data.

/**
 * Public share quote page.
 *
 * Thin shell: fetches the quote by share token via the service-role
 * client, hands it to the shared `<QuoteDocument>` component, and
 * wires the interactive `<AcceptQuote>` panel + PDF download button
 * into the slots. PDF mode (`?pdf=1`) suppresses both interactive
 * panels and the `sent → viewed` status promotion so PDF renders
 * never trigger a viewed-tracking write.
 */
export default async function PublicQuotePage({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams: { print?: string; pdf?: string }
}) {
  const supabase = getServiceSupabase()
  const isPdfRender = searchParams?.pdf === '1'
  const autoPrint = searchParams?.print === '1' && !isPdfRender

  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      id, quote_number, status, accepted_at, date_issued, valid_until, created_at,
      property_category, type_of_clean, frequency, scope_size,
      generated_scope,
      service_address, scheduled_clean_date, notes,
      base_price, discount, gst_included, payment_type,
      contact_name, contact_email, contact_phone,
      accounts_contact_name, accounts_email,
      client_reference,
      clients ( name, company_name, service_address, phone, email )
    `)
    .eq('share_token', params.token)
    .is('deleted_at', null)
    .single()

  if (error || !quote) notFound()

  // Phase 6 — first-view tracking. When the share page is opened by the
  // client and the quote is currently `sent`, promote to `viewed` and
  // write an audit row. Idempotent: only fires while status === 'sent'.
  // Internal portal views never set this status (they hit /portal/quotes/[id],
  // not the share route).
  if (quote.status === 'sent' && !isPdfRender) {
    // Use the service-role client for the status flip + audit. The public
    // anon key can't satisfy the audit_log RLS policy, and the quotes
    // policy only allows status updates from authenticated staff.
    const service = getServiceSupabase()
    await service
      .from('quotes')
      .update({ status: 'viewed' })
      .eq('id', quote.id)
      .eq('status', 'sent') // race guard
    await service.from('audit_log').insert({
      actor_id: null,
      actor_role: 'public_share',
      action: 'quote.status-changed',
      entity_table: 'quotes',
      entity_id: quote.id,
      before: { status: 'sent' },
      after: { status: 'viewed', source: 'share_page_open' },
    })
  }

  const { data: items } = await supabase
    .from('quote_items')
    .select('label, description, price, sort_order')
    .eq('quote_id', quote.id)
    .order('sort_order')

  return (
    <>
      <AutoPrint active={autoPrint} />
      <QuoteDocument
        wrapper="share-page"
        quote={quote as unknown as Parameters<typeof QuoteDocument>[0]['quote']}
        items={items ?? []}
        shareActionsSlot={
          !isPdfRender ? <SharePdfButton href={`/api/share/quote/${params.token}/pdf`} /> : undefined
        }
        interactiveSlot={
          !isPdfRender ? (
            <AcceptQuote shareToken={params.token} status={quote.status} acceptedAt={quote.accepted_at} />
          ) : undefined
        }
      />
    </>
  )
}
