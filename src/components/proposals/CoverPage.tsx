// Proposal Phase 1 — cover page.
//
// Full-bleed commercial interior background, dark left overlay panel
// holding the title block + dynamic fields, white Sano logo top-left.
// Footer is rendered by ProposalLayout so cover/inner pages share the
// same identical bottom strip.

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

const BG_IMAGE = '/images/sano-commercial-clean-auckland.jpeg'
const LOGO_WHITE = '/brand/sano-logo-white.png'

export function CoverPage({
  payload,
  pageNumber,
  totalPages,
}: {
  payload: ProposalTemplatePayload
  pageNumber: number
  totalPages: number
}) {
  return (
    <ProposalLayout noHeader pageNumber={pageNumber} totalPages={totalPages} contact={payload.contact}>
      <div className="proposal-cover">
        <div
          className="proposal-cover__bg"
          style={{ backgroundImage: `url(${BG_IMAGE})` }}
          aria-hidden
        />
        <div className="proposal-cover__panel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_WHITE} alt="Sano" className="proposal-cover__logo" />

          <div className="proposal-cover__top-meta">
            <span>Commercial cleaning proposal</span>
          </div>

          <h1 className="proposal-cover__title">
            Prepared for<br />
            {payload.clientName}
          </h1>

          <dl className="proposal-cover__fields">
            <div>
              <dt>Site</dt>
              <dd>{payload.siteAddress || '—'}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{payload.proposalDate}</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>{payload.referenceNumber}</dd>
            </div>
          </dl>

          <div className="proposal-cover__footer-block">
            Sano Property Services Limited
          </div>
        </div>
      </div>
    </ProposalLayout>
  )
}
