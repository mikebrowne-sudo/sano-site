// Cover page — locked to the brand design system.
//
// Layout asymmetry is INTENTIONAL and must be preserved:
//   • Logo + green tagline centered horizontally at the top
//   • Title + green rule + field stack stay LEFT aligned
// The slight visual offset between the centered top block and the
// left-aligned content below is per Cover page v1 reference.
//
// The cover image is the brand-locked "cleaned-by-sano.jpg". Do not
// substitute; if you need a different cover image, replace the file
// at public/images/cleaned-by-sano.jpg rather than pointing at a
// new path.

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

const COVER_IMAGE = '/images/cleaned-by-sano.jpg'
// Locked: full white Sano logo (with tagline baked into the artwork).
// File source: F:\Sano\10-Branding\Logos\Exports\White\sano-full-white.png
const LOGO_WHITE = '/brand/sano-full-white.png'

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

        {/* TOP — centered on the full page width.
            Sibling of __main so it isn't constrained by the 105mm
            left column the title sits in. The intentional offset
            between the centered top and the left-aligned title
            below is locked. */}
        <div className="proposal-cover__top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_WHITE} alt="Sano" className="proposal-cover__logo" />
          <div className="proposal-cover__tagline">{payload.coverTagline}</div>
        </div>

        {/* MAIN — left-aligned, capped to the dark left column */}
        <div className="proposal-cover__main">
          <h1 className="proposal-cover__title">{payload.coverTitle}</h1>
          <div className="proposal-cover__title-rule" aria-hidden />

          <dl className="proposal-cover__fields">
            <div className="proposal-cover__field">
              <dt>{payload.preparedForFieldLabel}</dt>
              <dd>{payload.preparedForLabel}</dd>
            </div>
            <div className="proposal-cover__field">
              <dt>{payload.siteAddressFieldLabel}</dt>
              <dd>{payload.siteAddress || '—'}</dd>
            </div>
            <div className="proposal-cover__field">
              <dt>{payload.dateFieldLabel}</dt>
              <dd>{payload.proposalDate}</dd>
            </div>
            <div className="proposal-cover__field">
              <dt>{payload.referenceFieldLabel}</dt>
              <dd>{payload.referenceNumber}</dd>
            </div>
          </dl>
        </div>
      </div>
    </ProposalLayout>
  )
}
