export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted'

export type ServiceLevel = 'essential' | 'standard' | 'premium'

export type HowWeWorkBlock = {
  title: string
  body: string
}

export type ScopeGroup = {
  title: string
  items: string[]
}

export type ServiceOption = {
  title: string
  description: string
}

export type ProposalClient = {
  companyName: string
  contactName: string | null
  siteName: string | null
  siteAddress: string
}

export type ProposalMeta = {
  proposalDate: string
  startDate: string | null
  termLabel: string | null
  frequencyLabel: string | null
  selectedServiceLevel: ServiceLevel | null
}

export type ProposalPricing = {
  essential: number | null
  standard: number | null
  premium: number | null
  recommendedOption: ServiceLevel | null
  monthlyCharge: number | null
  currency: 'NZD'
}

export type ProposalContent = {
  introduction: string
  howWeWork: HowWeWorkBlock[]
  scopeGroups: ScopeGroup[]
  serviceOptions: ServiceOption[]
  includedItems: string[]
  excludedItems: string[]
  paymentTerms: string[]
  termsOverview: string[]
  acceptanceBlurb: string
}

export type ProposalInternal = {
  notes: string | null
  exclusions: string[]
  assumptions: string[]
}

export type ProposalViewModel = {
  id: string
  quoteId: string
  status: ProposalStatus
  shareToken: string | null
  client: ProposalClient
  proposalMeta: ProposalMeta
  pricing: ProposalPricing
  content: ProposalContent
  internal: ProposalInternal
}
