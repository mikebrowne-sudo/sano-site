// Executive Summary — green opener, lead paragraph + supporting line
// on the left, full-height commercial-interior image on the right.
// Right-column image runs from just under the header to the footer
// line, matching the cover-page proportion / treatment.

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

// Locked side image for this page only. Drop the file into
// public/images/ — keep the path stable.
const SIDE_IMAGE = '/images/executive-summary.jpg'

export function ExecutiveSummaryPage({
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
      headerTitle="Executive summary"
      pageNumber={pageNumber}
      totalPages={totalPages}
      contact={payload.contact}
    >
      <div className="proposal-content proposal-content--exec">
        <div className="proposal-exec-grid">
          <div className="proposal-exec-grid__copy">
            <p className="proposal-exec-opener">
              Thank you for the opportunity to work with {payload.clientName}.
            </p>
            <p className="proposal-lead">
              {payload.executiveSummary}
            </p>
            <p className="proposal-lead" style={{ marginTop: '5mm', marginBottom: 0 }}>
              The following outlines the proposed service structure, scope, and pricing.
            </p>
          </div>
          <div
            className="proposal-exec-grid__image"
            style={{ backgroundImage: `url(${SIDE_IMAGE})` }}
            aria-hidden
          />
        </div>
      </div>
    </ProposalLayout>
  )
}
