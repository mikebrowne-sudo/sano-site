/**
 * Why Sano + Acceptance — one-off vs recurring copy.
 *
 * Both pages are rendered unconditionally by ProposalDocument, so
 * their copy has to switch on siteContext.isOneOff along with the
 * content-builders. Without it a one-off PDF contradicts itself: the
 * executive summary says "single visit", then Why Sano promises
 * standards "maintained over time" a page later.
 */

import { render, screen } from '@testing-library/react'
import { WhySanoPage } from '@/components/proposals/WhySanoPage'
import { AcceptancePage } from '@/components/proposals/AcceptancePage'
import { proposalFixture } from '@/lib/proposals/buildProposalPayload'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

function recurring(): ProposalTemplatePayload {
  return proposalFixture()
}

function oneOff(): ProposalTemplatePayload {
  const base = proposalFixture()
  return { ...base, siteContext: { ...base.siteContext, isOneOff: true } }
}

/** Visible text of the rendered page, whitespace-normalised. */
function pageText(): string {
  return (document.body.textContent ?? '').replace(/\s+/g, ' ')
}

describe('WhySanoPage', () => {
  it('drops over-time / ongoing-relationship language on a one-off', () => {
    render(<WhySanoPage payload={oneOff()} pageNumber={2} totalPages={8} />)
    const text = pageText()

    expect(text).not.toMatch(/over time/i)
    expect(text).not.toMatch(/across every visit/i)
    expect(text).not.toMatch(/assigned to your site/i)

    // Still makes the substantive points.
    expect(text).toMatch(/defined scope/i)
    expect(text).toMatch(/done properly the first time/i)
  })

  it('keeps "Sano crew" exactly once on a one-off', () => {
    render(<WhySanoPage payload={oneOff()} pageNumber={2} totalPages={8} />)
    const matches = pageText().match(/Sano crew/g) ?? []
    expect(matches).toHaveLength(1)
  })

  it('is unchanged for recurring quotes', () => {
    render(<WhySanoPage payload={recurring()} pageNumber={2} totalPages={8} />)
    const text = pageText()
    expect(text).toMatch(/over time/i)
    expect(text).toMatch(/assigned to your site/i)
  })
})

describe('AcceptancePage', () => {
  it('drops the "ongoing" promise on a one-off', () => {
    render(<AcceptancePage payload={oneOff()} pageNumber={8} totalPages={8} />)
    const text = pageText()

    expect(text).not.toMatch(/ongoing/i)
    expect(text).toMatch(/pleased to work with you/i)
    expect(text).toMatch(/considering Sano for this clean/i)
  })

  it('is unchanged for recurring quotes', () => {
    render(<AcceptancePage payload={recurring()} pageNumber={8} totalPages={8} />)
    const text = pageText()
    expect(text).toMatch(/ongoing presentation/i)
    expect(text).toMatch(/commercial cleaning services/i)
  })

  it('still shows the acceptance agreement wording either way', () => {
    render(<AcceptancePage payload={oneOff()} pageNumber={8} totalPages={8} />)
    expect(screen.getByText(/accepts the scope, pricing, and terms/i)).toBeInTheDocument()
  })
})
