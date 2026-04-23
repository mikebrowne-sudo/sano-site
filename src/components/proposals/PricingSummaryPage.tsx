// Pricing Summary — centered bordered card, green hero amount with
// "+ GST" suffix, supporting note. Prominent but not oversized —
// the card width is capped and the typography aligns to the locked
// scale.
//
// Splits the payload's monthlyServiceFee into amount + "+GST" pair
// when it ends with "+GST per month" (the default output of the
// adapter). Falls back gracefully when the source string has a
// different shape.

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
  const { amount, suffix } = splitPrice(payload.monthlyServiceFee)

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
            <div className="proposal-pricing-card__amount">{amount}</div>
            {suffix && <div className="proposal-pricing-card__suffix">{suffix}</div>}
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
          {payload.pricingNote || 'Pricing reflects a consistent, well-managed service with trained staff and quality control processes in place.'}
        </p>
      </div>
    </ProposalLayout>
  )
}

// Pull a trailing "+GST …" off the fee string so the hero figure
// reads as just the dollar amount, with "+ GST" as a smaller suffix
// underneath.
function splitPrice(fee: string): { amount: string; suffix: string } {
  const trimmed = fee.trim()
  const gstMatch = trimmed.match(/^(.*?)\s*\+\s*GST\s*(.*)$/i)
  if (gstMatch) {
    const amount = gstMatch[1].trim()
    const trailing = gstMatch[2].trim()
    const suffix = trailing ? `+ GST · ${trailing}` : '+ GST'
    return { amount, suffix }
  }
  return { amount: trimmed, suffix: '' }
}
