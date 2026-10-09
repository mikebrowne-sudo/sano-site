import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PayNowButton } from './_components/PayNowButton'
import { getServiceSupabase } from '@/lib/supabase-service'
import { AutoPrint } from '../../_components/AutoPrint'
import { SharePdfButton } from '../../_components/SharePdfButton'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { InvoiceDocument } from '@/components/document/InvoiceDocument'
import { canTakeRealPayments } from '@/lib/stripe'
import { cardFee, clientCardSetting, invoiceOffersCard } from '@/lib/card-payments'
import { sanoPaymentDetails } from '@/lib/sano-bank-details'
import { invoiceBalanceDue, loadAllocatedByInvoice } from '@/lib/invoice-balance'

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
      id, invoice_number, status, date_paid, date_issued, due_date, created_at,
      property_category, type_of_clean, frequency, scope_size,
      service_address, scheduled_clean_date, notes, service_description,
      base_price, discount, gst_included, payment_type, allow_card_payment,
      contact_name, contact_email, contact_phone,
      accounts_contact_name, accounts_email,
      bill_to_name, bill_to_attention,
      client_reference,
      clients ( name, company_name, service_address, phone, email, allow_card_payment )
    `)
    .eq('share_token', params.token)
    .is('deleted_at', null)
    .single()

  if (error || !invoice) notFound()

  const { data: items } = await supabase
    .from('invoice_items')
    .select('label, description, price, sort_order')
    .eq('invoice_id', invoice.id)
    .order('sort_order')

  // Amount shown on the Pay button = what is still owed (grand total incl.
  // GST less any part payment) — the same figure create-checkout charges.
  // On-account customers pay on terms and aren't offered a card unless staff
  // ticked "Show Pay now" on this invoice (lib/card-payments).
  const showPay = !isPdfRender && canTakeRealPayments() && invoiceOffersCard({ ...invoice, client_allow_card_payment: clientCardSetting(invoice.clients) })
  let totalDisplay = ''
  let feeDisplay = ''
  let cardTotalDisplay = ''
  if (showPay) {
    const allocated = (await loadAllocatedByInvoice(supabase, [invoice.id])).get(invoice.id) ?? 0
    const due = invoiceBalanceDue({ ...invoice, invoice_items: items ?? [] }, allocated)
    const money = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
    // Same figures create-checkout charges: amount due + 2.5% card fee.
    const fee = cardFee(due)
    totalDisplay = money(due)
    feeDisplay = money(fee)
    cardTotalDisplay = money(Math.round((due + fee) * 100) / 100)
  }

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
          // Only offer card payment when a real card can actually be charged.
          // A test key renders a Pay button that declines every real card, which
          // reads to the customer as "Sano's payment system is broken". The bank
          // details on the invoice remain, so they always have a way to pay.
          showPay ? (
            <PayNowButton
              shareToken={params.token}
              status={invoice.status}
              datePaid={invoice.date_paid}
              paymentResult={searchParams?.payment ?? null}
              total={totalDisplay}
              bankDetails={sanoPaymentDetails(invoice.invoice_number)}
              cardFee={feeDisplay || undefined}
              cardTotal={cardTotalDisplay || undefined}
            />
          ) : undefined
        }
      />
    </>
  )
}
