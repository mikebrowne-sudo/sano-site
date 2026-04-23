// Proposal Phase 1 — reusable footer.
//
// Pinned to the absolute bottom of every page. Identical layout
// across cover and inner pages: contact triplet on the left, page
// number on the right.

import { SANO_PROPOSAL_CONTACT, type ProposalContact } from '@/lib/proposals/buildProposalPayload'

export function ProposalFooter({
  pageNumber,
  totalPages,
  contact = SANO_PROPOSAL_CONTACT,
}: {
  pageNumber: number
  totalPages: number
  contact?: ProposalContact
}) {
  return (
    <footer className="proposal-footer">
      <div className="proposal-footer__contact">
        <span>{contact.email}</span>
        <span className="proposal-footer__sep">·</span>
        <span>{contact.website}</span>
        <span className="proposal-footer__sep">·</span>
        <span>{contact.phone}</span>
      </div>
      <div className="proposal-footer__page">
        Page {pageNumber} of {totalPages}
      </div>
    </footer>
  )
}
