// Proposal Phase 1 — Scope of Works inner page.

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

export function ScopeOfWorksPage({
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
      headerTitle="Scope of works"
      pageNumber={pageNumber}
      totalPages={totalPages}
      contact={payload.contact}
    >
      <div className="proposal-content">
        <p className="proposal-eyebrow">What&apos;s included</p>
        <h2 className="proposal-h2">Cleaning scope, by frequency</h2>

        <div className="proposal-scope-stack">
          {payload.scopeSections.map((section, i) => (
            <section key={i} className="proposal-scope-section">
              <h3 className="proposal-scope-section__title">{section.title}</h3>
              <ul className="proposal-scope-section__list">
                {section.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </ProposalLayout>
  )
}
