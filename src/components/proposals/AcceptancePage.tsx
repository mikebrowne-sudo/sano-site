// Proposal Phase 3.1 — Acceptance page.
//
// Final page: acceptance wording + validity reminder + signature
// block. Body wording is operator-editable via proposal settings
// (content.acceptance_wording) but falls back to the Phase 3.1
// default below. Signature fields render as underline lines so a
// printed copy can be signed and returned.
//
// Renders only when payload.sections.acceptance is true — gate is
// owned by ProposalDocument.

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

const DEFAULT_ACCEPTANCE_WORDING =
  'By accepting this proposal, the client agrees to the scope, pricing, and terms outlined in this document.'
const VALIDITY_WORDING =
  'This proposal remains valid until the stated validity date and is subject to the Terms & Conditions included.'

export function AcceptancePage({
  payload,
  pageNumber,
  totalPages,
}: {
  payload: ProposalTemplatePayload
  pageNumber: number
  totalPages: number
}) {
  const wording = payload.acceptanceWording?.trim() || DEFAULT_ACCEPTANCE_WORDING

  return (
    <ProposalLayout
      headerTitle="Acceptance of Proposal"
      pageNumber={pageNumber}
      totalPages={totalPages}
      contact={payload.contact}
    >
      <div className="proposal-content">
        <p className="proposal-acceptance-wording">{wording}</p>
        <p className="proposal-acceptance-wording">{VALIDITY_WORDING}</p>
        <p className="proposal-acceptance-wording proposal-acceptance-wording--close">
          We look forward to working with you.
        </p>

        <div className="proposal-acceptance-grid">
          <div className="proposal-acceptance-field">
            <div className="proposal-acceptance-field__label">Client Name</div>
            <div className="proposal-acceptance-field__line" aria-hidden />
          </div>

          <div className="proposal-acceptance-field">
            <div className="proposal-acceptance-field__label">Company</div>
            <div className="proposal-acceptance-field__line" aria-hidden />
          </div>

          <div className="proposal-acceptance-field">
            <div className="proposal-acceptance-field__label">Position</div>
            <div className="proposal-acceptance-field__line" aria-hidden />
          </div>

          <div className="proposal-acceptance-field">
            <div className="proposal-acceptance-field__label">Date</div>
            <div className="proposal-acceptance-field__line" aria-hidden />
          </div>

          <div className="proposal-acceptance-field proposal-acceptance-field--wide">
            <div className="proposal-acceptance-field__label">Signature</div>
            <div className="proposal-acceptance-field__line" aria-hidden />
          </div>
        </div>

        <p className="proposal-acceptance-note">
          Acceptance can be confirmed by signed copy or written confirmation via email.
        </p>
      </div>
    </ProposalLayout>
  )
}
