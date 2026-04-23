// Scope of Works — green intro sentence, followed by each scope
// section. Each section has a small green icon tile, uppercase
// section title, and a tight bulleted list of tasks. Matches the
// approved mockup pattern exactly.

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
        <p className="proposal-scope-intro">
          The following services will be carried out by Sano Property Services at the agreed frequency.
        </p>

        <div className="proposal-scope-stack">
          {payload.scopeSections.map((section, i) => (
            <div key={i} className="proposal-scope-row">
              <span className="proposal-icon-tile" aria-hidden>
                <ScopeIcon index={i} />
              </span>
              <div>
                <h3 className="proposal-scope-row__head">{section.title}</h3>
                <ul className="proposal-scope-row__list">
                  {section.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ProposalLayout>
  )
}

// Rotating but consistent icon set. Same 4.5mm stroked mark inside
// the 10mm green-tinted tile across every section.
function ScopeIcon({ index }: { index: number }) {
  const icons = [
    // doorway
    <svg key="a" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5 21V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v16" /><path d="M3 21h18" strokeLinecap="round" /><circle cx="15" cy="13" r="1" /></svg>,
    // clipboard
    <svg key="b" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="5" width="12" height="16" rx="1.5" /><path d="M9 3h6v4H9z" /><path d="M9 11h6M9 14h6M9 17h4" strokeLinecap="round" /></svg>,
    // building
    <svg key="c" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 20V7l8-3 8 3v13" /><path d="M4 20h16" strokeLinecap="round" /><path d="M9 11h2M13 11h2M9 15h2M13 15h2" strokeLinecap="round" /></svg>,
    // check
    <svg key="d" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    // spray
    <svg key="e" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="10" width="8" height="11" rx="1" /><path d="M10 10V6h4v4" /><path d="M15 4h2M17 6h2M15 8h2" strokeLinecap="round" /></svg>,
  ]
  return icons[index % icons.length]
}
