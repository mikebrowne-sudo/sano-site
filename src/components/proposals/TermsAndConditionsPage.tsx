// Proposal Phase 1 — Terms & Conditions inner page.
//
// Renders the supplied HTML inside a .proposal-prose container that
// styles h3 / p / ul predictably. The HTML is treated as trusted
// (built upstream by buildProposalPayload's adapter, which escapes
// from raw DB strings, or by static fixtures we control).
//
// LIMITATION: this phase does not paginate long terms across multiple
// pages. If termsAndConditionsHtml overflows a single A4 page it will
// visually clip in print preview. Real multi-page pagination needs
// either CSS print-scoped column-fill behaviour or a measured-render
// pre-pass — out of scope for Phase 1.

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
        <p className="proposal-eyebrow">Terms</p>
        <h2 className="proposal-h2">Terms &amp; conditions</h2>

        <div
          className="proposal-prose"
          dangerouslySetInnerHTML={{ __html: payload.termsAndConditionsHtml }}
        />
      </div>
    </ProposalLayout>
  )
}
