import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PayNowButton } from './_components/PayNowButton'
import { getServiceSupabase } from '@/lib/supabase-service'
import { AutoPrint } from '../../_components/AutoPrint'
import { SharePdfButton } from '../../_components/SharePdfButton'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { InvoiceDocument } from '@/components/document/InvoiceDocument'

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const supabase = getServiceSupabase()
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('share_token', params.token)
    .is('deleted_at', null)
    .single()
  const number = data?.invoice_number ?? 'unknown'
  return {
    title: sanitizePdfFilename(`Sano Tax Invoice - ${number}`),
    robots: 'noindex, nofollow',
  }
}

// Phase 5.5.6 — share routes now read via the service-role client so we
// can drop the wide-open public RLS on `clients`. See the matching
// quote share page for the full rationale.

/**
 * Public share invoice page.
 *
 * Thin shell: fetches the invoice by share token via the service-role
 * client, hands it to the shared `<InvoiceDocument>` component, and
 * wires the interactive `<PayNowButton>` panel + PDF download button
 * into the slots. PDF mode (`?pdf=1`) suppresses both interactive
 * panels.
 */
export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams: { payment?: string; print?: string; pdf?: string }
}) {
  const supabase = getServiceSupabase()
  const isPdfRender = searchParams?.pdf === '1'
  const autoPrint = searchParams?.print === '1' && !isPdfRender

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, status, date_paid, date_issued, due_date,
      property_category, type_of_clean, frequency, scope_size,
      service_address, scheduled_clean_date, notes, service_description,
      base_price, discount, gst_included, payment_type,
      contact_name, contact_email, contact_phone,
      accounts_contact_name, accounts_email,
      client_reference,
      clients ( name, company_name, service_address, phone, email )
    `)
    .eq('share_token', params.token)
    .is('deleted_at', null)
    .single()

  if (error || !invoice) notFound()

  const { data: items } = await supabase
    .from('invoice_items')
    .select('label, price, sort_order')
    .eq('invoice_id', invoice.id)
    .order('sort_order')

  // Total computed for the PayNowButton (Stripe redirect uses this for
  // the visible "Pay $X" label). Same GST formula as InvoiceDocument —
  // kept in lockstep with that component's calculation.
  const addons = (items ?? []).filter((a) => (a.price ?? 0) > 0)
  const addonsTotal = addons.reduce((sum, i) => sum + (i.price ?? 0), 0)
  const lineTotal = (invoice.base_price ?? 0) + addonsTotal - (invoice.discount ?? 0)
  const gstAmount = invoice.gst_included ? (lineTotal * 3) / 23 : lineTotal * 0.15
  const total = invoice.gst_included ? lineTotal : lineTotal + gstAmount
  const totalDisplay = new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
  }).format(total)

  return (
    <>
      <AutoPrint active={autoPrint} />
      <InvoiceDocument
        wrapper="share-page"
        invoice={invoice as unknown as Parameters<typeof InvoiceDocument>[0]['invoice']}
        items={items ?? []}
        shareActionsSlot={
          !isPdfRender ? <SharePdfButton href={`/api/share/invoice/${params.token}/pdf`} /> : undefined
        }
        interactiveSlot={
          !isPdfRender ? (
            <PayNowButton
              shareToken={params.token}
              status={invoice.status}
              datePaid={invoice.date_paid}
              paymentResult={searchParams?.payment ?? null}
              total={totalDisplay}
            />
          ) : undefined
        }
      />
    </>
  )
}
