// Reusable footer — FIXED COMPONENT.
// Identical on every page. 1 px #E5E5E5 divider above.

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
        <span className="proposal-footer__item">
          <svg className="proposal-footer__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
          {contact.email}
        </span>
        <span className="proposal-footer__item">
          <svg className="proposal-footer__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15 15 0 0 1 0 20" />
            <path d="M12 2a15 15 0 0 0 0 20" />
          </svg>
          {contact.website}
        </span>
        <span className="proposal-footer__item">
          <svg className="proposal-footer__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.35 1.9.65 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.3 1.85.52 2.81.65A2 2 0 0 1 22 16.92z" />
          </svg>
          {contact.phone}
        </span>
      </div>
      <div className="proposal-footer__page">
        Page {pageNumber} of {totalPages}
      </div>
    </footer>
  )
}
