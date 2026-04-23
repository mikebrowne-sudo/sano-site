// Scope of Works — uses the shared ProposalIcon set from
// ServiceOverviewPage so both pages render with identical icon
// dimensions, line weight, and tile treatment. Section glyphs
// rotate through a small subset that maps to the typical commercial
// scope sections (entrances, offices, meeting rooms, kitchens,
// bathrooms / amenities).

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'
import { ProposalIcon, type ProposalIconName } from './ServiceOverviewPage'

const SCOPE_ICONS: ProposalIconName[] = ['doorway', 'clipboard', 'building', 'utensils', 'spray']

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
                <ProposalIcon name={SCOPE_ICONS[i % SCOPE_ICONS.length]} />
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
