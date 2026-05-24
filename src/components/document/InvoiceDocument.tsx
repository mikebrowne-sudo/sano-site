import type { ReactNode } from 'react'
import { buildServiceDescription, buildPricingLabel } from '@/lib/doc-helpers'
import { computeInvoiceDueDate } from '@/lib/invoice-dates'
import {
  DocumentLayout,
  type DocumentLineItem,
  type DocumentParty,
} from './DocumentLayout'

/**
 * Standard Sano Tax Invoice document. Wraps `DocumentLayout` with the
 * invoice-specific data shape, label strings, terms, and Payment
 * Details block. Used by both the staff portal print page and the
 * public share page.
 *
 * Quote vs Invoice differences encapsulated here:
 *   - Trailing date label = "Due" (Quote = "Valid until")
 *   - Right-party header = "Billed to" (Quote = "Quote for")
 *   - Renders the Payment Details block (Account / Number / Reference)
 *   - Terms wording (14-day or cash-sale)
 *   - `interactiveSlot` is wired to `PayNowButton` on share pages
 *   - Accounts contact + accounts email override the regular contact
 *     fields on the To party (matches the existing print page logic)
 *
 * The portal data has no per-line Rate / Qty — the table renders as
 * No. / Description / Amount and the long service description sits
 * under the pricing-label title via the `sub` field on the first
 * line item.
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

  // Service Description source order (per brief):
  //   1. invoice.service_description (operator-typed, custom invoice)
  //   2. buildServiceDescription(invoice) (composed from structured
  //      frequency / type_of_clean / scope_size)
  //   3. omit the sub-block if neither yields content
  const description = (invoice.service_description ?? '').trim() || buildServiceDescription(invoice)

  // Title: prefer buildPricingLabel. Its bare "Service" fallback fires
  // when service_description / type_of_clean / property_category are
  // all empty — in that case reach for the description's first line,
  // and only then fall back to a friendlier last resort.
  const rawPricingLabel = buildPricingLabel(invoice)
  const descFirstLine = description.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? ''
  const pricingLabel =
    rawPricingLabel && rawPricingLabel !== 'Service'
      ? rawPricingLabel
      : descFirstLine || 'Cleaning service'

  const isCashSale = (invoice.payment_type ?? 'cash_sale') === 'cash_sale'

  // Due-date display: trust the stored value when set (operator
  // overrides on custom invoices, and the send / conversion actions
  // already stamp this via computeInvoiceDueDate). When stored is
  // null, fall back to the same canonical rule so the header reads
  // a meaningful date instead of "—":
  //   cash_sale → scheduled_clean_date − 1 day if present, else issued
  //   on_account → issued + 14 days
  // payment_terms is unavailable on the invoice payload here, so the
  // helper falls back to the payment_type axis above — matches the
  // default invoice terms text rendered below.
  const dueDateForDisplay =
    invoice.due_date ??
    computeInvoiceDueDate({
      payment_type: invoice.payment_type ?? 'cash_sale',
      payment_terms: null,
      date_issued: invoice.date_issued,
      service_date: invoice.scheduled_clean_date ?? null,
    })

  const client = invoice.clients ?? null

  const fromParty: DocumentParty = {
    name: 'Sano Property Services Limited',
    phone: '0800 726 686',
    email: 'hello@sano.nz',
    gst: '141-577-062',
  }

  // Accounts email/contact takes precedence over the regular contact
  // fields on the To party — matches the existing print page logic so
  // the invoice copy mirrors the routing used to send it.
  const toParty: DocumentParty = {
    name: client?.name ?? '—',
    company: client?.company_name ?? null,
    address: client?.service_address ?? null,
    attn: invoice.accounts_contact_name ?? invoice.contact_name ?? null,
    phone: invoice.contact_phone ?? client?.phone ?? null,
    email: invoice.accounts_email ?? invoice.contact_email ?? client?.email ?? null,
    reference: invoice.client_reference ?? null,
  }

  // First line item carries the pricing label as title + a labelled
  // sub-block stack for service address and service description.
  // The portal data has no per-line Rate/Qty, so these structured
  // fields live inside the line item's description cell. The Notes
  // side block stays reserved for actual notes (`invoice.notes`).
  const address = invoice.service_address ?? client?.service_address ?? null

  // Sub-block dedup: if the description's first line is the same as the
  // title we just chose, strip it so the Service Description block
  // never repeats the title verbatim. If nothing is left after the
  // strip, omit the block entirely.
  let descBlockValue = description.trim()
  if (descBlockValue) {
    const lines = descBlockValue.split('\n')
    if (lines[0].trim() === pricingLabel.trim()) {
      descBlockValue = lines.slice(1).join('\n').trim()
    }
  }

  const primarySubBlocks: { label: string; value: string }[] = []
  if (address) primarySubBlocks.push({ label: 'Service address', value: address })
  if (descBlockValue) primarySubBlocks.push({ label: 'Service description', value: descBlockValue })

  const lineItems: DocumentLineItem[] = []
  if ((invoice.base_price ?? 0) > 0) {
    lineItems.push({
      description: pricingLabel,
      subBlocks: primarySubBlocks.length > 0 ? primarySubBlocks : undefined,
      amount: fmt(invoice.base_price ?? 0),
    })
  } else if (primarySubBlocks.length > 0) {
    lineItems.push({
      description: pricingLabel || 'Service',
      subBlocks: primarySubBlocks,
      amount: fmt(0),
    })
  }
  for (const addon of addons) {
    lineItems.push({ description: addon.label, amount: fmt(addon.price ?? 0) })
  }
  if ((invoice.discount ?? 0) > 0) {
    lineItems.push({ description: 'Discount', amount: `-${fmt(invoice.discount ?? 0)}` })
  }

  const paymentDetails: { label: string; value: string }[] = [
    { label: 'Account', value: 'Sano Property Services Limited' },
    { label: 'Number', value: '12-3627-0005597-00' },
    { label: 'Reference', value: invoice.invoice_number },
  ]
  if (invoice.client_reference) {
    paymentDetails.push({ label: 'Your reference / PO', value: invoice.client_reference })
  }

  const termsBody = isCashSale
    ? 'Payment is required prior to the clean. All amounts are in New Zealand Dollars and include GST. Sano Property Services Limited is GST registered (GST No. 141-577-062) under the Goods and Services Tax Act 1985. Please use your invoice number as the payment reference.'
    : 'Payment is due within 14 days of the invoice date. All amounts are in New Zealand Dollars and include GST. Sano Property Services Limited is GST registered (GST No. 141-577-062) under the Goods and Services Tax Act 1985. Please use your invoice number as the payment reference.'

  return (
    <DocumentLayout
      wrapper={wrapper}
      kind="invoice"
      meta={{
        number: invoice.invoice_number,
        dateIssuedDisplay: fmtDate(invoice.date_issued),
        trailingDateLabel: 'Due',
        trailingDateDisplay: fmtDate(dueDateForDisplay),
      }}
      fromParty={fromParty}
      toParty={toParty}
      lineItems={lineItems}
      notes={invoice.notes}
      paymentDetails={paymentDetails}
      totals={{
        subtotalExGstDisplay: fmt(subtotalExGst),
        gstDisplay: fmt(gstAmount),
        totalDisplay: fmt(total),
      }}
      termsBody={termsBody}
      footer={{
        email: 'hello@sano.nz',
        phone: '0800 726 686',
        website: 'sano.nz',
      }}
      interactiveSlot={interactiveSlot}
      shareActionsSlot={shareActionsSlot}
    />
  )
}
