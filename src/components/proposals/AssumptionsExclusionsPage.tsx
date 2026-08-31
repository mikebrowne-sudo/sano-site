// Assumptions & Exclusions.
//
// These were captured on the quote and carried all the way into the proposal
// payload, but no page rendered them — so operator-written exclusions never
// reached the client. On a commercial tender that is the section defining the
// boundary of the job: what a kitchen exclusion or a "kegs and heavy items"
// limit means is the difference between a scope dispute and a signed variation.
// Leaving it implied by "only tasks listed are included" in the terms was not
// enough.
//
// Sits between Scope of Works and Pricing, so the reader sees what is included,
// then what is not, then the price — the boundaries land while the scope is
// still fresh and before value is judged.
//
// Renders only when there is something to show; a proposal with none of the
// three fields filled skips the page entirely rather than printing empty
// headings (see shouldRenderAssumptionsExclusions).

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

/** True when the page has any content worth a page of its own. */
export function shouldRenderAssumptionsExclusions(payload: ProposalTemplatePayload): boolean {
  return (
    payload.assumptions.length > 0 ||
    payload.exclusions.length > 0 ||
    payload.complianceNotes.trim().length > 0
  )
}

export function AssumptionsExclusionsPage({
  payload,
  pageNumber,
  totalPages,
}: {
  payload: ProposalTemplatePayload
  pageNumber: number
  totalPages: number
}) {
  const { assumptions, exclusions, complianceNotes } = payload
  const compliance = complianceNotes.trim()

  return (
    <ProposalLayout
      headerTitle="Assumptions &amp; exclusions"
      pageNumber={pageNumber}
      totalPages={totalPages}
      contact={payload.contact}
    >
      <div className="proposal-content">
        <p className="proposal-scope-intro">
          The following sets out what this proposal assumes, and what sits outside the
          agreed scope. Anything not listed in the scope of works is treated as a
          variation and quoted separately before it is carried out.
        </p>

        <div className="proposal-scope-stack">
          {assumptions.length > 0 && (
            <div className="proposal-scope-row">
              <div>
                <h3 className="proposal-scope-row__head">Assumptions</h3>
                <ul className="proposal-scope-row__list">
                  {assumptions.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {exclusions.length > 0 && (
            <div className="proposal-scope-row">
              <div>
                <h3 className="proposal-scope-row__head">Not included</h3>
                <ul className="proposal-scope-row__list">
                  {exclusions.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {compliance && (
            <div className="proposal-scope-row">
              <div>
                <h3 className="proposal-scope-row__head">Compliance</h3>
                <ul className="proposal-scope-row__list">
                  {compliance.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProposalLayout>
  )
}
