/**
 * The proposal footer must carry the real Sano phone number.
 *
 * It said 0800 726 664 while the entire rest of the business - contact page,
 * homepage schema markup, marketing collateral, cron notifications - says
 * 0800 726 686. The proposal_settings table is empty in production, so the
 * code default is what renders, and the wrong number was printing on the
 * footer of all nine pages of every commercial proposal sent.
 *
 * A wrong phone number on a tender is worse than a typo: a client who cannot
 * reach you does not call the other number, they call the other cleaner.
 */

import { DEFAULT_PROPOSAL_SETTINGS } from '@/lib/proposals/proposal-settings'
import { SANO_PROPOSAL_CONTACT, proposalFixture } from '@/lib/proposals/buildProposalPayload'

const SANO_PHONE = '0800 726 686'

describe('proposal contact details', () => {
  it('uses the real phone number in the settings default', () => {
    expect(DEFAULT_PROPOSAL_SETTINGS.footer.footer_phone).toBe(SANO_PHONE)
  })

  it('uses the real phone number in the contact constant', () => {
    expect(SANO_PROPOSAL_CONTACT.phone).toBe(SANO_PHONE)
  })

  it('renders the real phone number on a built payload', () => {
    // proposal_settings is empty in production, so the default is what a
    // client actually receives.
    expect(proposalFixture().contact?.phone).toBe(SANO_PHONE)
  })

  it('never uses the old 664 number anywhere in proposal defaults', () => {
    const blob = JSON.stringify(DEFAULT_PROPOSAL_SETTINGS) + JSON.stringify(SANO_PROPOSAL_CONTACT)
    expect(blob).not.toContain('726 664')
  })
})
