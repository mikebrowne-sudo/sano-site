/**
 * Commercial proposal — one-off vs recurring wording.
 *
 * Most commercial quotes are ongoing service and the proposal wording
 * assumes it (cadence, contract term, monthly fee, monthly invoicing).
 * A one-off clean is a single visit, so every one of those cues is
 * wrong. `siteContext.isOneOff` switches the content builders over.
 *
 * These tests pin both directions: recurring output must be unchanged,
 * and one-off output must be free of recurring language.
 */

import {
  buildExecutiveSummary,
  buildServiceOverviewText,
  buildPricingSummaryText,
} from '@/lib/proposals/content-builders'
import { proposalFixture } from '@/lib/proposals/buildProposalPayload'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

function payload(overrides: Partial<ProposalTemplatePayload> = {}): ProposalTemplatePayload {
  const base = proposalFixture()
  return { ...base, ...overrides }
}

function oneOffPayload(overrides: Partial<ProposalTemplatePayload> = {}): ProposalTemplatePayload {
  const base = payload(overrides)
  return { ...base, siteContext: { ...base.siteContext, isOneOff: true } }
}

/** Words that must never appear in a one-off proposal's prose. */
const RECURRING_CUES = [
  /per week/i,
  /once per week/i,
  /every day/i,
  /monthly/i,
  /per month/i,
  /ongoing/i,
  /full term of the contract/i,
  /service cycle/i,
  /day to day/i,
]

function assertNoRecurringCues(text: string) {
  for (const cue of RECURRING_CUES) {
    expect(text).not.toMatch(cue)
  }
}

describe('executive summary — site address', () => {
  it('does not repeat the site address in the opener (it is on the cover page)', () => {
    const p = payload({
      clientName: 'Kumeu River Wines',
      siteAddress: '550 State Highway 16, Kumeu',
    })
    const { opener } = buildExecutiveSummary(p)

    expect(opener).not.toContain('550 State Highway 16')
    expect(opener).not.toContain('Kumeu,')
    // Client name and site descriptor survive.
    expect(opener).toContain('Kumeu River Wines')
  })

  it('still names the client and site type', () => {
    const p = payload({ clientName: 'Acme Ltd', siteAddress: '1 Queen St, Auckland' })
    const { opener } = buildExecutiveSummary(p)
    expect(opener).toBe(
      'This proposal outlines the commercial cleaning services for Acme Ltd, a multi-level office site of approximately 1,200 m² across four floors.',
    )
  })
})

describe('executive summary — recurring (default)', () => {
  it('keeps the cadence sentence', () => {
    const p = payload({ serviceDays: 'Mon – Fri' })
    const { body } = buildExecutiveSummary(p)
    expect(body.join(' ')).toMatch(/Services are delivered/i)
  })

  it('opens with "the commercial cleaning services"', () => {
    const { opener } = buildExecutiveSummary(payload())
    expect(opener).toContain('the commercial cleaning services')
  })
})

describe('executive summary — one-off', () => {
  it('opens as a one-off clean', () => {
    const { opener } = buildExecutiveSummary(oneOffPayload({ clientName: 'Kumeu River Wines' }))
    expect(opener).toContain('a one-off commercial clean')
    expect(opener).toContain('Kumeu River Wines')
  })

  it('describes a single visit instead of a weekly cadence', () => {
    const p = oneOffPayload({ serviceDays: 'Mon – Fri', serviceTimes: '' })
    const { body } = buildExecutiveSummary(p)
    const text = body.join(' ')

    expect(text).toMatch(/single visit/i)
    assertNoRecurringCues(text)
  })

  it('keeps the service window when one is set', () => {
    const p = oneOffPayload({ serviceDays: 'Mon – Fri', serviceTimes: '1600-2200' })
    const { body } = buildExecutiveSummary(p)
    const text = body.join(' ')

    expect(text).toMatch(/single visit/i)
    expect(text).toMatch(/4:00 pm and 10:00 pm/)
    assertNoRecurringCues(text)
  })

  it('does not promise an ongoing assigned team', () => {
    const { body } = buildExecutiveSummary(oneOffPayload())
    expect(body.join(' ')).not.toMatch(/consistent small team is assigned to the site/i)
  })
})

describe('service overview', () => {
  it('recurring keeps schedule + service-cycle framing', () => {
    const text = buildServiceOverviewText(payload({ serviceDays: 'Mon – Fri' })).join(' ')
    expect(text).toMatch(/scheduled visits per week|daily service schedule/i)
  })

  it('one-off describes a single visit with no cadence or cycle', () => {
    const text = buildServiceOverviewText(
      oneOffPayload({ serviceDays: 'Mon – Fri', serviceTimes: '1600-2200' }),
    ).join(' ')

    expect(text).toMatch(/single visit/i)
    assertNoRecurringCues(text)
  })
})

describe('pricing summary', () => {
  it('recurring keeps the monthly fee and contract-term language', () => {
    const c = buildPricingSummaryText(payload())
    expect(c.intro).toMatch(/monthly service fee/i)
    expect(c.intro).toMatch(/full term of the contract/i)
    expect(c.closingNote).toMatch(/monthly in arrears/i)
  })

  it('one-off prices a fixed total with no monthly or contract wording', () => {
    const c = buildPricingSummaryText(oneOffPayload())

    expect(c.intro).toMatch(/fixed total for the visit/i)
    assertNoRecurringCues(c.intro)
    assertNoRecurringCues(c.inclusionsNote)
    assertNoRecurringCues(c.positioningNote)
    assertNoRecurringCues(c.included.join(' '))
  })

  it('one-off invoices on completion, not monthly in arrears', () => {
    const c = buildPricingSummaryText(oneOffPayload())
    expect(c.closingNote).toMatch(/issued on completion of the clean/i)
    expect(c.closingNote).not.toMatch(/monthly in arrears/i)
    // Payment terms still come from settings.
    expect(c.closingNote).toMatch(/day payment terms/i)
  })
})

describe('one-off flag defaults', () => {
  it('the fixture is recurring, so existing proposals are unchanged', () => {
    expect(proposalFixture().siteContext.isOneOff).toBe(false)
  })
})
