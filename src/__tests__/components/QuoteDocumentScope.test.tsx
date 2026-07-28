// Render tests for the Full Property Reset structured scope in QuoteDocument,
// plus historical-compatibility (a free-text quote still renders its
// description and no scope markup). Pure presentation.

import { render, screen } from '@testing-library/react'
import { QuoteDocument, type QuoteDocumentInput } from '@/components/document/QuoteDocument'
import { buildDefaultResetScope } from '@/lib/full-property-reset-scope'

function baseQuote(overrides: Partial<QuoteDocumentInput> = {}): QuoteDocumentInput {
  return {
    quote_number: 'QUO-0261',
    date_issued: '2026-07-28',
    valid_until: '2026-08-27',
    property_category: 'residential',
    type_of_clean: 'Full Property Reset',
    base_price: 4550,
    gst_included: false,
    service_address: '56a Mangere Road',
    clients: { name: 'Te Whare Ruruhau o Meri Trust' },
    ...overrides,
  }
}

describe('QuoteDocument — Full Property Reset structured scope', () => {
  it('renders the scope title, intro, section headings and task lines', () => {
    const scope = buildDefaultResetScope()
    scope.expectedDuration = 'two days'
    render(<QuoteDocument wrapper="print-overlay" quote={baseQuote({ structured_scope: scope })} items={[]} />)

    // Bold section headings present.
    expect(screen.getByText('Bedrooms')).toBeInTheDocument()
    expect(screen.getByText('Kitchen')).toBeInTheDocument()
    // A representative task line.
    expect(screen.getByText('Deep clean the oven')).toBeInTheDocument()
    // Completion + Important notes headings rendered inside the scope.
    expect(screen.getByText('Completion approach')).toBeInTheDocument()
    expect(screen.getByText('Important notes')).toBeInTheDocument()
    // The main line uses the scope title.
    expect(screen.getByText('Full Property Reset')).toBeInTheDocument()
  })

  it('does NOT render a free-text "Service description" block when structured', () => {
    const scope = buildDefaultResetScope()
    render(
      <QuoteDocument
        wrapper="print-overlay"
        quote={baseQuote({ structured_scope: scope, generated_scope: 'IGNORED FREE TEXT' })}
        items={[]}
      />,
    )
    expect(screen.queryByText('Service description')).not.toBeInTheDocument()
    expect(screen.queryByText('IGNORED FREE TEXT')).not.toBeInTheDocument()
    // Service address still shows.
    expect(screen.getByText('Service address')).toBeInTheDocument()
  })

  it('historical free-text quotes are unchanged (no scope markup)', () => {
    render(
      <QuoteDocument
        wrapper="print-overlay"
        quote={baseQuote({ structured_scope: null, generated_scope: 'A standard deep clean of the property.' })}
        items={[]}
      />,
    )
    expect(screen.getByText('Service description')).toBeInTheDocument()
    expect(screen.getByText('A standard deep clean of the property.')).toBeInTheDocument()
    expect(screen.queryByText('Important notes')).not.toBeInTheDocument()
  })

  it('ignores malformed structured_scope and falls back to free-text', () => {
    render(
      <QuoteDocument
        wrapper="print-overlay"
        quote={baseQuote({ structured_scope: { not: 'a scope' }, generated_scope: 'Fallback description.' })}
        items={[]}
      />,
    )
    expect(screen.getByText('Fallback description.')).toBeInTheDocument()
  })
})
