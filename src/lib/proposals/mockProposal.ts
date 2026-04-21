import type { ProposalViewModel } from './types'
import {
  proposalAcceptanceBlurb,
  proposalExcludedItems,
  proposalHowWeWork,
  proposalIncludedItems,
  proposalIntroduction,
  proposalPaymentTerms,
  proposalServiceOptions,
  proposalTermsOverview,
} from './content'

export const mockProposal: ProposalViewModel = {
  id: 'prop_mock_0001',
  quoteId: 'quote_mock_0001',
  status: 'draft',
  shareToken: 'mock-share-token-abc123',
  client: {
    companyName: 'Harbourline Property Group',
    contactName: 'Rachel Okoye',
    siteName: 'Harbourline Tower — Level 4 & 5',
    siteAddress: '28 Customs Street West, Auckland Central, 1010',
  },
  proposalMeta: {
    proposalDate: '2026-04-20',
    startDate: '2026-05-05',
    termLabel: '12-month initial term, rolling monthly thereafter',
    frequencyLabel: '5 nights per week, Sunday to Thursday evenings',
    selectedServiceLevel: 'standard',
  },
  pricing: {
    essential: 3280,
    standard: 4150,
    premium: 5120,
    recommendedOption: 'standard',
    monthlyCharge: 4150,
    currency: 'NZD',
  },
  content: {
    introduction: proposalIntroduction,
    howWeWork: proposalHowWeWork,
    scopeGroups: [
      {
        title: 'Reception, lift lobbies and common areas',
        items: [
          'Vacuum carpeted areas and spot-treat marks',
          'Mop hard floors with colour-coded equipment',
          'Detail reception desk, signage, and lift call panels',
          'Clean internal glass, entry doors, and visible ledges',
          'Empty bins, replace liners, and wipe bin surrounds',
        ],
      },
      {
        title: 'Office floors (Level 4 & 5)',
        items: [
          'Vacuum all carpeted walkways and workstations',
          'Wipe desks on a clear-desk basis and detail shared surfaces',
          'Clean meeting rooms, whiteboards, and AV equipment exteriors',
          'Sanitise touchpoints — door handles, light switches, shared keyboards',
          'Tidy breakout zones and refill supplied consumables',
        ],
      },
      {
        title: 'Kitchens and breakout zones',
        items: [
          'Wipe benchtops, splashbacks, and cabinet fronts',
          'Clean sinks, taps, and surrounding surfaces',
          'Detail appliances externally (fridge, microwave, coffee machine)',
          'Empty dishwashers and stack or run as agreed',
          'Remove rubbish and recycling to site bin store',
        ],
      },
      {
        title: 'Bathrooms and end-of-trip',
        items: [
          'Sanitise basins, taps, toilets, and urinals',
          'Mop floors and detail skirtings',
          'Clean mirrors, partitions, and dispenser fronts',
          'Restock consumables supplied by the site',
          'Spot-treat tile grout and shower screens in end-of-trip areas',
        ],
      },
    ],
    serviceOptions: proposalServiceOptions,
    includedItems: proposalIncludedItems,
    excludedItems: proposalExcludedItems,
    paymentTerms: proposalPaymentTerms,
    termsOverview: proposalTermsOverview,
    acceptanceBlurb: proposalAcceptanceBlurb,
  },
  internal: {
    notes:
      'Rachel has flagged Level 5 has a sensitive client-facing boardroom — quality checks on Mondays are important. Building access after 6pm via rear goods lift only.',
    exclusions: [
      'External windows above Level 1 (abseil contractor, annual)',
      'Carpet extraction (quoted separately, twice yearly)',
      'Archive room on Level 4 — accessed by tenant only',
    ],
    assumptions: [
      'Bin room access and rubbish removal handled by building management',
      'Consumables (paper, soap, hand towel) stocked by tenant',
      'Power and water available during service windows',
      'One set of keys/fobs issued per cleaning team member',
    ],
  },
}
