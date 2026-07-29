// Render tests for the Full Property Reset structured scope in QuoteDocument,
// plus historical-compatibility (a free-text quote still renders its
// description and no scope markup). Pure presentation.

import { render, screen } from '@testing-library/react'
import { QuoteDocument, type QuoteDocumentInput } from '@/components/document/QuoteDocument'
import { buildDefaultResetScope, buildDefaultHousekeepingScope } from '@/lib/full-property-reset-scope'

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

describe('QuoteDocument — Residential Housekeeping (fixed weekly price, no hourly rate)', () => {
  it('renders the housekeeping title, scope, and a fixed $900 + GST total — never an hourly rate or qty×rate', () => {
    const scope = buildDefaultHousekeepingScope()
    const { container } = render(
      <QuoteDocument
        wrapper="print-overlay"
        quote={baseQuote({
          type_of_clean: 'Residential Housekeeping',
          structured_scope: scope,
          base_price: 900,          // manual fixed amount
          gst_included: false,      // GST added on top → $135 → $1,035
        })}
        items={[]}
      />,
    )
    // Customer-facing title from the scope.
    expect(screen.getByText('Weekly residential housekeeping service')).toBeInTheDocument()
    // Scope wording carries the weekly allocation (in the description, not a line).
    expect(screen.getByText('Laundry & linen')).toBeInTheDocument()
    // Fixed total maths: 900 + 15% GST = 1,035.
    const text = container.textContent ?? ''
    expect(text).toContain('$900.00')
    expect(text).toContain('$135.00')
    expect(text).toContain('$1,035.00')
    // NEVER an hourly rate, per-hour wording, or a qty × rate breakdown.
    expect(text).not.toMatch(/\$45|per hour|\/hr|hourly/i)
    expect(text).not.toMatch(/20\s*[x×]\s*\$?45/)
  })
})
