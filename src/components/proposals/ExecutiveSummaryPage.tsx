// Executive Summary — green opener, headline paragraph + supporting
// text on the left, commercial-interior image on the right. Matches
// the approved mockup.

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

// Shared inner-page image (same environment rule). Update once in
// ProposalHeader.tsx if the asset changes.
const SIDE_IMAGE = '/images/sano-commercial-clean-auckland.jpeg'

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
      <div className="proposal-content">
        <div className="proposal-intro-grid">
          <div>
            <p className="proposal-eyebrow" style={{ color: 'var(--sano-green)', marginBottom: '4mm' }}>
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
            className="proposal-intro-image"
            style={{ backgroundImage: `url(${SIDE_IMAGE})` }}
            aria-hidden
          />
        </div>
      </div>
    </ProposalLayout>
  )
}
