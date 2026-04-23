// Proposal Phase 1 — assembled document.
//
// Renders the full 6-page proposal in order, threading page-number /
// total-pages through each page. Stylesheet is co-located via a
// styled-jsx-style <style> tag injected once at the top of the doc;
// keeps the page wrappers self-contained for preview routes and any
// future PDF render path.

import { CoverPage } from './CoverPage'
import { ExecutiveSummaryPage } from './ExecutiveSummaryPage'
import { ServiceOverviewPage } from './ServiceOverviewPage'
import { ScopeOfWorksPage } from './ScopeOfWorksPage'
import { PricingSummaryPage } from './PricingSummaryPage'
import { TermsAndConditionsPage } from './TermsAndConditionsPage'
import { PROPOSAL_CSS } from './proposal-styles'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

export function ProposalDocument({ payload }: { payload: ProposalTemplatePayload }) {
  // Order is fixed and explicit so page numbering stays predictable.
  const pages = [
    'cover',
    'executive',
    'overview',
    'scope',
    'pricing',
    'terms',
  ] as const
  const total = pages.length

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PROPOSAL_CSS }} />
      <div className="proposal-document">
        <CoverPage              payload={payload} pageNumber={1} totalPages={total} />
        <ExecutiveSummaryPage   payload={payload} pageNumber={2} totalPages={total} />
        <ServiceOverviewPage    payload={payload} pageNumber={3} totalPages={total} />
        <ScopeOfWorksPage       payload={payload} pageNumber={4} totalPages={total} />
        <PricingSummaryPage     payload={payload} pageNumber={5} totalPages={total} />
        <TermsAndConditionsPage payload={payload} pageNumber={6} totalPages={total} />
      </div>
    </>
  )
}
