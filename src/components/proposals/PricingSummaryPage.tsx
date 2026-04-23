// Pricing Summary — centered bordered card, green hero amount with
// the GST suffix below + monthly suffix as the smaller line, and a
// supporting note. Suffixes are settings-driven (Phase 2).
//
// Both suffixes come straight from settings via the payload, so an
// operator can change "+ GST" to "(GST included)" or "per month" to
// "per visit" without touching code.

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

export function PricingSummaryPage({
  payload,
  pageNumber,
  totalPages,
}: {
  payload: ProposalTemplatePayload
  pageNumber: number
  totalPages: number
}) {
  return (
    <ProposalLayout
      headerTitle="Pricing summary"
      pageNumber={pageNumber}
      totalPages={totalPages}
      contact={payload.contact}
    >
      <div className="proposal-content">
        <div className="proposal-pricing-wrap">
          <div className="proposal-pricing-card">
            <div className="proposal-pricing-card__label">Monthly service fee</div>
            <div className="proposal-pricing-card__amount">{payload.monthlyServiceFee}</div>
            {payload.gstSuffix && (
              <div className="proposal-pricing-card__suffix">
                {payload.gstSuffix}
                {payload.monthlyFeeSuffix ? ` · ${payload.monthlyFeeSuffix}` : ''}
              </div>
            )}
            <div className="proposal-pricing-card__note">
              Based on agreed scope and service frequency.
            </div>
          </div>
        </div>

        <div className="proposal-pricing-shield" aria-hidden>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" strokeLinejoin="round" />
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <p className="proposal-pricing-support">
          {payload.pricingNote}
        </p>
      </div>
    </ProposalLayout>
  )
}
