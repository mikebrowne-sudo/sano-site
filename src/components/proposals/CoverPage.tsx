// Cover page — locked to the brand design system.
//
// Full-bleed interior background image with dark overlay, structured
// left-aligned content stack: Sano logo top-left, green tagline,
// large title with green rule, labelled field stack (prepared for /
// site / date / reference).
//
// The cover image is the brand-locked "cleaned-by-sano.jpg". Do not
// substitute; if you need a different cover image, replace the file
// at public/images/cleaned-by-sano.jpg rather than pointing at a
// new path.

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

const COVER_IMAGE = '/images/cleaned-by-sano.jpg'
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
          style={{ backgroundImage: `url(${COVER_IMAGE})` }}
          aria-hidden
        />
        <div className="proposal-cover__overlay" aria-hidden />
        <div className="proposal-cover__inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_WHITE} alt="Sano" className="proposal-cover__logo" />
          <div className="proposal-cover__tagline">{payload.coverTagline}</div>
          <h1 className="proposal-cover__title">{payload.coverTitle}</h1>
          <div className="proposal-cover__title-rule" aria-hidden />

          <dl className="proposal-cover__fields">
            <div className="proposal-cover__field">
              <dt>Prepared for:</dt>
              <dd>{payload.preparedForLabel}</dd>
            </div>
            <div className="proposal-cover__field">
              <dt>Site address:</dt>
              <dd>{payload.siteAddress || '—'}</dd>
            </div>
            <div className="proposal-cover__field">
              <dt>Date:</dt>
              <dd>{payload.proposalDate}</dd>
            </div>
            <div className="proposal-cover__field">
              <dt>Reference:</dt>
              <dd>{payload.referenceNumber}</dd>
            </div>
          </dl>
        </div>
      </div>
    </ProposalLayout>
  )
}
