import type { ReactNode } from 'react'
import { buildServiceDescription, buildPricingLabel } from '@/lib/doc-helpers'
import { computeDocumentTotals } from '@/lib/doc-totals'
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
  /**
   * Optional `invoices.created_at`. Used as a display-only fallback
   * for the Issued date in the document header when `date_issued`
   * is null (e.g. invoices downloaded as PDF before being emailed,
   * where the send-flow's pre-render stamp hasn't run). Never
   * back-written to the DB — historical rows stay honest about
   * what was actually stamped.
   */
  created_at?: string | null
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
  const { gstAmount, subtotalExGst, total } = computeDocumentTotals(lineTotal, !!invoice.gst_included)

  // Service Description source order (per brief):
  //   1. invoice.service_description (operator-typed, custom invoice)
  //   2. buildServiceDescription(invoice) (composed from structured
  //      frequency / type_of_clean / scope_size)
  //   3. omit the sub-block if neither yields content
  const description = (invoice.service_description ?? '').trim() || buildServiceDescription(invoice)

  // Title comes from the STRUCTURED clean type only (type_of_clean →
  // property_category), never the free-text service description. This
  // keeps the operator's full service_description in its own "Service
  // description" block — previously the description's first line was
  // promoted into the heading (and stripped from the block), so a
  // single-line description vanished from the block entirely.
  const rawPricingLabel = buildPricingLabel({
    property_category: invoice.property_category,
    type_of_clean: invoice.type_of_clean,
  })
  const pricingLabel = rawPricingLabel !== 'Service' ? rawPricingLabel : 'Cleaning service'

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
    gst: '148-387-648',
  }

  // Accounts email/contact takes precedence over the regular contact
  // fields on the To party — matches the existing print page logic so
  // the invoice copy mirrors the routing used to send it.
  //
  // client_reference is intentionally NOT passed through `toParty.reference`
  // here — it's surfaced as a dedicated row in the document meta-grid
  // header (alongside Invoice # / Issued / Due) and also in the Payment
  // Details block below for bank-transfer reference routing. Including it
  // in the address block as well would render the value three times.
  const toParty: DocumentParty = {
    name: client?.name ?? '—',
    company: client?.company_name ?? null,
    address: client?.service_address ?? null,
    attn: invoice.accounts_contact_name ?? invoice.contact_name ?? null,
    phone: invoice.contact_phone ?? client?.phone ?? null,
    email: invoice.accounts_email ?? invoice.contact_email ?? client?.email ?? null,
  }

  // Issued date display fallback. `invoices.date_issued` is null at
  // creation by design and is stamped by sendInvoiceEmail before the
  // PDF render. PDFs downloaded outside that send path (e.g. direct
  // staff download, or manual status flips) leave the column null and
  // produced an ugly "Issued —" header. Fall back to `created_at` as
  // a sensible display proxy; never back-write to the DB.
  const dateIssuedForDisplay = invoice.date_issued ?? invoice.created_at ?? null

  // Trim the reference for the meta-grid so whitespace-only values
  // don't render an empty row.
  const trimmedReference = (invoice.client_reference ?? '').trim()

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
  if (trimmedReference) {
    paymentDetails.push({ label: 'Your reference / PO', value: trimmedReference })
  }

  // Label + GST sentence reflect the actual GST treatment (a GST-exclusive
  // invoice never claims its line amounts include GST).
  const amountLabel = invoice.gst_included ? 'Amount (incl. GST)' : 'Amount (excl. GST)'
  const gstSentence = invoice.gst_included
    ? 'All amounts are in New Zealand Dollars and include GST.'
    : 'Amounts are in New Zealand Dollars and exclude GST; GST is added to the total.'
  const paymentSentence = isCashSale ? 'Payment is required prior to the clean.' : 'Payment is due within 14 days of the invoice date.'
  const termsBody = `${paymentSentence} ${gstSentence} Sano Property Services Limited is GST registered (GST No. 148-387-648) under the Goods and Services Tax Act 1985. Please use your invoice number as the payment reference.`

  return (
    <DocumentLayout
      wrapper={wrapper}
      kind="invoice"
      meta={{
        number: invoice.invoice_number,
        dateIssuedDisplay: fmtDate(dateIssuedForDisplay),
        trailingDateLabel: 'Due',
        trailingDateDisplay: fmtDate(dueDateForDisplay),
        ...(trimmedReference
          ? { referenceLabel: 'Your reference / PO', referenceDisplay: trimmedReference }
          : {}),
      }}
      fromParty={fromParty}
      toParty={toParty}
      lineItems={lineItems}
      amountLabel={amountLabel}
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
