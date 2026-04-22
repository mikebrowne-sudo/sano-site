// Commercial proposal template — server component.
//
// Rendered by /portal/quotes/[id]/proposal for commercial quotes.
// Takes all data as props (environment-agnostic) so a future public
// share route can reuse it without changes.
//
// This is the "system version" — content structure is the priority,
// visual polish will follow. Print-friendly layout using a minimal
// palette from the existing portal design language.

import type {
  CommercialQuoteDetails,
  CommercialScopeItem,
} from '@/lib/commercialQuote'
import {
  buildExecutiveSummary,
  buildPricingSummary,
  buildServiceSchedule,
  buildSiteProfile,
  fmtProposalDate,
  groupScopeForProposal,
  nzd,
  splitToBullets,
} from '@/lib/commercialProposalMapping'
import type {
  ProposalAddon,
  ProposalClient,
  ProposalQuote,
} from '@/lib/commercialProposalMapping'

// Re-export so existing consumers can keep importing these types from
// the template's path. Single source of truth lives in
// commercialProposalMapping.ts.
export type { ProposalAddon, ProposalClient, ProposalQuote }

export interface CommercialProposalTemplateProps {
  quote: ProposalQuote
  client: ProposalClient | null
  addons: readonly ProposalAddon[]
  details: CommercialQuoteDetails
  scope: readonly CommercialScopeItem[]
}

const fmtDate = fmtProposalDate

export function CommercialProposalTemplate({
  quote,
  client,
  addons,
  details,
  scope,
}: CommercialProposalTemplateProps) {
  const summary = buildExecutiveSummary(details, scope, client?.name ?? client?.company_name ?? null)
  const site = buildSiteProfile(details, quote.service_address ?? client?.service_address ?? null)
  const schedule = buildServiceSchedule(details)
  const groups = groupScopeForProposal(scope)
  const pricing = buildPricingSummary(
    quote.base_price ?? 0,
    addons,
    quote.discount ?? 0,
    quote.gst_included,
  )
  const assumptions = splitToBullets(details.assumptions ?? null)
  const exclusions = splitToBullets(details.exclusions ?? null)

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PROPOSAL_CSS }} />
      <div className="proposal-page">

        {/* 1. Cover */}
        <header className="proposal-cover">
          <div>
            <div className="proposal-eyebrow">Commercial Cleaning Proposal</div>
            <h1 className="proposal-cover-title">
              Cleaning programme for {client?.company_name || client?.name || `${site.sector} site`}
            </h1>
            <div className="proposal-cover-sub">
              Prepared by Sano Property Services Limited · {fmtDate(quote.date_issued)}
            </div>
          </div>
          <div className="proposal-cover-meta">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/sano-logo-print.png" alt="Sano" className="proposal-logo" />
            <table className="proposal-meta-table">
              <tbody>
                <tr><th>Reference</th><td>{quote.quote_number}</td></tr>
                <tr><th>Issued</th><td>{fmtDate(quote.date_issued)}</td></tr>
                <tr><th>Valid until</th><td>{fmtDate(quote.valid_until)}</td></tr>
                {quote.status === 'accepted' && quote.accepted_at && (
                  <tr><th>Accepted</th><td>{fmtDate(quote.accepted_at)}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </header>

        {/* Parties */}
        <section className="proposal-parties">
          <div>
            <div className="proposal-sub-label">Prepared by</div>
            <div className="proposal-party-name">Sano Property Services Limited</div>
            <div className="proposal-party-line">hello@sano.nz</div>
            <div className="proposal-party-line">022 394 3982</div>
            <div className="proposal-party-line">GST 141-577-062</div>
          </div>
          <div>
            <div className="proposal-sub-label">Prepared for</div>
            <div className="proposal-party-name">{client?.name ?? '—'}</div>
            {client?.company_name && <div className="proposal-party-line">{client.company_name}</div>}
            {site.service_address && <div className="proposal-party-line">{site.service_address}</div>}
            {client?.phone && <div className="proposal-party-line">{client.phone}</div>}
            {client?.email && <div className="proposal-party-line">{client.email}</div>}
          </div>
        </section>

        {/* 2. Executive Summary */}
        <Section title="Executive Summary">
          <p className="proposal-prose">{summary}</p>
        </Section>

        {/* 3. Site / Project Details */}
        <Section title="Site &amp; Project Details">
          <dl className="proposal-kv">
            <KV label="Sector"        value={site.sector} />
            <KV label="Building type" value={site.building_type} />
            <KV label="Address"       value={site.service_address ?? ''} />
            <KV label="Total area"    value={site.total_area} />
            <KV label="Floors"        value={site.floors} />
            <KV label="Occupancy"     value={site.occupancy} />
            <KV label="Traffic"       value={site.traffic} />
          </dl>
          {site.fixtures_summary && (
            <div className="proposal-callout">
              <div className="proposal-sub-label">Fixtures &amp; spaces</div>
              <div>{site.fixtures_summary}</div>
            </div>
          )}
        </Section>

        {/* 4. Scope of Works */}
        <Section title="Scope of Works">
          {groups.length === 0 ? (
            <p className="proposal-prose proposal-muted">
              Scope will be confirmed with the client and incorporated prior to mobilisation.
            </p>
          ) : (
            <div className="proposal-scope">
              {groups.map((g) => (
                <div key={g.key} className="proposal-scope-group">
                  <h3 className="proposal-scope-title">{g.label}</h3>
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

        {/* 5. Service Schedule */}
        <Section title="Service Schedule">
          <dl className="proposal-kv">
            <KV label="Service days"   value={schedule.service_days} />
            <KV label="Service window" value={schedule.service_window} />
            <KV label="Consumables"    value={schedule.consumables} />
          </dl>
          {schedule.access_requirements && (
            <div className="proposal-callout">
              <div className="proposal-sub-label">Access requirements</div>
              <div>{schedule.access_requirements}</div>
            </div>
          )}
          {!schedule.service_days && !schedule.service_window && !schedule.consumables && (
            <p className="proposal-prose proposal-muted">
              Service schedule to be confirmed with the client.
            </p>
          )}
        </Section>

        {/* 6. Pricing Summary */}
        <Section title="Pricing Summary">
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

        {/* 9. Why Sano */}
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

        {/* 10. Next Steps */}
        <Section title="Next Steps">
          <p className="proposal-prose">
            {quote.status === 'accepted'
              ? `This proposal was accepted on ${fmtDate(quote.accepted_at)}. We look forward to mobilising and delivering a strong ongoing programme.`
              : `If you would like to proceed, please confirm acceptance. A member of the Sano team will be in touch within one business day to schedule mobilisation.`}
          </p>
          <p className="proposal-prose proposal-muted">
            By accepting this proposal you agree to our{' '}
            <a href="/share/service-agreement" target="_blank" rel="noopener noreferrer" className="proposal-link">Service Agreement</a>.
          </p>
        </Section>

        <footer className="proposal-footer">
          Sano Property Services Limited · hello@sano.nz · 022 394 3982 · GST 141-577-062
        </footer>
      </div>
    </>
  )
}

// ── Small composable primitives ─────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="proposal-section">
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

  /* Cover */
  .proposal-cover {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 40px;
    padding-bottom: 28px;
    margin-bottom: 40px;
    border-bottom: 3px solid #076653;
    align-items: start;
  }
  .proposal-cover-title {
    font-size: 22pt;
    font-weight: 800;
    color: #06231D;
    line-height: 1.15;
    letter-spacing: -0.01em;
    margin: 0 0 10px;
  }
  .proposal-cover-sub { font-size: 9.5pt; color: #5C6B64; }
  .proposal-cover-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 14px; }
  .proposal-logo { height: 64px; width: auto; }
  .proposal-meta-table { font-size: 8.5pt; border-spacing: 0; }
  .proposal-meta-table th {
    font-size: 7.5pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em;
    color: #888; text-align: right; padding: 2px 12px 2px 0; font-weight: 500;
  }
  .proposal-meta-table td { padding: 2px 0; color: #1a1a1a; font-weight: 600; }

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

  /* Section */
  .proposal-section { margin-bottom: 28px; }
  .proposal-section-title {
    font-size: 10pt;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #076653;
    padding-bottom: 6px;
    border-bottom: 1px solid #e0eae3;
    margin: 0 0 14px;
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
    .proposal-page { margin: 0; padding: 0; box-shadow: none; max-width: none; }
    .proposal-section { break-inside: avoid; }
    .proposal-scope-group { break-inside: avoid; }
    @page { margin: 16mm 14mm; size: A4; }
  }
`
