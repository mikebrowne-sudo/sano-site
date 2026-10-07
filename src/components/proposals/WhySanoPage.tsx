// Proposal Phase 4.1 / final polish — Why Sano page.
//
// Six short prose paragraphs followed by a bottom crew image. Tone
// is calm and confident; no marketing voice. "Sano crew" appears
// once, in the third paragraph, and nowhere else in the document.
//
// Image anchoring: the body is a flex column. Text sits at the top.
// The image wrapper is pushed to the bottom with margin-top: auto,
// which means it always hugs the footer line regardless of how
// much copy sits above. The image itself is a real <img> element
// (not a background-image) so Chrome + Puppeteer handle it
// natively in print — no risk of the print stylesheet dropping a
// background asset — and uses width:100% / height:auto /
// object-fit:contain so the full photo is visible, no aggressive
// crop. Wrapper margin: 6px L + 6px R (minimal side breathing
// room) + 6mm above the footer. No absolute positioning — the
// flex flow keeps the PDF identical to the preview.
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

// One-off equivalent. Every "over time" / "across every visit" /
// "assigned to your site" cue above assumes a standing relationship
// and is wrong on a single-visit job — it would contradict the
// Executive Summary and Pricing pages inside the same PDF. "Sano
// crew" still appears exactly once, in the same third paragraph.
const WHY_SANO_PARAGRAPHS_ONE_OFF: readonly string[] = [
  'Cleaning is not just about how a site looks on the day, but how thoroughly the work is done.',
  'At Sano, the focus is on delivering a well-managed clean that holds its standard across every area of the site.',
  'A small, experienced team from the Sano crew carries out the work, briefed on the site and its priority areas before they start.',
  'Work is carried out against a defined scope, ensuring tasks are completed as agreed and nothing is missed.',
  'Communication is simple and direct, with a single point of contact, allowing any adjustments to be handled quickly.',
  'The result is a clean that is thorough, well-managed, and done properly the first time.',
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
  const paragraphs = payload.siteContext.isOneOff
    ? WHY_SANO_PARAGRAPHS_ONE_OFF
    : WHY_SANO_PARAGRAPHS

  return (
    <ProposalLayout
      headerTitle="Why Sano"
      pageNumber={pageNumber}
      totalPages={totalPages}
      contact={payload.contact}
    >
      <div className="proposal-content proposal-content--why">
        <div className="proposal-why-copy">
          {paragraphs.map((para, i) => (
            <p
              key={i}
              className="proposal-why-paragraph"
              style={i === paragraphs.length - 1 ? { marginBottom: 0 } : undefined}
            >
              {para}
            </p>
          ))}
        </div>

        <div className="proposal-why-image-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CREW_IMAGE}
            alt="Sano crew"
            className="proposal-why-image"
          />
        </div>
      </div>
    </ProposalLayout>
  )
}
