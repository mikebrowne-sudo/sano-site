// Tests for the shared DocumentLayout meta-grid behaviour. Focused
// on the new optional reference row added so client_reference / PO
// renders next to Invoice # / Issued / Due on customer-facing PDFs.

import { render, screen } from '@testing-library/react'
import { DocumentLayout, type DocumentLayoutProps } from '@/components/document/DocumentLayout'

function baseProps(overrides: Partial<DocumentLayoutProps> = {}): DocumentLayoutProps {
  return {
    wrapper: 'share-page',
    kind: 'invoice',
    meta: {
      number: 'INV-0099',
      dateIssuedDisplay: '15 June 2026',
      trailingDateLabel: 'Due',
      trailingDateDisplay: '29 June 2026',
    },
    fromParty: { name: 'Sano Property Services Limited' },
    toParty: { name: 'Test Client' },
    lineItems: [{ description: 'Service', amount: '$100.00' }],
    totals: {
      subtotalExGstDisplay: '$86.96',
      gstDisplay: '$13.04',
      totalDisplay: '$100.00',
    },
    termsBody: 'Test terms.',
    footer: { email: 'hello@sano.nz', phone: '0800 726 686', website: 'sano.nz' },
    ...overrides,
  }
}

describe('DocumentLayout meta-grid — reference row', () => {
  it('renders the optional reference row when label + display are both provided', () => {
    render(
      <DocumentLayout
        {...baseProps({
          meta: {
            number: 'INV-0099',
            dateIssuedDisplay: '15 June 2026',
            trailingDateLabel: 'Due',
            trailingDateDisplay: '29 June 2026',
            referenceLabel: 'Your reference / PO',
            referenceDisplay: 'PO-12345',
          },
        })}
      />,
    )
    expect(screen.getByText('Your reference / PO')).toBeInTheDocument()
    expect(screen.getByText('PO-12345')).toBeInTheDocument()
  })

  it('does not render the reference row when both fields are absent', () => {
    render(<DocumentLayout {...baseProps()} />)
    expect(screen.queryByText('Your reference / PO')).toBeNull()
  })

  it('does not render the reference row when only one field is supplied', () => {
    render(
      <DocumentLayout
        {...baseProps({
          meta: {
            number: 'INV-0099',
            dateIssuedDisplay: '15 June 2026',
            trailingDateLabel: 'Due',
            trailingDateDisplay: '29 June 2026',
            referenceLabel: 'Your reference / PO',
            // referenceDisplay intentionally omitted
          },
        })}
      />,
    )
    expect(screen.queryByText('Your reference / PO')).toBeNull()
  })

  it('always renders the existing Number / Issued / trailing-date rows', () => {
    render(<DocumentLayout {...baseProps()} />)
    expect(screen.getByText('Invoice #')).toBeInTheDocument()
    expect(screen.getByText('INV-0099')).toBeInTheDocument()
    expect(screen.getByText('Issued')).toBeInTheDocument()
    expect(screen.getByText('15 June 2026')).toBeInTheDocument()
    expect(screen.getByText('Due')).toBeInTheDocument()
    expect(screen.getByText('29 June 2026')).toBeInTheDocument()
  })

  it('uses "Quote #" / "Valid until" labels on quote documents', () => {
    render(
      <DocumentLayout
        {...baseProps({
          kind: 'quote',
          meta: {
            number: 'QT-0042',
            dateIssuedDisplay: '15 June 2026',
            trailingDateLabel: 'Valid until',
            trailingDateDisplay: '15 July 2026',
          },
        })}
      />,
    )
    expect(screen.getByText('Quote #')).toBeInTheDocument()
    expect(screen.getByText('Valid until')).toBeInTheDocument()
    expect(screen.queryByText('Invoice #')).toBeNull()
    expect(screen.queryByText('Due')).toBeNull()
  })
})
