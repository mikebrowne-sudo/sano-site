import type { ReactNode } from 'react'
import { buildServiceDescription, buildPricingLabel } from '@/lib/doc-helpers'
import {
  DocumentLayout,
  type DocumentLineItem,
  type DocumentParty,
} from './DocumentLayout'

/**
 * Standard Sano Tax Invoice document. Wraps `DocumentLayout` with the
 * invoice-specific data shape, label strings, terms and Payment
 * Details block. Used by both the staff portal print page and the
 * public share page.
 *
 * Quote vs Invoice differences encapsulated here:
 *   - Trailing date label = "Due" (Quote = "Valid until")
 *   - Right-party header = "Invoiced to" (Quote = "Quote for")
 *   - Renders the Payment Details block (bank/account/reference)
 *   - Terms wording (payment confirmation + service terms link)
 *   - `interactiveSlot` is wired to `PayNowButton` on share pages
 *   - Accounts contact + accounts email override the regular contact
 *     fields on the To party (matches the existing print page logic)
 */

export interface InvoiceDocumentInput {
  invoice_number: string
  date_issued: string | null
  due_date: string | null
  property_category?: string | null
  type_of_clean?: string | null
  frequency?: string | null
  scope_size?: string | null
  service_description?: string | null
  service_address?: string | null
  scheduled_clean_date?: string | null
  notes?: string | null
  base_price: number | null
  discount?: number | null
  gst_included?: boolean | null
  payment_type?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  accounts_contact_name?: string | null
  accounts_email?: string | null
  client_reference?: string | null
  clients?: {
    name: string
    company_name?: string | null
    service_address?: string | null
    phone?: string | null
    email?: string | null
  } | null
}

export interface InvoiceItemInput {
  label: string
  price: number | null
}

export interface InvoiceDocumentProps {
  /** `'share-page'` on /share/invoice/[token] or `'print-overlay'` on
   * /portal/invoices/[id]/print. */
  wrapper: 'share-page' | 'print-overlay'
  invoice: InvoiceDocumentInput
  items: ReadonlyArray<InvoiceItemInput>
  /** Optional interactive slot (PayNowButton on share pages). */
  interactiveSlot?: ReactNode
  /** Optional share-actions slot (PDF download button on share pages). */
  shareActionsSlot?: ReactNode
}

function fmt(dollars: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function InvoiceDocument({
  wrapper,
  invoice,
  items,
  interactiveSlot,
  shareActionsSlot,
}: InvoiceDocumentProps) {
  // GST + totals logic preserved verbatim from the previous print/share
  // pages. Same shape as QuoteDocument; see that file for the
  // `gst_included` rationale.
  const addons = items.filter((a) => (a.price ?? 0) > 0)
  const addonsTotal = addons.reduce((sum, i) => sum + (i.price ?? 0), 0)
  const lineTotal = (invoice.base_price ?? 0) + addonsTotal - (invoice.discount ?? 0)
  const gstAmount = invoice.gst_included ? (lineTotal * 3) / 23 : lineTotal * 0.15
  const subtotalExGst = invoice.gst_included ? lineTotal - gstAmount : lineTotal
  const total = invoice.gst_included ? lineTotal : lineTotal + gstAmount

  // Description override: custom invoice's service_description wins,
  // else compose from structured fields.
  const description = (invoice.service_description ?? '').trim() || buildServiceDescription(invoice)
  const pricingLabel = buildPricingLabel(invoice)
  const isCashSale = (invoice.payment_type ?? 'cash_sale') === 'cash_sale'

  const client = invoice.clients ?? null

  const fromParty: DocumentParty = {
    name: 'Sano Property Services Limited',
    phone: '022 394 3982',
    email: 'hello@sano.nz',
    gst: '141-577-062',
  }

  // Accounts email/contact takes precedence over the regular contact
  // fields on the To party — matches the existing print page logic
  // so the invoice copy mirrors the routing used to send it.
  const toParty: DocumentParty = {
    name: client?.name ?? '—',
    company: client?.company_name ?? null,
    address: client?.service_address ?? null,
    attn: invoice.accounts_contact_name ?? invoice.contact_name ?? null,
    phone: invoice.contact_phone ?? client?.phone ?? null,
    email: invoice.accounts_email ?? invoice.contact_email ?? client?.email ?? null,
    reference: invoice.client_reference ?? null,
  }

  const lineItems: DocumentLineItem[] = []
  if ((invoice.base_price ?? 0) > 0) {
    lineItems.push({ description: pricingLabel, amount: fmt(invoice.base_price ?? 0) })
  }
  for (const addon of addons) {
    lineItems.push({ description: addon.label, amount: fmt(addon.price ?? 0) })
  }
  if ((invoice.discount ?? 0) > 0) {
    lineItems.push({ description: 'Discount', amount: `-${fmt(invoice.discount ?? 0)}` })
  }

  const paymentDetails: { label: string; value: string }[] = [
    { label: 'Bank', value: 'Sano Property Services Limited' },
    { label: 'Account', value: '12-3627-0005597-00' },
    { label: 'Reference', value: invoice.invoice_number },
  ]
  if (invoice.client_reference) {
    paymentDetails.push({ label: 'Your reference / PO', value: invoice.client_reference })
  }

  return (
    <DocumentLayout
      wrapper={wrapper}
      kind="invoice"
      meta={{
        number: invoice.invoice_number,
        dateIssuedDisplay: fmtDate(invoice.date_issued),
        trailingDateLabel: 'Due',
        trailingDateDisplay: fmtDate(invoice.due_date),
      }}
      fromParty={fromParty}
      toParty={toParty}
      service={{
        description,
        serviceAddress: invoice.service_address,
        scheduledDateDisplay: invoice.scheduled_clean_date ? fmtDate(invoice.scheduled_clean_date) : null,
      }}
      lineItems={lineItems}
      notes={invoice.notes}
      paymentDetails={paymentDetails}
      totals={{
        subtotalExGstDisplay: fmt(subtotalExGst),
        gstDisplay: fmt(gstAmount),
        totalDisplay: fmt(total),
      }}
      terms={{
        primary: isCashSale
          ? 'Payment is required in full before or on the day of service, unless otherwise agreed.'
          : 'Payment is due within 14 days of invoice date, unless otherwise agreed.',
        secondary: 'Please use your invoice number as the payment reference.',
        agreementLabel: 'Service Terms',
        agreementHref: '/share/invoice-terms',
      }}
      footer={{
        email: 'hello@sano.nz',
        phone: '022 394 3982',
        website: 'sano.nz',
      }}
      interactiveSlot={interactiveSlot}
      shareActionsSlot={shareActionsSlot}
    />
  )
}
