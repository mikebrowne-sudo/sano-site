// Render tests for the Full Property Reset structured scope in QuoteDocument,
// plus historical-compatibility (a free-text quote still renders its
// description and no scope markup). Pure presentation.

import { render, screen } from '@testing-library/react'
import { QuoteDocument, type QuoteDocumentInput } from '@/components/document/QuoteDocument'
import { buildDefaultResetScope, buildDefaultHousekeepingScope, buildHousekeepingIntro } from '@/lib/full-property-reset-scope'

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
  it('renders the entered weekly hours in the description, plus a fixed $900 + GST total — never an hourly rate or qty×rate', () => {
    const scope = buildDefaultHousekeepingScope()
    // Staff enter the quote-specific allocation; the intro regenerates from it.
    scope.weeklyHours = '20'
    scope.serviceDays = 'Monday, Wednesday and Friday'
    scope.intro = buildHousekeepingIntro({ weeklyHours: scope.weeklyHours, serviceDays: scope.serviceDays })
    const { container } = render(
      <QuoteDocument
        wrapper="print-overlay"
        quote={baseQuote({
          type_of_clean: 'Residential Housekeeping',
          service_type_code: 'residential_housekeeping',
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
    const text = container.textContent ?? ''
    // The ENTERED weekly hours + days appear in the customer description.
    expect(text).toMatch(/up to 20 hours/)
    expect(text).toContain('Monday, Wednesday and Friday')
    // Fixed total maths: 900 + 15% GST = 1,035.
    expect(text).toContain('$900.00')
    expect(text).toContain('$135.00')
    expect(text).toContain('$1,035.00')
    // NEVER an hourly rate, per-hour wording, or a qty × rate breakdown.
    expect(text).not.toMatch(/\$45|per hour|\/hr|hourly/i)
    expect(text).not.toMatch(/20\s*[x×]\s*\$?45/)
  })

  it('changing the weekly hours does NOT change the fixed price', () => {
    const mk = (hours: string) => {
      const scope = buildDefaultHousekeepingScope()
      scope.weeklyHours = hours
      scope.intro = buildHousekeepingIntro({ weeklyHours: hours, serviceDays: '' })
      return baseQuote({ type_of_clean: 'Residential Housekeeping', service_type_code: 'residential_housekeeping', structured_scope: scope, base_price: 900, gst_included: false })
    }
    const a = render(<QuoteDocument wrapper="print-overlay" quote={mk('20')} items={[]} />)
    expect(a.container.textContent).toContain('$900.00')
    a.unmount()
    const b = render(<QuoteDocument wrapper="print-overlay" quote={mk('35')} items={[]} />)
    // Different hours wording, identical fixed price.
    expect(b.container.textContent).toMatch(/up to 35 hours/)
    expect(b.container.textContent).toContain('$900.00')
    expect(b.container.textContent).toContain('$1,035.00')
  })

  it('blank weekly hours render clean neutral wording (no placeholder / broken text)', () => {
    const scope = buildDefaultHousekeepingScope() // hours + days blank
    const { container } = render(
      <QuoteDocument wrapper="print-overlay"
        quote={baseQuote({ type_of_clean: 'Residential Housekeeping', service_type_code: 'residential_housekeeping', structured_scope: scope, base_price: 900, gst_included: false })}
        items={[]} />,
    )
    const text = container.textContent ?? ''
    expect(text).toContain('within the agreed weekly service allocation')
    expect(text).not.toMatch(/\[|\]|undefined|up to\s+hours|across\s*\./)
    expect(text).toContain('$900.00') // price unaffected by blank hours
  })
})

describe('QuoteDocument — Residential Housekeeping "per week" price label (dynamic)', () => {
  const hk = (base_price: number) =>
    baseQuote({
      type_of_clean: 'Residential Housekeeping',
      service_type_code: 'residential_housekeeping',
      structured_scope: buildDefaultHousekeepingScope(),
      base_price,
      gst_included: false,
    })

  it('shows the main line amount as "$900.00 per week" and the per-week note; totals stay bare', () => {
    const { container } = render(<QuoteDocument wrapper="print-overlay" quote={hk(900)} items={[]} />)
    const text = container.textContent ?? ''
    expect(text).toContain('$900.00 per week')                 // main line carries the label
    expect(text).toContain('All prices shown are per week.')   // customer note
    // Totals block is bare (no "per week" on subtotal / GST / total).
    expect(text).toContain('$135.00')
    expect(text).toContain('$1,035.00')
    expect(text).not.toMatch(/\$135\.00 per week/)
    expect(text).not.toMatch(/\$1,035\.00 per week/)
    // No hourly rate / qty×rate breakdown (e.g. "20 x $45").
    expect(text).not.toMatch(/\$45|per hour|\/hr|hourly/i)
    expect(text).not.toMatch(/\d+\s*[x×]\s*\$\d/)
  })

  it('is DYNAMIC — the label uses whatever fixed price is entered (not hard-coded $900)', () => {
    const a = render(<QuoteDocument wrapper="print-overlay" quote={hk(950)} items={[]} />)
    const at = a.container.textContent ?? ''
    expect(at).toContain('$950.00 per week')
    expect(at).toContain('$1,092.50')          // 950 + 15% GST
    expect(at).not.toContain('$900.00 per week')
    a.unmount()

    const b = render(<QuoteDocument wrapper="print-overlay" quote={hk(1100)} items={[]} />)
    const bt = b.container.textContent ?? ''
    expect(bt).toContain('$1,100.00 per week')
    expect(bt).toContain('$1,265.00')          // 1100 + 15% GST
  })

  it('does NOT add "per week" to Full Property Reset', () => {
    const { container } = render(
      <QuoteDocument wrapper="print-overlay"
        quote={baseQuote({ type_of_clean: 'Full Property Reset', service_type_code: 'full_property_reset', structured_scope: buildDefaultResetScope(), base_price: 4550, gst_included: false })}
        items={[]} />,
    )
    const text = container.textContent ?? ''
    expect(text).toContain('$4,550.00')
    expect(text).not.toMatch(/per week/)
    expect(text).not.toContain('All prices shown are per week.')
  })

  it('does NOT add "per week" to a standard residential quote', () => {
    const { container } = render(
      <QuoteDocument wrapper="print-overlay"
        quote={baseQuote({ type_of_clean: 'Standard Clean', service_type_code: 'standard_clean', structured_scope: null, generated_scope: 'A standard clean.', base_price: 250, gst_included: false })}
        items={[]} />,
    )
    const text = container.textContent ?? ''
    expect(text).toContain('$250.00')
    expect(text).not.toMatch(/per week/)
    expect(text).not.toContain('All prices shown are per week.')
  })
})
