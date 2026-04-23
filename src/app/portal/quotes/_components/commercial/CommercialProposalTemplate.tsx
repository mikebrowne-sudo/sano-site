// Commercial proposal template — server component.
//
// Rendered by /portal/quotes/[id]/proposal for commercial quotes.
// Takes a single ProposalPayload prop built by buildProposalPayload()
// in src/lib/commercialProposalMapping.ts. Environment-agnostic so a
// future public share route can reuse it without changes.
//
// All data on this template comes from the payload — the helpers
// (buildExecutiveSummary, buildSiteProfile, buildServiceSchedule,
// groupScopeForProposal, splitToBullets, buildPricingSummary) are
// called once at the route level. The contract is documented in
// docs/commercial-proposals/field-map.md.

import { nzd } from '@/lib/commercialProposalMapping'
import type {
  ProposalAddon,
  ProposalClient,
  ProposalPayload,
  ProposalQuote,
} from '@/lib/commercialProposalMapping'

// Re-export so existing consumers can keep importing these types from
// the template's path. Single source of truth lives in
// commercialProposalMapping.ts.
export type { ProposalAddon, ProposalClient, ProposalPayload, ProposalQuote }

export interface CommercialProposalTemplateProps {
  payload: ProposalPayload
}

export function CommercialProposalTemplate({ payload }: CommercialProposalTemplateProps) {
  const { meta, sano, client, executive_summary, site_profile, service_schedule,
    scope_groups, assumptions, exclusions, pricing } = payload
  const optionalParagraphs = payload.optional_paragraphs ?? []
  // Phase 5B — content paragraphs and structured terms.
  const siteUnderstanding = payload.site_understanding ?? ''
  const servicePlan       = payload.service_plan ?? ''
  const pricingSupport    = payload.pricing_support ?? ''
  const commercialTerms   = payload.commercial_terms
  const nextStepsText     = payload.next_steps_text

  // Cover-title fallback: when the aggregator couldn't resolve a real
  // client name (returns the 'Client' sentinel), fall back to the
  // sector-derived label. Preserves the pre-payload behaviour.
  const coverTitle = client.company_name && client.company_name !== 'Client'
    ? client.company_name
    : `${site_profile.sector} site`

  const isAccepted = meta.status === 'accepted' && !!meta.accepted_at

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PROPOSAL_CSS }} />
      <div className="proposal-page proposal-page--cover">

        {/* 1. Hero (Phase 5C) — full-width premium tender header.
             Office image + dark overlay concentrated on the left,
             white logo, stacked title, sage accent line, left-aligned
             metadata. Replaces the previous cover-grid block. */}
        <header className="proposal-hero">
          <div className="proposal-hero-bg" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/sano-commercial-clean-auckland.jpeg" alt="" />
          </div>
          <div className="proposal-hero-overlay" aria-hidden="true"></div>
          <div className="proposal-hero-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="proposal-hero-logo" src="/brand/sano-logo-white.png" alt={sano.trading_as} />
            <div className="proposal-hero-eyebrow">Commercial Cleaning Proposal</div>
            <h1 className="proposal-hero-title">
              <span>Commercial</span>
              <span>Cleaning</span>
              <span>Proposal</span>
            </h1>
            <div className="proposal-hero-accent" aria-hidden="true"></div>
            <dl className="proposal-hero-meta">
              <dt>Prepared for</dt>
              <dd>{coverTitle}</dd>
              {site_profile.service_address && (
                <>
                  <dt>Site</dt>
                  <dd>{site_profile.service_address}</dd>
                </>
              )}
              <dt>Date issued</dt>
              <dd>{meta.issued}</dd>
              <dt>Reference</dt>
              <dd>{meta.reference}</dd>
              <dt>Valid until</dt>
              <dd>{meta.valid_until}</dd>
              {isAccepted && (
                <>
                  <dt>Accepted</dt>
                  <dd>{meta.accepted_at}</dd>
                </>
              )}
            </dl>
          </div>
        </header>

        {/* Cover-page body — Parties + Executive summary live here so
             they pick up the same horizontal padding the rest of the
             document uses. */}
        <div className="proposal-cover-body">

        {/* Parties */}
        <section className="proposal-parties">
          <div>
            <div className="proposal-sub-label">Prepared by</div>
            <div className="proposal-party-name">{sano.company_name}</div>
            <div className="proposal-party-line">{sano.email}</div>
            <div className="proposal-party-line">{sano.mobile_phone}</div>
            <div className="proposal-party-line">GST {sano.gst_number}</div>
          </div>
          <div>
            <div className="proposal-sub-label">Prepared for</div>
            <div className="proposal-party-name">{client.contact_name ?? '—'}</div>
            {/* Suppress the company line when it would duplicate the contact name
                (the aggregator falls back company_name → name → 'Client', so a
                missing raw company_name surfaces as the contact name here). */}
            {client.company_name
              && client.company_name !== 'Client'
              && client.company_name !== client.contact_name && (
              <div className="proposal-party-line">{client.company_name}</div>
            )}
            {site_profile.service_address && <div className="proposal-party-line">{site_profile.service_address}</div>}
            {client.phone && <div className="proposal-party-line">{client.phone}</div>}
            {client.email && <div className="proposal-party-line">{client.email}</div>}
          </div>
        </section>

        {/* 2. Executive Summary */}
        <Section title="Executive Summary">
          <p className="proposal-prose">{executive_summary}</p>
        </Section>

        </div>{/* /.proposal-cover-body */}

        {/* 3. Site / Project Details */}
        <Section title="Site &amp; Project Details">
          {/* Phase 5B — Site understanding paragraph (only when populated) */}
          {siteUnderstanding && (
            <p className="proposal-prose proposal-section-lead">{siteUnderstanding}</p>
          )}
          <dl className="proposal-kv">
            <KV label="Sector"        value={site_profile.sector} />
            <KV label="Building type" value={site_profile.building_type} />
            <KV label="Address"       value={site_profile.service_address ?? ''} />
            <KV label="Total area"    value={site_profile.total_area} />
            <KV label="Floors"        value={site_profile.floors} />
            <KV label="Occupancy"     value={site_profile.occupancy} />
            <KV label="Traffic"       value={site_profile.traffic} />
          </dl>
          {site_profile.fixtures_summary && (
            <div className="proposal-callout">
              <div className="proposal-sub-label">Fixtures &amp; spaces</div>
              <div>{site_profile.fixtures_summary}</div>
            </div>
          )}
        </Section>

        {/* 4. Scope of Works */}
        <Section title="Scope of Works">
          {scope_groups.length === 0 ? (
            <p className="proposal-prose proposal-muted">
              Scope will be confirmed with the client and incorporated prior to mobilisation.
            </p>
          ) : (
            <div className="proposal-scope">
              {scope_groups.map((g) => (
                <div key={g.key} className="proposal-scope-group">
                  <h3 className="proposal-scope-title">{g.label}</h3>
                  {g.paragraph && (
                    <p className="proposal-prose proposal-scope-paragraph">{g.paragraph}</p>
                  )}
                  <ul className="proposal-scope-list">
                    {g.tasks.map((t) => (
                      <li key={t.id}>
                        <span className="proposal-task-name">{t.task_name}</span>
                        <span className="proposal-task-freq">{t.frequency_label}</span>
                        {t.area_type && (
                          <span className="proposal-task-area"> · {t.area_type}</span>
                        )}
                        {t.notes && (
                          <div className="proposal-task-note">{t.notes}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 4b. Optional paragraphs (Phase 4B) — consumables, security, etc.
              Rendered only when one or more are triggered by quote-level
              details. Sits between Scope and Service Schedule so service
              notes read alongside the scope content they contextualise. */}
        {optionalParagraphs.length > 0 && (
          <Section title="Service notes">
            {optionalParagraphs.map((p) => (
              <div key={p.key} className="proposal-optional-paragraph">
                <h3 className="proposal-optional-heading">{p.heading}</h3>
                <p className="proposal-prose">{p.text}</p>
              </div>
            ))}
          </Section>
        )}

        {/* 5. Service Schedule */}
        <Section title="Service Schedule">
          {/* Phase 5B — Service plan paragraph (only when populated) */}
          {servicePlan && (
            <p className="proposal-prose proposal-section-lead">{servicePlan}</p>
          )}
          <dl className="proposal-kv">
            <KV label="Service days"   value={service_schedule.service_days} />
            <KV label="Service window" value={service_schedule.service_window} />
            <KV label="Consumables"    value={service_schedule.consumables} />
          </dl>
          {service_schedule.access_requirements && (
            <div className="proposal-callout">
              <div className="proposal-sub-label">Access requirements</div>
              <div>{service_schedule.access_requirements}</div>
            </div>
          )}
          {!service_schedule.service_days && !service_schedule.service_window && !service_schedule.consumables && (
            <p className="proposal-prose proposal-muted">
              Service schedule to be confirmed with the client.
            </p>
          )}
        </Section>

        {/* 6. Pricing Summary */}
        <Section title="Pricing Summary">
          {/* Phase 5B — pricing support text. Always present from
              buildPricingSupport, so no nullish guard needed; falls
              back to a neutral line for older payloads. */}
          {pricingSupport && (
            <p className="proposal-prose proposal-section-lead">{pricingSupport}</p>
          )}

          {/* Phase 5C — Headline monthly figure. The grand total
              (incl. GST) is what lands on the recurring invoice, so
              that's what we lead with. The breakdown table beneath
              shows how it composes. No internal pricing logic exposed. */}
          {pricing.total_inc_gst > 0 && (
            <div className="pricing-headline">
              <div className="pricing-headline-label">Monthly service fee</div>
              <div className="pricing-headline-value">{nzd(pricing.total_inc_gst)}</div>
              <div className="pricing-headline-sub">
                {pricing.gst_included ? 'incl. GST' : 'incl. GST at 15%'}
                {pricing.annualised_inc_gst > 0 && (
                  <> · {nzd(pricing.annualised_inc_gst)} indicative annual value</>
                )}
              </div>
            </div>
          )}

          <table className="proposal-pricing">
            <tbody>
              {pricing.base_amount > 0 && (
                <tr>
                  <td>{pricing.base_label}</td>
                  <td className="proposal-amount">{nzd(pricing.base_amount)}</td>
                </tr>
              )}
              {pricing.addons.map((a, i) => (
                <tr key={i}>
                  <td>{a.label}</td>
                  <td className="proposal-amount">{nzd(a.amount)}</td>
                </tr>
              ))}
              {pricing.discount > 0 && (
                <tr>
                  <td>Discount</td>
                  <td className="proposal-amount">−{nzd(pricing.discount)}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="proposal-totals">
            <div><span>Subtotal (excl. GST)</span><span>{nzd(pricing.subtotal_ex_gst)}</span></div>
            <div><span>GST (15%)</span><span>{nzd(pricing.gst_amount)}</span></div>
            <div className="proposal-totals-headline">
              <span>Total (incl. GST)</span>
              <span>{nzd(pricing.total_inc_gst)}</span>
            </div>
            <div className="proposal-totals-annual">
              Indicative annual value: <strong>{nzd(pricing.annualised_inc_gst)}</strong>
            </div>
          </div>
          <p className="proposal-prose proposal-muted proposal-pricing-note">{pricing.gst_note}</p>
        </Section>

        {/* 7. Assumptions */}
        {assumptions.length > 0 && (
          <Section title="Assumptions">
            <BulletsOrPara items={assumptions} />
          </Section>
        )}

        {/* 8. Exclusions */}
        {exclusions.length > 0 && (
          <Section title="Exclusions">
            <BulletsOrPara items={exclusions} />
          </Section>
        )}

        {/* 8b. Commercial Terms (Phase 5B + 5C card) — short, practical
              engagement terms. Wrapped in a subtle sage-tinted card so
              it reads as a distinct commercial / contractual block,
              visually separated from the bullet sections above. */}
        {commercialTerms && (commercialTerms.rows.length > 0 || commercialTerms.closing) && (
          <Section title="Commercial Terms" variant="card">
            {commercialTerms.rows.length > 0 && (
              <dl className="proposal-kv">
                {commercialTerms.rows.map((r) => (
                  <KV key={r.label} label={r.label} value={r.value} />
                ))}
              </dl>
            )}
            {commercialTerms.closing && (
              <p className="proposal-prose proposal-muted proposal-terms-closing">
                {commercialTerms.closing}
              </p>
            )}
          </Section>
        )}

        {/* 9. Why Sano — hardcoded prose for now; payload.why_sano carries
              the bulleted variant used by the static HTML / PDF template.
              See docs/commercial-proposals/field-map.md. */}
        <Section title="Why Sano">
          <p className="proposal-prose">
            Sano delivers commercial cleaning with a detail-led, accountable approach.
            Every programme runs from a structured scope of work — crews follow it, supervisors
            verify it, and our reporting confirms it — so what we commit to is what gets delivered,
            every visit.
          </p>
          <p className="proposal-prose">
            Our staff are trained, insured, and consistent: the same faces on your site, who know
            your access, standards, and expectations. We respond quickly when things need
            attention, and adjust the programme as your business changes. Long-term reliability is
            how we measure ourselves.
          </p>
        </Section>

        {/* 10. Next Steps — Phase 5B: prefer the data-driven copy from
              buildNextStepsText when present (it knows about start
              date / contract term). Falls back to the hardcoded
              status-aware line for older payloads. Phase 5C card
              treatment so it reads as the close of the document. */}
        <Section title="Next Steps" variant="card">
          <p className="proposal-prose">
            {nextStepsText
              ? nextStepsText
              : isAccepted
                ? `This proposal was accepted on ${meta.accepted_at}. We look forward to mobilising and delivering a strong ongoing programme.`
                : `If you would like to proceed, please confirm acceptance. A member of the Sano team will be in touch within one business day to schedule mobilisation.`}
          </p>
          <p className="proposal-prose proposal-muted">
            By accepting this proposal you agree to our{' '}
            <a href="/share/service-agreement" target="_blank" rel="noopener noreferrer" className="proposal-link">Service Agreement</a>.
          </p>
        </Section>

        <footer className="proposal-footer">
          {sano.company_name} · {sano.email} · {sano.mobile_phone} · GST {sano.gst_number}
        </footer>
      </div>
    </>
  )
}

// ── Small composable primitives ─────────────────────────────────

function Section({
  title,
  children,
  variant,
}: {
  title: string
  children: React.ReactNode
  /** Phase 5C — `card` wraps the section in a subtle background tile so
   *  it reads as visually distinct from prose / bullet sections. */
  variant?: 'card'
}) {
  const className = variant === 'card'
    ? 'proposal-section proposal-section--card'
    : 'proposal-section'
  return (
    <section className={className}>
      <h2 className="proposal-section-title">{title}</h2>
      {children}
    </section>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="proposal-kv-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function BulletsOrPara({ items }: { items: string[] }) {
  if (items.length === 0) return null
  if (items.length === 1) return <p className="proposal-prose">{items[0]}</p>
  return (
    <ul className="proposal-list">
      {items.map((x, i) => <li key={i}>{x}</li>)}
    </ul>
  )
}

// ── Inline CSS — clean, print-friendly, minimal polish ──────────
// System version: strong hierarchy, readable prose, break-inside-avoid
// on sections so page flow is clean. Visual polish to follow.

const PROPOSAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  body { background: #f5f5f5; }

  .proposal-page {
    max-width: 210mm;
    margin: 24px auto;
    padding: 56px 60px 48px;
    background: #fff;
    box-shadow: 0 1px 6px rgba(0,0,0,0.08);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 10pt;
    line-height: 1.65;
    color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .proposal-eyebrow {
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #076653;
    margin-bottom: 10px;
  }

  /* ── Phase 5C — Cover hero ─────────────────────────────────────
     The cover-page article drops its top padding so the hero can
     stretch full-width. Parties + Executive summary sit inside
     .proposal-cover-body, which restores the standard horizontal
     padding for body content. */
  .proposal-page--cover { padding-top: 0; }
  .proposal-cover-body  { padding: 32px 0 0; }

  .proposal-hero {
    position: relative;
    overflow: hidden;
    margin: 0 -60px 36px;          /* break out of page padding */
    min-height: 320px;
    color: #fff;
    background: #06231D;            /* fallback if image fails */
    break-inside: avoid;
    page-break-inside: avoid;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .proposal-hero-bg { position: absolute; inset: 0; z-index: 1; }
  .proposal-hero-bg img {
    width: 100%; height: 100%;
    object-fit: cover; object-position: 70% center;
    filter: grayscale(0.15) contrast(1.05);
  }
  .proposal-hero-overlay {
    position: absolute; inset: 0; z-index: 2;
    background:
      linear-gradient(90deg,
        rgba(6,35,29,0.94) 0%,
        rgba(6,35,29,0.88) 35%,
        rgba(6,35,29,0.55) 70%,
        rgba(6,35,29,0.20) 100%);
  }
  .proposal-hero-inner {
    position: relative; z-index: 3;
    padding: 56px 60px 52px;
    display: flex; flex-direction: column;
    max-width: 75%;
  }
  .proposal-hero-logo {
    height: 36px; width: auto;
    margin-bottom: 32px;
  }
  .proposal-hero-eyebrow {
    font-family: 'Inter', sans-serif;
    font-size: 8.5pt; font-weight: 600;
    letter-spacing: 0.22em; text-transform: uppercase;
    color: #C6F6D5;
    margin-bottom: 14px;
  }
  .proposal-hero-title {
    margin: 0 0 22px;
    display: flex; flex-direction: column;
    font-family: 'Noto Serif', Georgia, 'Times New Roman', serif;
    font-size: 42pt; line-height: 0.98;
    letter-spacing: -0.02em; font-weight: 700;
    color: #fff;
  }
  .proposal-hero-title span { display: block; }
  .proposal-hero-accent {
    width: 56px; height: 3px;
    background: #7EC87A;
    margin: 0 0 26px;
    border-radius: 2px;
  }
  .proposal-hero-meta {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 22px;
    row-gap: 6px;
    margin: 0;
    max-width: 480px;
    font-size: 9.5pt;
  }
  .proposal-hero-meta dt {
    font-family: 'Inter', sans-serif;
    font-weight: 600; font-size: 7.5pt;
    text-transform: uppercase; letter-spacing: 0.16em;
    color: #C6F6D5; opacity: 0.75;
    align-self: center;
  }
  .proposal-hero-meta dd {
    margin: 0;
    color: #fff; font-weight: 500;
    line-height: 1.4;
  }

  /* Parties */
  .proposal-parties {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 36px;
    margin-bottom: 36px;
  }
  .proposal-sub-label {
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #076653;
    margin-bottom: 6px;
  }
  .proposal-party-name { font-size: 11pt; font-weight: 700; color: #06231D; margin-bottom: 3px; }
  .proposal-party-line { font-size: 9pt; color: #5C6B64; }

  /* Section — Phase 5C tightened hierarchy. Slightly more breathing
     room above each section + a heavier accent bar under each title
     so the eye lands on it cleanly. */
  .proposal-section {
    margin-bottom: 32px;
    break-inside: avoid;
  }
  .proposal-section-title {
    font-family: 'Inter', sans-serif;
    font-size: 10pt;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #076653;
    padding-bottom: 8px;
    border-bottom: 2px solid #076653;
    margin: 0 0 18px;
    position: relative;
  }

  /* Card variant — subtle sage tile around the section. Used for
     Commercial Terms + Next Steps so they read as distinct
     contractual / closing blocks. */
  .proposal-section--card {
    background: #f7f9f7;
    border: 1px solid #e0eae3;
    border-radius: 8px;
    padding: 22px 26px 24px;
    break-inside: avoid;
  }
  .proposal-section--card .proposal-section-title {
    border-bottom-color: #cdd9d2;
    margin-bottom: 14px;
  }

  .proposal-prose { font-size: 10pt; color: #1a1a1a; margin: 0 0 8px; line-height: 1.7; }
  .proposal-prose:last-child { margin-bottom: 0; }
  .proposal-muted { color: #5C6B64; }
  .proposal-link { color: #076653; text-decoration: underline; }

  .proposal-list { margin: 0; padding-left: 18px; font-size: 10pt; line-height: 1.7; }
  .proposal-list li { margin-bottom: 4px; }

  /* Key-value grid */
  .proposal-kv {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px 36px;
    margin: 0;
  }
  .proposal-kv-row { display: flex; justify-content: space-between; gap: 24px; padding: 4px 0; border-bottom: 1px dotted #e0eae3; }
  .proposal-kv-row dt {
    font-size: 8.5pt;
    font-weight: 600;
    color: #5C6B64;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0;
  }
  .proposal-kv-row dd { margin: 0; font-size: 10pt; color: #1a1a1a; font-weight: 500; text-align: right; }

  /* Callouts */
  .proposal-callout {
    margin-top: 14px;
    padding: 12px 16px;
    background: #f7f9f7;
    border-left: 3px solid #076653;
    border-radius: 6px;
    font-size: 9.5pt;
    color: #1a1a1a;
  }
  .proposal-callout .proposal-sub-label { color: #5C6B64; margin-bottom: 4px; }

  /* Scope */
  .proposal-scope { display: flex; flex-direction: column; gap: 16px; }
  .proposal-scope-group { break-inside: avoid; }
  .proposal-scope-title {
    font-size: 11pt;
    font-weight: 700;
    color: #06231D;
    margin: 0 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px dashed #cdd9d2;
  }
  .proposal-scope-paragraph {
    margin: 0 0 10px;
    color: #1a1a1a;
  }

  /* Optional paragraphs (Phase 4B) */
  .proposal-optional-paragraph { margin-bottom: 12px; break-inside: avoid; }
  .proposal-optional-paragraph:last-child { margin-bottom: 0; }
  .proposal-optional-heading {
    font-size: 10pt;
    font-weight: 700;
    color: #06231D;
    margin: 0 0 4px;
    letter-spacing: 0.01em;
  }

  /* Phase 5B — section lead paragraphs (site understanding, service
     plan, pricing support) sit at the top of an existing section,
     above the structured data (kv list / table). */
  .proposal-section-lead {
    margin: 0 0 12px;
    color: #1a1a1a;
  }
  .proposal-terms-closing {
    margin: 10px 0 0;
    font-size: 9.5pt;
  }
  .proposal-scope-list { margin: 0; padding-left: 0; list-style: none; }
  .proposal-scope-list li {
    padding: 6px 0;
    border-bottom: 1px solid #f1f3f1;
    font-size: 10pt;
    color: #1a1a1a;
  }
  .proposal-scope-list li:last-child { border-bottom: none; }
  .proposal-task-name { font-weight: 600; }
  .proposal-task-freq {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 8px;
    background: #e8f5e9;
    color: #076653;
    border-radius: 999px;
    font-size: 8.5pt;
    font-weight: 600;
    vertical-align: middle;
  }
  .proposal-task-area { color: #5C6B64; font-size: 9pt; }
  .proposal-task-note { font-size: 8.5pt; color: #5C6B64; margin-top: 3px; line-height: 1.5; }

  /* Phase 5C — Pricing headline. Lifts the monthly figure that
     lands on the recurring invoice. Sits above the breakdown table
     so a reader gets the answer in two seconds without parsing
     subtotals. No internal logic exposed. */
  .pricing-headline {
    background: #06231D;
    color: #fff;
    border-radius: 10px;
    padding: 22px 26px 20px;
    margin: 6px 0 22px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    break-inside: avoid;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .pricing-headline-label {
    font-family: 'Inter', sans-serif;
    font-size: 8.5pt; font-weight: 600;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: #C6F6D5;
  }
  .pricing-headline-value {
    font-family: 'Noto Serif', Georgia, serif;
    font-size: 28pt; font-weight: 700;
    line-height: 1.1; letter-spacing: -0.015em;
    color: #fff;
    font-variant-numeric: tabular-nums;
  }
  .pricing-headline-sub {
    font-size: 9pt;
    color: rgba(255,255,255,0.72);
  }

  /* Pricing */
  .proposal-pricing { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 10px; }
  .proposal-pricing td { padding: 9px 0; border-bottom: 1px solid #f0f0f0; }
  .proposal-pricing td:first-child { color: #1a1a1a; font-weight: 500; }
  .proposal-amount { text-align: right; font-variant-numeric: tabular-nums; }

  .proposal-totals {
    margin-left: auto;
    width: 320px;
    border: 1px solid #d6e3dc;
    border-radius: 8px;
    overflow: hidden;
    font-size: 9.5pt;
    color: #5C6B64;
    font-variant-numeric: tabular-nums;
  }
  .proposal-totals > div { display: flex; justify-content: space-between; padding: 9px 16px; border-bottom: 1px solid #eef2ef; }
  .proposal-totals-headline {
    background: #076653;
    color: #fff !important;
    font-weight: 700;
    font-size: 12pt;
  }
  .proposal-totals-annual {
    padding: 10px 16px;
    background: #f7f9f7;
    font-size: 9pt;
    color: #5C6B64;
  }
  .proposal-totals-annual strong { color: #06231D; }
  .proposal-pricing-note { margin-top: 10px; font-size: 8.5pt; }

  .proposal-footer {
    margin-top: 36px;
    padding-top: 14px;
    border-top: 1px solid #e0eae3;
    font-size: 8pt;
    color: #999;
    text-align: center;
    letter-spacing: 0.04em;
  }

  @media print {
    body { background: #fff; }
    .proposal-page { margin: 0; padding: 16mm 14mm; box-shadow: none; max-width: none; }
    /* Cover variant — drop top padding so the hero touches the
       sheet edge, but keep horizontal padding so the body content
       below stays inset from the edges. */
    .proposal-page--cover { padding: 0 14mm 16mm; }
    .proposal-cover-body  { padding-top: 24px; }
    /* Hero stretches to the printed sheet edges via negative
       horizontal margins that match the print padding. */
    .proposal-hero {
      margin: 0 -14mm 26px;
      min-height: 240px;
    }
    .proposal-hero-inner { padding: 38px 22mm 36px; }
    .proposal-hero-title { font-size: 36pt; }
    /* Breaks: keep critical blocks intact across page boundaries. */
    .proposal-section,
    .proposal-section--card,
    .proposal-scope-group,
    .proposal-optional-paragraph,
    .pricing-headline,
    .proposal-totals,
    .proposal-callout,
    .proposal-parties { break-inside: avoid; page-break-inside: avoid; }
    @page { margin: 0; size: A4; }
  }
`
