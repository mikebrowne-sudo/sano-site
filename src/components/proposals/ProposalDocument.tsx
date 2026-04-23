// Proposal Phase 1 — assembled document.
//
// Renders the proposal pages in order, threading page-number /
// total-pages through each. Section visibility comes from the
// payload (settings-driven): executive summary and terms can be
// hidden via the proposal-settings admin UI. Cover, service
// overview, scope of works, and pricing summary are always shown.
//
// Page numbering recalculates from the actually-rendered pages so
// "Page X of N" stays accurate when sections are toggled off.

import { CoverPage } from './CoverPage'
import { ExecutiveSummaryPage } from './ExecutiveSummaryPage'
import { ServiceOverviewPage } from './ServiceOverviewPage'
import { ScopeOfWorksPage } from './ScopeOfWorksPage'
import { PricingSummaryPage } from './PricingSummaryPage'
import { TermsAndConditionsPage } from './TermsAndConditionsPage'
import { PROPOSAL_CSS } from './proposal-styles'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

export function ProposalDocument({ payload }: { payload: ProposalTemplatePayload }) {
  // Build the active page list from section toggles (cover, service
  // overview, scope, pricing are always rendered; exec summary +
  // terms are togglable). Acceptance is reserved for a future page
  // and skipped here even when the toggle is on.
  type PageKey = 'cover' | 'executive' | 'overview' | 'scope' | 'pricing' | 'terms'
  const active: PageKey[] = ['cover']
  if (payload.sections.executiveSummary) active.push('executive')
  active.push('overview', 'scope', 'pricing')
  if (payload.sections.terms) active.push('terms')

  const total = active.length
  const pageNum = (key: PageKey) => active.indexOf(key) + 1

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PROPOSAL_CSS }} />
      <div className="proposal-document">
        <CoverPage             payload={payload} pageNumber={pageNum('cover')}     totalPages={total} />
        {payload.sections.executiveSummary && (
          <ExecutiveSummaryPage payload={payload} pageNumber={pageNum('executive')} totalPages={total} />
        )}
        <ServiceOverviewPage   payload={payload} pageNumber={pageNum('overview')}  totalPages={total} />
        <ScopeOfWorksPage      payload={payload} pageNumber={pageNum('scope')}     totalPages={total} />
        <PricingSummaryPage    payload={payload} pageNumber={pageNum('pricing')}   totalPages={total} />
        {payload.sections.terms && (
          <TermsAndConditionsPage payload={payload} pageNumber={pageNum('terms')} totalPages={total} />
        )}
      </div>
    </>
  )
}
