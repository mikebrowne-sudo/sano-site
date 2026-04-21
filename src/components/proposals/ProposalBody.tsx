import type { ProposalViewModel } from '@/lib/proposals/types'
import { ProposalCover } from './ProposalCover'
import { ProposalIntroduction } from './ProposalIntroduction'
import { ProposalHowWeWork } from './ProposalHowWeWork'
import { ProposalScope } from './ProposalScope'
import { ProposalServiceOptions } from './ProposalServiceOptions'
import { ProposalPricingOptions } from './ProposalPricingOptions'
import { ProposalInclusions } from './ProposalInclusions'
import { ProposalAgreementSummary } from './ProposalAgreementSummary'
import { ProposalPaymentTerms } from './ProposalPaymentTerms'
import { ProposalTermsOverview } from './ProposalTermsOverview'
import { ProposalAcceptance } from './ProposalAcceptance'

type ProposalBodyProps = {
  proposal: ProposalViewModel
}

export function ProposalBody({ proposal }: ProposalBodyProps) {
  return (
    <>
      <ProposalCover client={proposal.client} proposalMeta={proposal.proposalMeta} />
      <ProposalIntroduction body={proposal.content.introduction} />
      <ProposalHowWeWork blocks={proposal.content.howWeWork} />
      {proposal.content.scopeGroups.length > 0 && (
        <ProposalScope groups={proposal.content.scopeGroups} />
      )}
      <ProposalServiceOptions options={proposal.content.serviceOptions} />
      <ProposalPricingOptions
        pricing={proposal.pricing}
        options={proposal.content.serviceOptions}
      />
      <ProposalInclusions
        included={proposal.content.includedItems}
        excluded={proposal.content.excludedItems}
      />
      <ProposalAgreementSummary
        proposalMeta={proposal.proposalMeta}
        pricing={proposal.pricing}
      />
      <ProposalPaymentTerms terms={proposal.content.paymentTerms} />
      <ProposalTermsOverview terms={proposal.content.termsOverview} />
      <ProposalAcceptance
        blurb={proposal.content.acceptanceBlurb}
        client={proposal.client}
      />
    </>
  )
}
