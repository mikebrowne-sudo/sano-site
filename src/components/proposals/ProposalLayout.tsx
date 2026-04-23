// Proposal Phase 1 — page wrapper that standardises every proposal page.
//
// Fixed A4 dimensions on screen so preview matches print, with @page
// CSS so a real PDF render hits 210×297mm cleanly. The header is
// optional (cover page omits it); the footer is mandatory and pinned
// to the bottom of every page.

import type { ReactNode } from 'react'
import { ProposalHeader } from './ProposalHeader'
import { ProposalFooter } from './ProposalFooter'
import type { ProposalContact } from '@/lib/proposals/buildProposalPayload'

export interface ProposalLayoutProps {
  /** Hides the header (used by the cover page). */
  noHeader?: boolean
  /** Header section title — required when noHeader is false. */
  headerTitle?: string
  /** Page number shown in the footer. 1-based. */
  pageNumber: number
  /** Total page count shown in the footer. */
  totalPages: number
  /** Footer contact details. Falls back to Sano defaults in the footer. */
  contact?: ProposalContact
  /** Content area children. */
  children: ReactNode
}

export function ProposalLayout({
  noHeader,
  headerTitle,
  pageNumber,
  totalPages,
  contact,
  children,
}: ProposalLayoutProps) {
  return (
    <section
      className="proposal-page"
      data-page={pageNumber}
    >
      {!noHeader && <ProposalHeader title={headerTitle ?? ''} />}
      <div className="proposal-page__body">
        {children}
      </div>
      <ProposalFooter pageNumber={pageNumber} totalPages={totalPages} contact={contact} />
    </section>
  )
}
