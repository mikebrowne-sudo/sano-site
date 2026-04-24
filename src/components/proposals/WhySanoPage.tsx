// Proposal Phase 4 — Why Sano differentiation page.
//
// Short, confident page that explains what buying Sano actually gets
// you, without slipping into marketing voice. Four compact points,
// each with a label + one-sentence body.
//
// Placement: between Executive Summary and Service Overview. Always
// rendered (no settings toggle). Page numbering flows through
// ProposalDocument.

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

interface WhySanoPoint {
  label: string
  body: string
}

const WHY_SANO_INTRO =
  'We focus on delivering a consistent, well-managed cleaning service rather than a one-off result.'

const WHY_SANO_POINTS: readonly WhySanoPoint[] = [
  {
    label: 'Consistent team',
    body: 'The same small team is assigned to your site, ensuring familiarity and accountability across every visit.',
  },
  {
    label: 'Structured delivery',
    body: 'Cleaning is carried out against a defined scope and checklist, so nothing is missed and standards do not drift over time.',
  },
  {
    label: 'Clear communication',
    body: 'You have a single point of contact, with straightforward communication and quick response when needed.',
  },
  {
    label: 'Reliable service',
    body: 'Scheduled service is maintained, with cover arranged where required to ensure continuity.',
  },
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
        <p className="proposal-why-intro">{WHY_SANO_INTRO}</p>

        <div className="proposal-why-grid">
          {WHY_SANO_POINTS.map((point) => (
            <div key={point.label} className="proposal-why-item">
              <div className="proposal-why-item__label">{point.label}</div>
              <p className="proposal-why-item__body">{point.body}</p>
            </div>
          ))}
        </div>
      </div>
    </ProposalLayout>
  )
}
