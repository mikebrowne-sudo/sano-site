import { notFound, redirect } from 'next/navigation'
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
      version_number, parent_quote_id, is_latest_version, share_token,
      property_category, type_of_clean, service_type_code, frequency, scope_size,
      generated_scope,
      structured_scope,
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

  // Superseded-link forwarding.
  //
  // Every version mints its own share_token, so a client holding the emailed
  // link for v1 would keep seeing v1 forever — and could accept a quote we've
  // since revised. When this token's row is no longer the latest of its chain,
  // forward to the newest version that has ACTUALLY BEEN SENT.
  //
  // The sent-gate matters: an in-progress draft (say v2 mid-edit, with
  // half-finished pricing) must never be exposed to the client. If the newer
  // version hasn't been sent yet, this token keeps rendering its own row
  // unchanged — the client simply sees what they were last given.
  //
  // Skipped entirely for ?pdf=1 so PDF renders always capture the exact
  // version they were asked for, never a forwarded one.
  if (!isPdfRender && quote.is_latest_version === false) {
    const chainRootId = (quote.parent_quote_id as string | null) ?? (quote.id as string)
    const { data: newerSent } = await supabase
      .from('quotes')
      .select('share_token, version_number')
      .or(`id.eq.${chainRootId},parent_quote_id.eq.${chainRootId}`)
      .is('deleted_at', null)
      .gt('version_number', (quote.version_number as number | null) ?? 1)
      // Only versions the client has genuinely been issued. Drafts are
      // excluded; 'accepted' / 'declined' are included because reaching those
      // states requires having been sent first.
      .in('status', ['sent', 'viewed', 'accepted', 'declined', 'converted'])
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (newerSent?.share_token && newerSent.share_token !== params.token) {
      redirect(`/share/quote/${newerSent.share_token}`)
    }
  }

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
