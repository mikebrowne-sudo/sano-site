// Terms & Conditions — compact 2-column layout designed to fit on a
// single A4 proposal page wherever reasonably possible.
//
// Strategy:
//   • Same shared header + footer as every other page.
//   • Body uses .proposal-prose--terms — CSS multi-column layout
//     (columns: 2) with column-fill: balance, so content flows
//     top-to-bottom-then-next-column without manually splitting
//     sections.
//   • break-inside: avoid-column on each h3, p, and ul prevents a
//     heading from being orphaned at the bottom of column 1.
//   • Body 8.5pt / line-height 1.45, h3 9pt — tight but readable.
//
// Honest limitation: single-page fit depends on font rendering,
// which can vary slightly across browsers and the headless-Chromium
// PDF pipeline. With the locked 19-section approved content, the
// layout has comfortable headroom on Chrome's screen render. If a
// future content addition tips it over, the --terms-shrink CSS
// variable in proposal-styles.ts can shave a fraction of a point
// without touching markup.

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
      <div className="proposal-content proposal-content--terms">
        <div
          className="proposal-prose proposal-prose--terms"
          dangerouslySetInnerHTML={{ __html: payload.termsAndConditionsHtml }}
        />
      </div>
    </ProposalLayout>
  )
}
