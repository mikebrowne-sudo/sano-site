// Proposal Phase 3 — Acceptance page.
//
// Final page: standard acceptance wording + signature block. The
// wording is operator-editable via proposal settings
// (content.acceptance_wording). Signature fields render as underline
// lines so a printed copy can be signed and returned.
//
// Renders only when payload.sections.acceptance is true — gate is
// owned by ProposalDocument.

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

export function AcceptancePage({
  payload,
  pageNumber,
  totalPages,
}: {
  payload: ProposalTemplatePayload
  pageNumber: number
  totalPages: number
}) {
  const wording = payload.acceptanceWording?.trim()
    || 'By signing below, the client accepts the scope, pricing, and terms set out in this proposal.'

  return (
    <ProposalLayout
      headerTitle="Acceptance of proposal"
      pageNumber={pageNumber}
      totalPages={totalPages}
      contact={payload.contact}
    >
      <div className="proposal-content">
        <p className="proposal-acceptance-wording">{wording}</p>

        <div className="proposal-acceptance-grid">
          <div className="proposal-acceptance-field proposal-acceptance-field--wide">
            <div className="proposal-acceptance-field__label">Company name</div>
            <div className="proposal-acceptance-field__line" aria-hidden />
          </div>

          <div className="proposal-acceptance-field">
            <div className="proposal-acceptance-field__label">Authorised signatory — printed name</div>
            <div className="proposal-acceptance-field__line" aria-hidden />
          </div>

          <div className="proposal-acceptance-field">
            <div className="proposal-acceptance-field__label">Position / title</div>
            <div className="proposal-acceptance-field__line" aria-hidden />
          </div>

          <div className="proposal-acceptance-field">
            <div className="proposal-acceptance-field__label">Signature</div>
            <div className="proposal-acceptance-field__line" aria-hidden />
          </div>

          <div className="proposal-acceptance-field">
            <div className="proposal-acceptance-field__label">Date</div>
            <div className="proposal-acceptance-field__line" aria-hidden />
          </div>
        </div>

        <p className="proposal-acceptance-note">
          Please return a signed copy to{' '}
          {payload.contact?.email || 'hello@sano.nz'}
          {' '}— or reply to the email this proposal was sent from — and we will confirm the service start date in writing.
        </p>
      </div>
    </ProposalLayout>
  )
}
