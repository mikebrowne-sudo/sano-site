import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ServiceChecklist } from '@/components/ServiceChecklist'
import { totalChecklistItems, type Checklist } from '@/types/checklist'

const baseChecklist: Checklist = {
  slug: 'sano-100-point-home-clean',
  name: 'Sano 100-Point Home Clean Checklist',
  shortName: 'Home Clean Standard',
  pointCountLabel: '100-Point',
  rooms: [
    {
      slug: 'kitchen',
      name: 'Kitchen',
      items: [
        { text: 'Benchtops cleaned' },
        { text: 'Sink polished' },
      ],
    },
    {
      slug: 'bathrooms',
      name: 'Bathrooms',
      items: [
        { text: 'Shower de-scaled' },
        { text: 'Toilet sanitised' },
        { text: 'Mirrors polished' },
      ],
    },
  ],
}

describe('ServiceChecklist', () => {
  it('renders the eyebrow, heading, and intro', () => {
    render(
      <ServiceChecklist
        checklist={baseChecklist}
        eyebrow="Home Clean Standard"
        intro="Everything we do on a standard residential clean."
      />,
    )
    expect(screen.getByText('Home Clean Standard')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: baseChecklist.name }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Everything we do on a standard residential clean.'),
    ).toBeInTheDocument()
  })

  it('emphasises the headingHighlight phrase inside the heading when provided', () => {
    render(
      <ServiceChecklist
        checklist={baseChecklist}
        eyebrow="WHAT'S INCLUDED"
        displayHeading="100-Point Home Clean Checklist"
        headingHighlight="100-Point Home Clean"
      />,
    )
    const heading = screen.getByRole('heading', { level: 2 })
    const emphasised = heading.querySelector('span.text-sage-500')
    expect(emphasised).not.toBeNull()
    expect(emphasised?.textContent).toBe('100-Point Home Clean')
    expect(heading.textContent).toBe('100-Point Home Clean Checklist')
  })

  it('uses displayHeading in place of checklist.name when provided', () => {
    render(
      <ServiceChecklist
        checklist={baseChecklist}
        eyebrow="WHAT'S INCLUDED"
        displayHeading="100-Point Home Clean Checklist"
      />,
    )
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.textContent).toBe('100-Point Home Clean Checklist')
    // No headingHighlight passed → no bold-sage span
    expect(heading.querySelector('span.text-sage-500')).toBeNull()
  })

  it('falls back to checklist.name when no displayHeading is provided', () => {
    render(<ServiceChecklist checklist={baseChecklist} eyebrow="WHAT'S INCLUDED" />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.textContent).toBe('Sano 100-Point Home Clean Checklist')
    // No headingHighlight passed → no bold-sage span
    expect(heading.querySelector('span.text-sage-500')).toBeNull()
  })

  it('does not render a highlight span when headingHighlight is not found in the heading', () => {
    render(
      <ServiceChecklist
        checklist={baseChecklist}
        eyebrow="WHAT'S INCLUDED"
        displayHeading="Some Heading"
        headingHighlight="nonexistent-phrase"
      />,
    )
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.querySelector('span.text-sage-500')).toBeNull()
    expect(heading.textContent).toBe('Some Heading')
  })

  it('renders the caveat note when checklist.caveat is set', () => {
    const withCaveat: Checklist = {
      ...baseChecklist,
      caveatTitle: 'A quick note on deep cleans',
      caveat: 'Deep cleaning is condition-based. Inclusions depend on property size, condition, access, selected scope and agreed time allowance.',
    }
    render(<ServiceChecklist checklist={withCaveat} eyebrow="Deep Clean" />)
    expect(screen.getByText('A quick note on deep cleans')).toBeInTheDocument()
    expect(
      screen.getByText(/Deep cleaning is condition-based/),
    ).toBeInTheDocument()
  })

  it('falls back to "A quick note" when caveat is set but caveatTitle is not', () => {
    const withCaveatOnly: Checklist = {
      ...baseChecklist,
      caveat: 'Some scope-limiting clarification.',
    }
    render(<ServiceChecklist checklist={withCaveatOnly} eyebrow="Deep Clean" />)
    expect(screen.getByText('A quick note')).toBeInTheDocument()
    expect(screen.getByText('Some scope-limiting clarification.')).toBeInTheDocument()
  })

  it('renders the caveat note AFTER the active item list (below the cards, not in the header)', () => {
    const withCaveat: Checklist = {
      ...baseChecklist,
      caveatTitle: 'A quick note on deep cleans',
      caveat: 'Deep cleaning is condition-based.',
    }
    const { container } = render(
      <ServiceChecklist checklist={withCaveat} eyebrow="Deep Clean" />,
    )
    const tabpanel = screen.getByRole('tabpanel')
    const caveat = screen.getByText('A quick note on deep cleans')
    // Caveat aside must come AFTER the tabpanel in document order
    // (compareDocumentPosition: 0x04 = "follows").
    expect(tabpanel.compareDocumentPosition(caveat) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Sanity: container actually has both nodes.
    expect(container.contains(tabpanel)).toBe(true)
    expect(container.contains(caveat)).toBe(true)
  })

  it('renders the caveat note AFTER the CTA strip when both are present (caveat is the final block)', () => {
    const withCaveatAndCta: Checklist = {
      ...baseChecklist,
      caveatTitle: 'A quick note on deep cleans',
      caveat: 'Deep cleaning is condition-based.',
    }
    render(
      <ServiceChecklist
        checklist={withCaveatAndCta}
        eyebrow="Deep Clean"
        showQuoteCta
        ctaLabel="Get a free quote for a deep clean"
      />,
    )
    const cta = screen.getByRole('link', { name: 'Get a free quote for a deep clean' })
    const caveat = screen.getByText('A quick note on deep cleans')
    // Caveat must come AFTER the CTA in document order.
    expect(cta.compareDocumentPosition(caveat) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows a DRAFT badge when checklist.isDraft is true', () => {
    const draft: Checklist = { ...baseChecklist, isDraft: true }
    render(<ServiceChecklist checklist={draft} eyebrow="Home Clean" />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('does not show a DRAFT badge when checklist.isDraft is false or undefined', () => {
    render(<ServiceChecklist checklist={baseChecklist} eyebrow="Home Clean" />)
    expect(screen.queryByText('Draft')).not.toBeInTheDocument()
  })

  it('renders the first room as the active panel by default', () => {
    render(<ServiceChecklist checklist={baseChecklist} eyebrow="Home Clean" />)
    expect(
      screen.getByRole('heading', { level: 3, name: 'Kitchen' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Benchtops cleaned')).toBeInTheDocument()
    expect(screen.getByText('Sink polished')).toBeInTheDocument()
    // Bathroom items should not be visible yet
    expect(screen.queryByText('Shower de-scaled')).not.toBeInTheDocument()
  })

  it('marks the first pill as aria-selected on initial render', () => {
    render(<ServiceChecklist checklist={baseChecklist} eyebrow="Home Clean" />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false')
  })

  it('switches active room when another pill is clicked', async () => {
    const user = userEvent.setup()
    render(<ServiceChecklist checklist={baseChecklist} eyebrow="Home Clean" />)

    const bathroomsPill = screen.getByRole('tab', { name: /Bathrooms/ })
    await user.click(bathroomsPill)

    expect(bathroomsPill).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByRole('heading', { level: 3, name: 'Bathrooms' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Shower de-scaled')).toBeInTheDocument()
    // Kitchen items gone
    expect(screen.queryByText('Benchtops cleaned')).not.toBeInTheDocument()
  })

  it('reflects the active room item count in the room header badge', async () => {
    const user = userEvent.setup()
    render(<ServiceChecklist checklist={baseChecklist} eyebrow="Home Clean" />)

    // Default Kitchen room has 2 items
    const initialPanel = screen.getByRole('tabpanel')
    expect(within(initialPanel).getByText('2 items')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Bathrooms/ }))

    // Bathrooms has 3 items
    const newPanel = screen.getByRole('tabpanel')
    expect(within(newPanel).getByText('3 items')).toBeInTheDocument()
  })

  it('renders the CTA when showQuoteCta is true', () => {
    render(
      <ServiceChecklist
        checklist={baseChecklist}
        eyebrow="Home Clean"
        showQuoteCta
        ctaHref="/contact"
        ctaLabel="Get a free quote for your home"
      />,
    )
    const cta = screen.getByRole('link', { name: 'Get a free quote for your home' })
    expect(cta).toBeInTheDocument()
    expect(cta).toHaveAttribute('href', '/contact')
  })

  it('does not render the CTA when showQuoteCta is false', () => {
    render(<ServiceChecklist checklist={baseChecklist} eyebrow="Home Clean" />)
    expect(
      screen.queryByRole('link', { name: /get a free quote/i }),
    ).not.toBeInTheDocument()
  })

  it('uses checklist.slug as the section anchor id when anchorId is not provided', () => {
    const { container } = render(
      <ServiceChecklist checklist={baseChecklist} eyebrow="Home Clean" />,
    )
    expect(container.querySelector('section')).toHaveAttribute(
      'id',
      'sano-100-point-home-clean',
    )
  })

  it('uses the provided anchorId when set', () => {
    const { container } = render(
      <ServiceChecklist
        checklist={baseChecklist}
        eyebrow="Home Clean"
        anchorId="home-clean-checklist"
      />,
    )
    expect(container.querySelector('section')).toHaveAttribute(
      'id',
      'home-clean-checklist',
    )
  })
})

describe('totalChecklistItems helper', () => {
  it('returns the sum of items across all rooms', () => {
    expect(totalChecklistItems(baseChecklist)).toBe(5)
  })

  it('returns 0 for a checklist with no rooms', () => {
    expect(totalChecklistItems({ ...baseChecklist, rooms: [] })).toBe(0)
  })
})
