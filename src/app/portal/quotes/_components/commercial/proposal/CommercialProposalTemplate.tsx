// Commercial proposal / tender template — server component.
//
// Renders a polished client-facing commercial cleaning proposal from
// structured Phase 0/1/2 data. Used by both:
//   - /portal/quotes/[id]/print  (internal print preview)
//   - /share/quote/[token]       (public share link)
//
// Both routes pass the same props; the only environmental difference
// is the optional `acceptanceSlot` which the share route fills with
// the existing AcceptQuote component when the quote is sent and not
// already accepted.

import type {
  CommercialQuoteDetails,
  CommercialScopeItem,
} from '@/lib/commercialQuote'
import {
  buildingTypeLabel,
  computeProposalPricing,
  executiveSummary,
  fmtArea,
  fmtCount,
  groupScopeForProposal,
  nzd,
  occupancyLabel,
  sectorLabel,
  serviceDaysSummary,
  splitToBullets,
  trafficLabel,
} from './commercial-proposal-mapping'

// ── Prop shapes (keep loose so both auth + share fetches fit) ──────

export interface ProposalQuote {
  id: string
  quote_number: string
  status: string | null
  date_issued: string | null
  valid_until: string | null
  accepted_at: string | null
  service_address: string | null
  notes: string | null
  base_price: number
  discount: number | null
  gst_included: boolean
  payment_type: string | null
}

export interface ProposalClient {
  name: string | null
  company_name: string | null
  service_address: string | null
  phone: string | null
  email: string | null
}

export interface ProposalAddon {
  label: string
  price: number
  sort_order: number
}

export interface CommercialProposalTemplateProps {
  quote: ProposalQuote
  client: ProposalClient | null
  addons: readonly ProposalAddon[]
  details: CommercialQuoteDetails | null
  scope: readonly CommercialScopeItem[]
  // Optional acceptance UI slot (only the public share route fills this)
  acceptanceSlot?: React.ReactNode
  // Layout flag — share page wraps in a centred "share-page" frame,
  // print page wraps in a print-overlay. Default to print.
  variant?: 'print' | 'share'
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function CommercialProposalTemplate({
  quote,
  client,
  addons,
  details,
  scope,
  acceptanceSlot,
  variant = 'print',
}: CommercialProposalTemplateProps) {
  const pricing = computeProposalPricing(
    quote.base_price ?? 0,
    addons,
    quote.discount ?? 0,
    quote.gst_included,
  )
  const isCashSale = (quote.payment_type ?? 'cash_sale') === 'cash_sale'
  const sector = sectorLabel(details?.sector_category)
  const summary = details
    ? executiveSummary(details, scope, client?.name ?? client?.company_name ?? null)
    : null
  const scopeAreas = groupScopeForProposal(scope)
  const assumptions = splitToBullets(details?.assumptions ?? null)
  const exclusions = splitToBullets(details?.exclusions ?? null)
  const compliance = splitToBullets(details?.compliance_notes ?? null)
  const access = (details?.access_requirements ?? '').trim()
  const consumables = details?.consumables_by ?? null
  const serviceDays = serviceDaysSummary(details?.service_days ?? null)
  const serviceWindow = details?.service_window?.trim() ?? ''
  const isAccepted = quote.status === 'accepted'

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PROPOSAL_CSS }} />
      <div className={variant === 'share' ? 'proposal-share' : 'proposal-overlay'}>
        <div className="proposal-page">

          {/* ── 1. COVER ─────────────────────────────────────── */}
          <header className="proposal-cover">
            <div className="proposal-cover-band">
              <div className="proposal-cover-eyebrow">Commercial cleaning proposal</div>
              <h1 className="proposal-cover-title">
                Cleaning programme for {client?.company_name || client?.name || sector + ' site'}
              </h1>
              <div className="proposal-cover-sub">
                Prepared by Sano Property Services Limited · {fmtDate(quote.date_issued)}
              </div>
            </div>
            <div className="proposal-cover-meta">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/sano-logo-print.png" alt="Sano" className="proposal-logo" />
              </div>
              <table className="proposal-cover-table">
                <tbody>
                  <tr>
                    <td>Reference</td>
                    <td className="proposal-cover-table-value">{quote.quote_number}</td>
                  </tr>
                  <tr>
                    <td>Issued</td>
                    <td className="proposal-cover-table-value">{fmtDate(quote.date_issued)}</td>
                  </tr>
                  <tr>
                    <td>Valid until</td>
                    <td className="proposal-cover-table-value">{fmtDate(quote.valid_until)}</td>
                  </tr>
                  {isAccepted && quote.accepted_at && (
                    <tr>
                      <td>Accepted</td>
                      <td className="proposal-cover-table-value">{fmtDate(quote.accepted_at)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </header>

          {/* ── 2. PARTIES ───────────────────────────────────── */}
          <section className="proposal-parties">
            <div className="proposal-party">
              <div className="proposal-party-label">Prepared by</div>
              <div className="proposal-party-name">Sano Property Services Limited</div>
              <div className="proposal-party-line">Phone: 022 394 3982</div>
              <div className="proposal-party-line">Email: hello@sano.nz</div>
              <div className="proposal-party-line">GST: 141-577-062</div>
            </div>
            <div className="proposal-party">
              <div className="proposal-party-label">Prepared for</div>
              <div className="proposal-party-name">{client?.name ?? '—'}</div>
              {client?.company_name && <div className="proposal-party-line">{client.company_name}</div>}
              {(quote.service_address || client?.service_address) && (
                <div className="proposal-party-line">{quote.service_address || client?.service_address}</div>
              )}
              {client?.phone && <div className="proposal-party-line">Phone: {client.phone}</div>}
              {client?.email && <div className="proposal-party-line">Email: {client.email}</div>}
            </div>
          </section>

          {/* ── 3. EXECUTIVE SUMMARY ─────────────────────────── */}
          {summary && (
            <section className="proposal-section">
              <h2 className="proposal-section-title">Executive summary</h2>
              <p className="proposal-prose">{summary}</p>
            </section>
          )}

          {/* ── 4. SITE & SERVICE PROFILE ────────────────────── */}
          {details && (
            <section className="proposal-section">
              <h2 className="proposal-section-title">Site &amp; service profile</h2>
              <div className="proposal-grid">
                <ProfileItem label="Sector" value={sector ? capitalise(sector) : null} />
                <ProfileItem label="Subtype" value={details.sector_subtype} />
                <ProfileItem label="Building type" value={buildingTypeLabel(details.building_type)} />
                <ProfileItem label="Total floor area" value={fmtArea(details.total_area_m2)} />
                <ProfileItem label="Floors" value={fmtCount(details.floor_count, 'floor')} />
                <ProfileItem label="Service days" value={serviceDays} />
                <ProfileItem label="Service window" value={serviceWindow} />
                <ProfileItem label="Occupancy" value={occupancyLabel(details.occupancy_level)} />
                <ProfileItem label="Traffic" value={trafficLabel(details.traffic_level)} />
                <ProfileItem label="Consumables" value={consumablesLabel(consumables)} />
                <FixturesItem details={details} />
              </div>
              {access && (
                <div className="proposal-callout">
                  <div className="proposal-callout-label">Access &amp; site requirements</div>
                  <div className="proposal-callout-body">{access}</div>
                </div>
              )}
            </section>
          )}

          {/* ── 5. SCOPE OF WORK ─────────────────────────────── */}
          <section className="proposal-section">
            <h2 className="proposal-section-title">Scope of work</h2>
            {scopeAreas.length === 0 ? (
              <p className="proposal-prose proposal-muted">
                Scope details to be agreed with the client and incorporated prior to mobilisation.
              </p>
            ) : (
              <div className="proposal-scope">
                {scopeAreas.map((area, ai) => (
                  <div key={ai} className="proposal-scope-area">
                    <h3 className="proposal-scope-area-title">{area.area}</h3>
                    <table className="proposal-scope-table">
                      <thead>
                        <tr>
                          <th style={{ width: '50%' }}>Task</th>
                          <th style={{ width: '20%' }}>Group</th>
                          <th style={{ width: '20%' }}>Frequency</th>
                          <th style={{ width: '10%' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {area.tasks.map((t) => (
                          <tr key={t.id}>
                            <td>
                              <div className="proposal-scope-task">{t.task_name}</div>
                              {t.notes && <div className="proposal-scope-note">{t.notes}</div>}
                            </td>
                            <td className="proposal-scope-group">{t.task_group ?? '—'}</td>
                            <td>
                              <span className="proposal-freq-pill">{t.frequency_label}</span>
                            </td>
                            <td></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── 6. ASSUMPTIONS & EXCLUSIONS ─────────────────── */}
          {(assumptions.length > 0 || exclusions.length > 0 || compliance.length > 0) && (
            <section className="proposal-section">
              <h2 className="proposal-section-title">Assumptions, exclusions &amp; compliance</h2>
              <div className="proposal-two-col">
                {assumptions.length > 0 && (
                  <div>
                    <div className="proposal-sub-title">Assumptions</div>
                    {assumptions.length === 1 ? (
                      <p className="proposal-prose">{assumptions[0]}</p>
                    ) : (
                      <ul className="proposal-list">
                        {assumptions.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    )}
                  </div>
                )}
                {exclusions.length > 0 && (
                  <div>
                    <div className="proposal-sub-title">Exclusions</div>
                    {exclusions.length === 1 ? (
                      <p className="proposal-prose">{exclusions[0]}</p>
                    ) : (
                      <ul className="proposal-list">
                        {exclusions.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              {compliance.length > 0 && (
                <div className="proposal-callout proposal-callout--compliance">
                  <div className="proposal-callout-label">Compliance notes</div>
                  {compliance.length === 1 ? (
                    <div className="proposal-callout-body">{compliance[0]}</div>
                  ) : (
                    <ul className="proposal-list proposal-callout-body">
                      {compliance.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ── 7. PRICING ───────────────────────────────────── */}
          <section className="proposal-section">
            <h2 className="proposal-section-title">Pricing summary</h2>
            <table className="proposal-pricing">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
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

            <div className="proposal-totals-row">
              <div className="proposal-totals-card">
                <div className="proposal-totals-line"><span>Subtotal (excl. GST)</span><span>{nzd(pricing.subtotal_ex_gst)}</span></div>
                <div className="proposal-totals-line"><span>GST (15%)</span><span>{nzd(pricing.gst_amount)}</span></div>
                <div className="proposal-totals-headline">
                  <span>Recurring fee (incl. GST)</span>
                  <span>{nzd(pricing.total_inc_gst)}</span>
                </div>
                <div className="proposal-totals-annual">
                  Indicative annualised value: <strong>{nzd(pricing.annualised_inc_gst)}</strong>
                </div>
              </div>
            </div>

            {quote.notes && (
              <div className="proposal-callout proposal-callout--neutral" style={{ marginTop: 18 }}>
                <div className="proposal-callout-label">Additional notes</div>
                <div className="proposal-callout-body">{quote.notes}</div>
              </div>
            )}
          </section>

          {/* ── 8. WHY SANO ─────────────────────────────────── */}
          <section className="proposal-section">
            <h2 className="proposal-section-title">Why Sano</h2>
            <div className="proposal-why-grid">
              <WhyCard
                title="Detail-led delivery"
                body="Every Sano programme is built around a structured scope of work. Our crews follow it, our supervisors check it, and our reporting confirms it — so what we promise is what gets delivered, every visit."
              />
              <WhyCard
                title="Reliable, accountable people"
                body="Sano staff are trained, insured, and consistent. You see the same faces, who know your site, your access procedures, and your standards."
              />
              <WhyCard
                title="A partnership, not a contract"
                body="We pick up the phone, respond quickly when something needs attention, and adjust the programme as your business changes. Long-term performance is the only thing we are measured on."
              />
            </div>
          </section>

          {/* ── 9. ACCEPTANCE / NEXT STEPS ──────────────────── */}
          <section className="proposal-section proposal-acceptance-section">
            <h2 className="proposal-section-title">Acceptance &amp; next steps</h2>
            <p className="proposal-prose">
              {isAccepted
                ? `This proposal was accepted on ${fmtDate(quote.accepted_at)}. We look forward to mobilising and delivering an excellent programme.`
                : `If you would like to proceed, please confirm acceptance and a member of the Sano team will be in touch within one business day to schedule mobilisation.`}
            </p>
            <p className="proposal-prose proposal-muted">
              {isCashSale
                ? 'Payment is required in full before or on the day of service unless otherwise agreed in writing.'
                : 'Invoices are issued monthly and payable within 14 days of issue, unless otherwise agreed in writing.'}
              {' '}By accepting this proposal you agree to our{' '}
              <a href="/share/service-agreement" target="_blank" rel="noopener noreferrer" className="proposal-link">Service Agreement</a>.
            </p>
            {acceptanceSlot && (
              <div className="proposal-acceptance-slot">{acceptanceSlot}</div>
            )}
          </section>

          <footer className="proposal-footer">
            Sano Property Services Limited · hello@sano.nz · 022 394 3982 · GST 141-577-062
          </footer>
        </div>
      </div>
    </>
  )
}

// ── Sub-components (kept local to the template) ──────────────────

function ProfileItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="proposal-profile-item">
      <div className="proposal-profile-label">{label}</div>
      <div className="proposal-profile-value">{value}</div>
    </div>
  )
}

function FixturesItem({ details }: { details: CommercialQuoteDetails }) {
  const bits: string[] = []
  const push = (s: string) => { if (s) bits.push(s) }
  push(fmtCount(details.toilets_count, 'toilet'))
  push(fmtCount(details.urinals_count, 'urinal'))
  push(fmtCount(details.basins_count, 'basin'))
  push(fmtCount(details.showers_count, 'shower'))
  push(fmtCount(details.kitchens_count, 'kitchen'))
  push(fmtCount(details.desks_count, 'desk'))
  push(fmtCount(details.offices_count, 'office'))
  push(fmtCount(details.meeting_rooms_count, 'meeting room'))
  push(fmtCount(details.reception_count, 'reception area'))
  if (bits.length === 0) return null
  return (
    <div className="proposal-profile-item proposal-profile-item--wide">
      <div className="proposal-profile-label">Fixtures &amp; spaces</div>
      <div className="proposal-profile-value">{bits.join(' · ')}</div>
    </div>
  )
}

function WhyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="proposal-why-card">
      <div className="proposal-why-title">{title}</div>
      <div className="proposal-why-body">{body}</div>
    </div>
  )
}

function consumablesLabel(c: string | null | undefined): string {
  if (!c) return ''
  if (c === 'sano')   return 'Provided by Sano'
  if (c === 'client') return 'Provided by client'
  if (c === 'shared') return 'Shared between Sano and client'
  return capitalise(c)
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Inline CSS (print-friendly, mirrors the existing print template's
//   sage palette and Inter family but with richer hierarchy) ───────

const PROPOSAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  .proposal-overlay,
  .proposal-share {
    position: relative;
    background: #f5f5f5;
    min-height: 100vh;
    overflow: auto;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 10pt;
    line-height: 1.6;
    color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .proposal-overlay { position: fixed; inset: 0; z-index: 9999; }
  .proposal-share   { padding: 24px 16px; }

  .proposal-page {
    max-width: 210mm;
    margin: 32px auto;
    padding: 56px 60px 48px;
    background: #fff;
    box-shadow: 0 1px 8px rgba(0,0,0,.08);
  }

  /* Cover */
  .proposal-cover { display: grid; grid-template-columns: 1fr 220px; gap: 36px; margin-bottom: 44px; padding-bottom: 28px; border-bottom: 3px solid #076653; }
  .proposal-cover-band { padding-top: 4px; }
  .proposal-cover-eyebrow { font-size: 8.5pt; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #076653; margin-bottom: 10px; }
  .proposal-cover-title { font-size: 22pt; font-weight: 800; color: #06231D; line-height: 1.15; letter-spacing: -0.01em; margin: 0 0 10px; }
  .proposal-cover-sub { font-size: 9.5pt; color: #5C6B64; }
  .proposal-cover-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 16px; }
  .proposal-logo { height: 64px; width: auto; }
  .proposal-cover-table { font-size: 8.5pt; border-spacing: 0; color: #5C6B64; }
  .proposal-cover-table td { padding: 2px 0; }
  .proposal-cover-table td:first-child { padding-right: 14px; text-align: right; color: #999; text-transform: uppercase; letter-spacing: 0.1em; font-size: 7.5pt; }
  .proposal-cover-table-value { color: #1a1a1a; font-weight: 600; }

  /* Parties */
  .proposal-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-bottom: 36px; }
  .proposal-party {}
  .proposal-party-label { font-size: 7.5pt; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #076653; margin-bottom: 8px; }
  .proposal-party-name { font-size: 11pt; font-weight: 700; color: #06231D; margin-bottom: 3px; }
  .proposal-party-line { font-size: 9pt; color: #5C6B64; line-height: 1.6; }

  /* Sections */
  .proposal-section { margin-bottom: 32px; }
  .proposal-section-title { font-size: 9pt; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #076653; padding-bottom: 8px; border-bottom: 1px solid #e0eae3; margin: 0 0 16px; }
  .proposal-sub-title { font-size: 8.5pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #5C6B64; margin-bottom: 8px; }

  .proposal-prose { font-size: 10pt; color: #1a1a1a; margin: 0; line-height: 1.7; }
  .proposal-prose + .proposal-prose { margin-top: 10px; }
  .proposal-muted { color: #5C6B64; }

  .proposal-list { margin: 0; padding-left: 18px; font-size: 10pt; color: #1a1a1a; line-height: 1.7; }
  .proposal-list li { margin-bottom: 4px; }

  .proposal-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }

  /* Profile grid */
  .proposal-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 28px; }
  .proposal-profile-item {}
  .proposal-profile-item--wide { grid-column: 1 / -1; }
  .proposal-profile-label { font-size: 7.5pt; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #999; margin-bottom: 2px; }
  .proposal-profile-value { font-size: 10pt; color: #1a1a1a; font-weight: 500; }

  /* Callouts */
  .proposal-callout { margin-top: 18px; padding: 14px 18px; border: 1px solid #e0eae3; border-left: 3px solid #076653; border-radius: 6px; background: #f7f9f7; }
  .proposal-callout--compliance { border-left-color: #b58400; background: #fdf8ec; border-color: #f1e3b0; margin-top: 18px; }
  .proposal-callout--neutral { border-left-color: #999; background: #fafafa; border-color: #ebebeb; }
  .proposal-callout-label { font-size: 7.5pt; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #5C6B64; margin-bottom: 6px; }
  .proposal-callout-body { font-size: 9.5pt; color: #1a1a1a; line-height: 1.65; }

  /* Scope */
  .proposal-scope { display: flex; flex-direction: column; gap: 22px; }
  .proposal-scope-area-title { font-size: 11pt; font-weight: 700; color: #06231D; margin: 0 0 8px; padding-bottom: 4px; border-bottom: 1px dashed #cdd9d2; }
  .proposal-scope-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  .proposal-scope-table th { text-align: left; padding: 8px 10px; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #5C6B64; border-bottom: 1px solid #e0eae3; }
  .proposal-scope-table td { padding: 9px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .proposal-scope-table tr:last-child td { border-bottom: none; }
  .proposal-scope-task { font-weight: 600; color: #1a1a1a; }
  .proposal-scope-note { font-size: 8.5pt; color: #5C6B64; margin-top: 3px; line-height: 1.5; }
  .proposal-scope-group { font-size: 9pt; color: #5C6B64; }
  .proposal-freq-pill { display: inline-block; padding: 2px 9px; background: #e8f5e9; color: #076653; border-radius: 999px; font-size: 8.5pt; font-weight: 600; }

  /* Pricing */
  .proposal-pricing { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 8px; }
  .proposal-pricing th { padding: 9px 0; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #5C6B64; border-bottom: 1px solid #e0eae3; }
  .proposal-pricing td { padding: 9px 0; border-bottom: 1px solid #f0f0f0; }
  .proposal-amount { text-align: right; font-variant-numeric: tabular-nums; }
  .proposal-totals-row { display: flex; justify-content: flex-end; margin-top: 16px; }
  .proposal-totals-card { width: 320px; border: 1px solid #d6e3dc; border-radius: 8px; overflow: hidden; }
  .proposal-totals-line { display: flex; justify-content: space-between; padding: 9px 16px; border-bottom: 1px solid #eef2ef; color: #5C6B64; font-size: 9.5pt; font-variant-numeric: tabular-nums; }
  .proposal-totals-headline { display: flex; justify-content: space-between; padding: 14px 16px; background: #076653; color: #fff; font-weight: 700; font-size: 12pt; font-variant-numeric: tabular-nums; }
  .proposal-totals-annual { padding: 10px 16px; background: #f7f9f7; font-size: 9pt; color: #5C6B64; }
  .proposal-totals-annual strong { color: #06231D; }

  /* Why Sano */
  .proposal-why-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .proposal-why-card { border: 1px solid #e0eae3; border-radius: 8px; padding: 14px 16px; background: #f7f9f7; }
  .proposal-why-title { font-size: 9.5pt; font-weight: 700; color: #076653; margin-bottom: 6px; letter-spacing: 0.01em; }
  .proposal-why-body { font-size: 9pt; color: #1a1a1a; line-height: 1.6; }

  /* Acceptance */
  .proposal-acceptance-section { background: #fbfdfb; border: 1px solid #e0eae3; border-radius: 10px; padding: 22px 24px; }
  .proposal-acceptance-section .proposal-section-title { border-bottom-color: #cfe0d6; }
  .proposal-acceptance-slot { margin-top: 16px; }
  .proposal-link { color: #076653; text-decoration: underline; }

  .proposal-footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e0eae3; font-size: 8pt; color: #999; text-align: center; letter-spacing: 0.04em; }

  /* Print */
  @media print {
    body > *:not(.proposal-overlay):not(.proposal-share),
    body > * > *:not(.proposal-overlay):not(.proposal-share) { display: none !important; }
    .proposal-overlay, .proposal-share { position: static; background: none; padding: 0; }
    .proposal-page { margin: 0; padding: 0; box-shadow: none; max-width: none; }
    .proposal-section { break-inside: avoid; }
    .proposal-scope-area { break-inside: avoid; }
    .proposal-acceptance-section { break-inside: avoid; }
    @page { margin: 16mm 14mm; size: A4; }
  }
`
