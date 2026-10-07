/**
 * Assumptions & exclusions must reach the client.
 *
 * They were captured on the quote and carried into the proposal payload, but
 * no page rendered them — so on the Hallertau Riverhead tender the kitchen
 * exclusion, the "kegs and heavy items" limit and the first-visit-only glass
 * were all invisible to the reader. On a commercial tender that section
 * defines the boundary of the job.
 */

import { render, screen } from '@testing-library/react'
import {
  AssumptionsExclusionsPage,
  shouldRenderAssumptionsExclusions,
} from '@/components/proposals/AssumptionsExclusionsPage'
import { proposalFixture } from '@/lib/proposals/buildProposalPayload'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

function payload(over: Partial<ProposalTemplatePayload> = {}): ProposalTemplatePayload {
  return { ...proposalFixture(), ...over }
}

// The real values from QUO-0348.
const HALLERTAU_EXCLUSIONS = [
  'Commercial kitchen interior, cooking equipment, extraction, canopies and filters.',
  'Bar equipment including beer lines, taps and drip trays.',
  'Kegs and heavy items — light items only are moved to clean behind the bar.',
  'Polished concrete burnishing and resealing.',
  'Formal playground safety inspection.',
]

describe('shouldRenderAssumptionsExclusions', () => {
  it('renders when there are exclusions', () => {
    expect(shouldRenderAssumptionsExclusions(
      payload({ assumptions: [], exclusions: ['Something'], complianceNotes: '' }))).toBe(true)
  })

  it('renders when there are only assumptions', () => {
    expect(shouldRenderAssumptionsExclusions(
      payload({ assumptions: ['Something'], exclusions: [], complianceNotes: '' }))).toBe(true)
  })

  it('renders when there are only compliance notes', () => {
    expect(shouldRenderAssumptionsExclusions(
      payload({ assumptions: [], exclusions: [], complianceNotes: 'HACCP applies.' }))).toBe(true)
  })

  it('skips the page entirely when nothing is captured', () => {
    // An empty page of headings is worse than no page.
    expect(shouldRenderAssumptionsExclusions(
      payload({ assumptions: [], exclusions: [], complianceNotes: '   ' }))).toBe(false)
  })
})

describe('AssumptionsExclusionsPage', () => {
  it('renders every exclusion line', () => {
    render(<AssumptionsExclusionsPage
      payload={payload({ exclusions: HALLERTAU_EXCLUSIONS, assumptions: [], complianceNotes: '' })}
      pageNumber={6} totalPages={9} />)

    for (const line of HALLERTAU_EXCLUSIONS) {
      expect(screen.getByText(line)).toBeInTheDocument()
    }
  })

  it('names the kitchen exclusion, which matters most on a venue tender', () => {
    render(<AssumptionsExclusionsPage
      payload={payload({ exclusions: HALLERTAU_EXCLUSIONS, assumptions: [], complianceNotes: '' })}
      pageNumber={6} totalPages={9} />)
    expect(screen.getByText(/Commercial kitchen interior/)).toBeInTheDocument()
  })

  it('renders assumptions under their own heading', () => {
    render(<AssumptionsExclusionsPage
      payload={payload({
        assumptions: ['After-hours site access provided, with cleaning outside trading hours.'],
        exclusions: [], complianceNotes: '',
      })}
      pageNumber={6} totalPages={9} />)

    expect(screen.getByText('Assumptions')).toBeInTheDocument()
    expect(screen.getByText(/After-hours site access/)).toBeInTheDocument()
  })

  it('labels exclusions in plain language', () => {
    render(<AssumptionsExclusionsPage
      payload={payload({ exclusions: ['One thing'], assumptions: [], complianceNotes: '' })}
      pageNumber={6} totalPages={9} />)
    expect(screen.getByText('Not included')).toBeInTheDocument()
  })

  it('omits a heading whose list is empty', () => {
    render(<AssumptionsExclusionsPage
      payload={payload({ exclusions: ['One thing'], assumptions: [], complianceNotes: '' })}
      pageNumber={6} totalPages={9} />)
    expect(screen.queryByText('Assumptions')).not.toBeInTheDocument()
    expect(screen.queryByText('Compliance')).not.toBeInTheDocument()
  })

  it('splits multi-line compliance notes into separate points', () => {
    render(<AssumptionsExclusionsPage
      payload={payload({
        assumptions: [], exclusions: [],
        complianceNotes: 'Site induction required.\nHACCP protocol applies in kitchen.',
      })}
      pageNumber={6} totalPages={9} />)

    expect(screen.getByText('Site induction required.')).toBeInTheDocument()
    expect(screen.getByText('HACCP protocol applies in kitchen.')).toBeInTheDocument()
  })

  it('states that anything unlisted is a variation', () => {
    render(<AssumptionsExclusionsPage
      payload={payload({ exclusions: ['One thing'], assumptions: [], complianceNotes: '' })}
      pageNumber={6} totalPages={9} />)
    expect(screen.getByText(/treated as a variation/)).toBeInTheDocument()
  })
})

describe('layout', () => {
  it('does not use the icon-tile grid, which squeezes text into a narrow column', () => {
    // .proposal-scope-row is `grid-template-columns: 13mm 1fr` with the first
    // column holding an icon tile. This page has no icons, so reusing it left
    // an empty 13mm column and rendered the list vertically down the page.
    const { container } = render(<AssumptionsExclusionsPage
      payload={payload({
        assumptions: ['A'], exclusions: ['B'], complianceNotes: '',
      })}
      pageNumber={6} totalPages={9} />)

    expect(container.querySelector('.proposal-scope-row')).toBeNull()
    expect(container.querySelector('.proposal-terms-stack')).not.toBeNull()
    expect(container.querySelectorAll('.proposal-terms-block')).toHaveLength(2)
  })

  it('renders assumptions and exclusions as separate blocks', () => {
    const { container } = render(<AssumptionsExclusionsPage
      payload={payload({
        assumptions: ['A one', 'A two'],
        exclusions: ['E one', 'E two', 'E three'],
        complianceNotes: '',
      })}
      pageNumber={6} totalPages={9} />)

    const lists = container.querySelectorAll('.proposal-terms-block__list')
    expect(lists).toHaveLength(2)
    expect(lists[0].querySelectorAll('li')).toHaveLength(2)
    expect(lists[1].querySelectorAll('li')).toHaveLength(3)
  })
})
