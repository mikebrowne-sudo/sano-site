// Focused tests for the urgent fixes in InvoiceDocument:
//   1. client_reference renders as a dedicated row in the document
//      meta-grid header (next to Invoice # / Issued / Due) when set.
//   2. The Issued date falls back to invoice.created_at when
//      invoice.date_issued is null — covers PDFs downloaded outside
//      the send-flow's pre-render stamp.
//   3. The reference is removed from the "Billed to" address block
//      so it doesn't render twice.

import { render, screen } from '@testing-library/react'
import { InvoiceDocument, type InvoiceDocumentInput } from '@/components/document/InvoiceDocument'

function makeInvoice(partial: Partial<InvoiceDocumentInput> = {}): InvoiceDocumentInput {
  return {
    invoice_number: 'INV-0099',
    date_issued: '2026-06-15',
    due_date: '2026-06-29',
    created_at: null,
    payment_type: 'on_account',
    base_price: 100,
    discount: 0,
    gst_included: false,
    notes: null,
    service_address: '123 Example Rd, Auckland',
    scheduled_clean_date: null,
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    accounts_contact_name: null,
    accounts_email: null,
    client_reference: null,
    quotes: null,
    clients: {
      name: 'Test Client',
      company_name: null,
      service_address: '123 Example Rd, Auckland',
      phone: null,
      email: 'client@example.com',
    },
    ...partial,
  }
}

describe('InvoiceDocument — client_reference in the meta-grid header', () => {
  it('renders "Your reference / PO" in the header when client_reference is set', () => {
    render(
      <InvoiceDocument
        wrapper="share-page"
        invoice={makeInvoice({ client_reference: 'PO-12345' })}
        items={[]}
      />,
    )
    expect(screen.getAllByText('Your reference / PO').length).toBeGreaterThanOrEqual(1)
    // The value appears in the meta-grid header AND in the Payment
    // Details block (bank-transfer reference). Both are intentional.
    expect(screen.getAllByText('PO-12345').length).toBeGreaterThanOrEqual(1)
  })

  it('does not render the meta-grid reference row when client_reference is null', () => {
    render(
      <InvoiceDocument
        wrapper="share-page"
        invoice={makeInvoice({ client_reference: null })}
        items={[]}
      />,
    )
    expect(screen.queryByText('Your reference / PO')).toBeNull()
  })

  it('does not render the meta-grid reference row for whitespace-only values', () => {
    render(
      <InvoiceDocument
        wrapper="share-page"
        invoice={makeInvoice({ client_reference: '   ' })}
        items={[]}
      />,
    )
    expect(screen.queryByText('Your reference / PO')).toBeNull()
  })

  it('does NOT include "Reference: …" inside the Billed-to address block', () => {
    // Previously this rendered as one of the PartyBlock detail lines —
    // verify that's gone so client_reference no longer renders twice.
    render(
      <InvoiceDocument
        wrapper="share-page"
        invoice={makeInvoice({ client_reference: 'PO-12345' })}
        items={[]}
      />,
    )
    expect(screen.queryByText(/^Reference: PO-12345$/)).toBeNull()
  })
})

describe('InvoiceDocument — reference inheritance from linked quote', () => {
  // Invoices created via the job→invoice path historically did not copy
  // client_reference forward from the source quote. Display-time fallback
  // covers those existing rows; the conversion path itself was also
  // patched so new invoices carry the value through.

  it('uses invoice.client_reference when set, ignoring the quote', () => {
    render(
      <InvoiceDocument
        wrapper="share-page"
        invoice={makeInvoice({
          client_reference: 'INV-OWN-REF',
          quotes: { client_reference: 'QUOTE-REF' },
        })}
        items={[]}
      />,
    )
    expect(screen.getAllByText('INV-OWN-REF').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('QUOTE-REF')).toBeNull()
  })

  it('falls back to invoice.quotes.client_reference when invoice.client_reference is null', () => {
    render(
      <InvoiceDocument
        wrapper="share-page"
        invoice={makeInvoice({
          client_reference: null,
          quotes: { client_reference: 'QUOTE-PO-99' },
        })}
        items={[]}
      />,
    )
    expect(screen.getAllByText('Your reference / PO').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('QUOTE-PO-99').length).toBeGreaterThanOrEqual(1)
  })

  it('falls back to invoice.quotes.client_reference when invoice.client_reference is whitespace-only', () => {
    render(
      <InvoiceDocument
        wrapper="share-page"
        invoice={makeInvoice({
          client_reference: '   ',
          quotes: { client_reference: 'QUOTE-PO-WS' },
        })}
        items={[]}
      />,
    )
    expect(screen.getAllByText('QUOTE-PO-WS').length).toBeGreaterThanOrEqual(1)
  })

  it('renders no reference row when both invoice.client_reference and invoice.quotes.client_reference are null', () => {
    render(
      <InvoiceDocument
        wrapper="share-page"
        invoice={makeInvoice({
          client_reference: null,
          quotes: { client_reference: null },
        })}
        items={[]}
      />,
    )
    expect(screen.queryByText('Your reference / PO')).toBeNull()
  })

  it('renders no reference row when the invoice has no linked quote at all', () => {
    render(
      <InvoiceDocument
        wrapper="share-page"
        invoice={makeInvoice({ client_reference: null, quotes: null })}
        items={[]}
      />,
    )
    expect(screen.queryByText('Your reference / PO')).toBeNull()
  })
})

describe('InvoiceDocument — Issued date fallback to created_at', () => {
  it('uses date_issued when present', () => {
    render(
      <InvoiceDocument
        wrapper="share-page"
        invoice={makeInvoice({ date_issued: '2026-06-15', created_at: '2026-05-01T10:00:00Z' })}
        items={[]}
      />,
    )
    expect(screen.getByText('15 June 2026')).toBeInTheDocument()
    expect(screen.queryByText('1 May 2026')).toBeNull()
  })

  it('falls back to created_at when date_issued is null', () => {
    render(
      <InvoiceDocument
        wrapper="share-page"
        invoice={makeInvoice({ date_issued: null, created_at: '2026-05-01T10:00:00Z' })}
        items={[]}
      />,
    )
    expect(screen.getByText('1 May 2026')).toBeInTheDocument()
  })

  it('renders em-dash only when BOTH date_issued and created_at are null', () => {
    render(
      <InvoiceDocument
        wrapper="share-page"
        invoice={makeInvoice({ date_issued: null, created_at: null })}
        items={[]}
      />,
    )
    // The em-dash from DocumentLayout's fmtDate should appear next
    // to the "Issued" label. We don't have a real date in the
    // meta-grid in this scenario.
    expect(screen.queryByText('15 June 2026')).toBeNull()
    expect(screen.queryByText('1 May 2026')).toBeNull()
    expect(screen.getByText('Issued')).toBeInTheDocument()
  })
})
