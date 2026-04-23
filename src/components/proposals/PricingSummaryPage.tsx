// Proposal Phase 1 — Pricing Summary inner page.
//
// Per brief: the monthly fee box stays prominent but refined — small
// enough that it doesn't dominate, large enough that the eye lands
// on it first. Single hero figure, single supporting note.

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
      headerTitle="Pricing"
      pageNumber={pageNumber}
      totalPages={totalPages}
      contact={payload.contact}
    >
      <div className="proposal-content">
        <p className="proposal-eyebrow">Investment</p>
        <h2 className="proposal-h2">Monthly service fee</h2>

        <div className="proposal-pricing-card">
          <div className="proposal-pricing-card__label">{payload.clientName}</div>
          <div className="proposal-pricing-card__amount">{payload.monthlyServiceFee}</div>
          <div className="proposal-pricing-card__note">{payload.pricingNote}</div>
        </div>

        <div className="proposal-pricing-context">
          <h3 className="proposal-h3">What&apos;s included</h3>
          <ul className="proposal-checklist proposal-checklist--compact">
            <li>{payload.serviceFrequency} during {payload.serviceTimes || 'agreed service hours'}</li>
            <li>All consumables and equipment supplied by Sano</li>
            <li>Site supervision and scheduled inspections</li>
            <li>Single point of contact for any service issue</li>
          </ul>
        </div>
      </div>
    </ProposalLayout>
  )
}
