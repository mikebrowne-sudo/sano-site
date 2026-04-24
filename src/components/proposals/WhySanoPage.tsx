// Proposal Phase 4.1 — Why Sano page (final content lock).
//
// Six short prose paragraphs, not bullets. Tone is calm and
// confident; no marketing voice. "Sano crew" appears once, in the
// third paragraph, and nowhere else in the document.
//
// Placement: between Executive Summary and Service Overview. Always
// rendered; ProposalDocument manages page numbering.

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

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
      <div className="proposal-content">
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
    </ProposalLayout>
  )
}
