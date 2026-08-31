/**
 * Executive summary must name the reader's own spaces.
 *
 * The site-framing sentence was hardcoded office vocabulary — "workspaces,
 * shared areas, and amenities" — regardless of sector. On a restaurant or
 * brewery tender that reads as a template nobody adjusted, which is the one
 * impression a proposal cannot afford to give. Caught while reviewing the
 * Hallertau Riverhead proposal output.
 */

import { buildExecutiveSummary } from '@/lib/proposals/content-builders'
import { proposalFixture } from '@/lib/proposals/buildProposalPayload'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

function forSector(sector: string, oneOff = false): string {
  const base = proposalFixture()
  const payload: ProposalTemplatePayload = {
    ...base,
    siteContext: { ...base.siteContext, sector, isOneOff: oneOff },
  }
  const out = buildExecutiveSummary(payload)
  return [out.opener, ...out.body].join(' ')
}

describe('executive summary — sector-appropriate area language', () => {
  it('names venue spaces for hospitality, never "workspaces"', () => {
    const out = forSector('Hospitality')
    expect(out).toContain('dining and public areas')
    expect(out).toContain('bar and service areas')
    expect(out).not.toContain('workspaces')
  })

  it('keeps the established office wording unchanged', () => {
    expect(forSector('Office')).toContain('workspaces, shared areas, and amenities')
  })

  it('uses classroom language for education', () => {
    const out = forSector('Education')
    expect(out).toContain('classrooms')
    expect(out).not.toContain('workspaces')
  })

  it('uses clinical language for medical', () => {
    const out = forSector('Medical / Healthcare'.split(' /')[0])
    expect(out).toContain('clinical spaces')
  })

  it('falls back to neutral wording for an unknown sector', () => {
    // Never borrow another sector's vocabulary on a sector we don't map.
    const out = forSector('Something Unmapped')
    expect(out).toContain('public-facing areas')
    expect(out).not.toContain('workspaces')
    expect(out).not.toContain('classrooms')
  })

  it('applies the same vocabulary to a one-off clean', () => {
    const out = forSector('Hospitality', true)
    expect(out).toContain('dining and public areas')
    expect(out).toContain('single visit')
    expect(out).not.toContain('workspaces')
  })

  it('is case-insensitive on the sector label', () => {
    expect(forSector('hospitality')).toContain('dining and public areas')
    expect(forSector('HOSPITALITY')).toContain('dining and public areas')
  })
})
