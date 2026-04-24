// Proposal Phase 4.1 / final polish — Why Sano page.
//
// Six short prose paragraphs followed by a bottom crew image. Tone
// is calm and confident; no marketing voice. "Sano crew" appears
// once, in the third paragraph, and nowhere else in the document.
//
// The image is rendered as a real <img> element (not a
// background-image) so Chrome + Puppeteer handle the photo
// natively — reliable in print, no risk of the print stylesheet
// dropping a background asset. Fixed height + object-fit: cover +
// top-biased object-position crop is used so faces aren't clipped
// at the bottom edge. Margin 6mm on all sides frames the image as
// a supporting element rather than a dominant panel.
//
// Placement: between Executive Summary and Service Overview. Always
// rendered; ProposalDocument manages page numbering.

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

const CREW_IMAGE = '/images/Sano-crew-auckland.jpeg'

const WHY_SANO_PARAGRAPHS: readonly string[] = [
  'Cleaning is not just about how a site looks on the day, but how consistently it is maintained over time.',
  'At Sano, the focus is on delivering a well-managed, reliable service that holds its standard across every visit.',
  'A consistent, small team from the Sano crew is assigned to your site, allowing them to become familiar with the layout, expectations, and areas that require the most attention.',
  'Work is carried out against a defined scope, ensuring tasks are completed as agreed and standards are maintained over time.',
  'Communication is simple and direct, with a single point of contact for day-to-day matters, allowing any adjustments to be handled quickly.',
  'The result is a service that is consistent, well-managed, and reliable over time.',
]

export function WhySanoPage({
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
      headerTitle="Why Sano"
      pageNumber={pageNumber}
      totalPages={totalPages}
      contact={payload.contact}
    >
      <div className="proposal-content proposal-content--why">
        <div className="proposal-why-copy">
          {WHY_SANO_PARAGRAPHS.map((para, i) => (
            <p
              key={i}
              className="proposal-why-paragraph"
              style={i === WHY_SANO_PARAGRAPHS.length - 1 ? { marginBottom: 0 } : undefined}
            >
              {para}
            </p>
          ))}
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CREW_IMAGE}
          alt="Sano crew"
          className="proposal-why-image"
        />
      </div>
    </ProposalLayout>
  )
}
