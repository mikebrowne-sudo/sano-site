import type { ReactNode } from 'react'
import { buildServiceDescription, buildPricingLabel } from '@/lib/doc-helpers'
import {
  DocumentLayout,
  type DocumentLineItem,
  type DocumentParty,
} from './DocumentLayout'

/**
 * Standard Sano Quote document. Wraps `DocumentLayout` with the
 * quote-specific data shape, label strings, and terms. Used by both
 * the staff portal print page and the public share page.
 *
 * Quote vs Invoice differences encapsulated here:
 *   - Trailing date label = "Valid until" (Invoice = "Due")
 *   - Right-party header = "Quote for" (Invoice = "Billed to")
 *   - No Payment Details block (Invoice has one)
 *   - Terms wording
 *   - `interactiveSlot` is wired to `AcceptQuote` on share pages
 *
 * The portal data has no per-line Rate / Qty — the table renders as
 * No. / Description / Amount and the long service description sits
 * under the pricing-label title via the `sub` field on the first
 * line item.
 */

export interface QuoteDocumentInput {
  quote_number: string
  date_issued: string | null
  valid_until: string | null
  property_category?: string | null
  type_of_clean?: string | null
  frequency?: string | null
  scope_size?: string | null
  generated_scope?: string | null
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
  client_reference?: string | null
  clients?: {
    name: string
    company_name?: string | null
    service_address?: string | null
    phone?: string | null
    email?: string | null
  } | null
}

export interface QuoteItemInput {
  label: string
  price: number | null
}

export interface QuoteDocumentProps {
  /** `'share-page'` on /share/quote/[token] or `'print-overlay'` on
   * /portal/quotes/[id]/print. */
  wrapper: 'share-page' | 'print-overlay'
  quote: QuoteDocumentInput
  items: ReadonlyArray<QuoteItemInput>
  /** Optional interactive slot (AcceptQuote on share pages). */
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

export function QuoteDocument({
  wrapper,
  quote,
  items,
  interactiveSlot,
  shareActionsSlot,
}: QuoteDocumentProps) {
  // GST + totals logic preserved verbatim from the previous print/share
  // pages — `gst_included = true` means the entered prices are
  // GST-inclusive and we back-derive the GST component (×3/23);
  // otherwise we add 15% on top.
  const addons = items.filter((a) => (a.price ?? 0) > 0)
  const addonsTotal = addons.reduce((sum, i) => sum + (i.price ?? 0), 0)
  const lineTotal = (quote.base_price ?? 0) + addonsTotal - (quote.discount ?? 0)
  const gstAmount = quote.gst_included ? (lineTotal * 3) / 23 : lineTotal * 0.15
  const subtotalExGst = quote.gst_included ? lineTotal - gstAmount : lineTotal
  const total = quote.gst_included ? lineTotal : lineTotal + gstAmount

  // Description override: generated_scope wins, else compose from fields.
  const description = (quote.generated_scope ?? '').trim() || buildServiceDescription(quote)
  const pricingLabel = buildPricingLabel(quote)
  const isCashSale = (quote.payment_type ?? 'cash_sale') === 'cash_sale'

  const client = quote.clients ?? null

  const fromParty: DocumentParty = {
    name: 'Sano Property Services Limited',
    phone: '0800 726 686',
    email: 'hello@sano.nz',
    gst: '141-577-062',
  }

  const toParty: DocumentParty = {
    name: client?.name ?? '—',
    company: client?.company_name ?? null,
    address: client?.service_address ?? null,
    attn: quote.contact_name ?? null,
    phone: quote.contact_phone ?? client?.phone ?? null,
    email: quote.contact_email ?? client?.email ?? null,
    reference: quote.client_reference ?? null,
  }

  // First line item carries the pricing label as title + a labelled
  // sub-block stack for service address and service description.
  // The portal data has no per-line Rate/Qty, so these structured
  // fields live inside the line item's description cell. The Notes
  // side block stays reserved for actual notes (`quote.notes`).
  const address = quote.service_address ?? client?.service_address ?? null
  const primarySubBlocks: { label: string; value: string }[] = []
  if (address) primarySubBlocks.push({ label: 'Service address', value: address })
  if (description) primarySubBlocks.push({ label: 'Service description', value: description })

  const lineItems: DocumentLineItem[] = []
  if ((quote.base_price ?? 0) > 0) {
    lineItems.push({
      description: pricingLabel,
      subBlocks: primarySubBlocks.length > 0 ? primarySubBlocks : undefined,
      amount: fmt(quote.base_price ?? 0),
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
  if ((quote.discount ?? 0) > 0) {
    lineItems.push({ description: 'Discount', amount: `-${fmt(quote.discount ?? 0)}` })
  }

  const termsBody = isCashSale
    ? 'This quote is valid for 30 days from the issue date. Prices are in New Zealand Dollars and include GST. Payment is required prior to the clean. Sano Property Services Limited is GST registered (GST No. 141-577-062). No lock-in contracts — you can pause or cancel any time.'
    : 'This quote is valid for 30 days from the issue date. Prices are in New Zealand Dollars and include GST. Payment is due within 14 days of the invoice date. Sano Property Services Limited is GST registered (GST No. 141-577-062). No lock-in contracts — you can pause or cancel any time.'

  return (
    <DocumentLayout
      wrapper={wrapper}
      kind="quote"
      meta={{
        number: quote.quote_number,
        dateIssuedDisplay: fmtDate(quote.date_issued),
        trailingDateLabel: 'Valid until',
        trailingDateDisplay: fmtDate(quote.valid_until),
      }}
      fromParty={fromParty}
      toParty={toParty}
      lineItems={lineItems}
      notes={quote.notes}
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
