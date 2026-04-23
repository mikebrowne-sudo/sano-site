// Terms & Conditions — styled prose container.
//
// Terms content is supplied as trusted HTML (built upstream by
// buildProposalPayload's adapter or by a fixture we control). Typography
// aligns to the locked scale: 10pt body, 10pt uppercase h3 section
// labels with green eyebrow treatment.
//
// LIMITATION: single-page layout only. If the supplied HTML overflows
// one A4 page it will visually clip in print. Multi-page pagination
// is deferred — a measured-render pre-pass is required to do it
// correctly.

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

export function TermsAndConditionsPage({
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
      headerTitle="Terms & conditions"
      pageNumber={pageNumber}
      totalPages={totalPages}
      contact={payload.contact}
    >
      <div className="proposal-content">
        <div
          className="proposal-prose"
          dangerouslySetInnerHTML={{ __html: payload.termsAndConditionsHtml }}
        />
      </div>
    </ProposalLayout>
  )
}
