// Proposal final polish — Acceptance page.
//
// Clean, confident close to the proposal rather than a legal form.
// Four short paragraphs sit in the upper block, a spacious signature
// grid sits in the middle, and the short confirmation note is
// anchored to the bottom of the page body via flex (margin-top:
// auto). Body wording for the agreement paragraph is operator-
// editable via proposal settings (content.acceptance_wording);
// everything else is fixed copy.
//
// Renders only when payload.sections.acceptance is true — gate is
// owned by ProposalDocument.

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

const DEFAULT_AGREEMENT_WORDING =
  'By accepting this proposal, the client agrees to the scope, pricing, and terms outlined in this document.'
const INTRO_WORDING =
  'Thank you for considering Sano for your commercial cleaning services.'
const VALIDITY_WORDING =
  'This proposal remains valid until the stated validity date and is subject to the Terms & Conditions included.'
const CLOSE_WORDING =
  'We look forward to working with you.'
const CONFIRMATION_NOTE =
  'Acceptance can be confirmed by signed copy or written confirmation via email.'

export function AcceptancePage({
  payload,
  pageNumber,
  totalPages,
}: {
  payload: ProposalTemplatePayload
  pageNumber: number
  totalPages: number
}) {
  const agreementWording = payload.acceptanceWording?.trim() || DEFAULT_AGREEMENT_WORDING

  return (
    <ProposalLayout
      headerTitle="Acceptance of Proposal"
      pageNumber={pageNumber}
      totalPages={totalPages}
      contact={payload.contact}
    >
      <div className="proposal-content proposal-content--acceptance">
        <div className="proposal-acceptance-copy">
          <p className="proposal-acceptance-intro">{INTRO_WORDING}</p>
          <p className="proposal-acceptance-wording">{agreementWording}</p>
          <p className="proposal-acceptance-wording">{VALIDITY_WORDING}</p>
          <p className="proposal-acceptance-wording proposal-acceptance-wording--close">
            {CLOSE_WORDING}
          </p>
        </div>

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

        <p className="proposal-acceptance-note">{CONFIRMATION_NOTE}</p>
      </div>
    </ProposalLayout>
  )
}
