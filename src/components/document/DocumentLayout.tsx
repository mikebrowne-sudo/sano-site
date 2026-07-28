import type { ReactNode } from 'react'
import { QUOTE_INVOICE_CSS } from './QuoteInvoiceCss'

/**
 * Shared chrome for the standard Sano Quote / Tax Invoice document.
 * Consumed by `QuoteDocument` and `InvoiceDocument`. Pages just supply
 * a `<wrapper>` (either `.share-page` for /share/* surfaces or
 * `.print-overlay` for /portal/.../print surfaces) — the document card
 * itself is identical.
 *
 * Markup tracks the standalone bundled template referenced in
 * BRAND.md §8 — flat sage-800 header (white logo lockup left, identity
 * block right), serif "Invoice." / "Quote." with sage-300 dot,
 * From / Billed-to (or Quote-for) parties divided by a sage-100
 * hairline, three-column items table (No. / Description / Amount —
 * the description cell takes an optional `sub` paragraph below the
 * title for service detail since the portal data has no per-line
 * Rate/Qty), notes + payment-details on the left, totals on the right
 * with the sage-800 grand-total pill, cream Terms band, sage-800
 * footer ending with the italic "Cleaning, done properly." line.
 */

export type DocumentKind = 'quote' | 'invoice'

export interface DocumentParty {
  /** Bold first-line name (rendered in the display serif). */
  name: string
  /** Optional company line beneath the name (appears as the first detail row). */
  company?: string | null
  /** Optional address block (may contain newlines). */
  address?: string | null
  /** Optional Attn-style line for the contact person. */
  attn?: string | null
  email?: string | null
  phone?: string | null
  /** Optional GST line — used for the From party only. */
  gst?: string | null
  /** Optional "Your reference / PO" line for the To party. */
  reference?: string | null
}

export interface DocumentMeta {
  /** Document number (e.g. QT-0081, INV-0062). */
  number: string
  /** Issue date formatted for display. */
  dateIssuedDisplay: string
  /** Trailing date label ("Valid until" for quote, "Due" for invoice). */
  trailingDateLabel: string
  /** Trailing date formatted for display. */
  trailingDateDisplay: string
  /**
   * Optional client reference / PO label — rendered as an extra
   * meta-grid row in the document header when both label + display
   * are present. Used by QuoteDocument / InvoiceDocument to surface
   * `client_reference` prominently next to Number / Issued / Due.
   */
  referenceLabel?: string
  /** Optional client reference / PO value paired with `referenceLabel`. */
  referenceDisplay?: string
}

export interface DocumentLineItem {
  /** Title — first line of the description cell. */
  description: string
  /** Optional labelled sub-rows rendered beneath the title (each row
   * shows a small uppercase label and a value paragraph on its own
   * line below). Used by Quote/InvoiceDocument to show Service
   * address + Service description in the first line item. */
  subBlocks?: ReadonlyArray<{ label: string; value: string }>
  /** Optional structured scope (Full Property Reset). When present it renders
   * beneath the line as intro → headed sections → completion → notes →
   * exclusions, with bold headings that stay with their first task and
   * sections free to flow across pages. Descriptive only. */
  structuredScope?: DocumentStructuredScope
  /** Formatted dollar amount, e.g. "$120.00" or "-$50.00". */
  amount: string
}

/** Presentation shape of the structured scope (decoupled from the lib type). */
export interface DocumentStructuredScope {
  title?: string
  intro?: string
  sections: ReadonlyArray<{ heading: string; items: ReadonlyArray<string> }>
  completion?: string
  notes?: ReadonlyArray<string>
  exclusions?: ReadonlyArray<string>
}

export interface DocumentTotals {
  subtotalExGstDisplay: string
  gstDisplay: string
  totalDisplay: string
}

export interface DocumentFooter {
  /** Email shown in the dark footer. */
  email: string
  /** Phone shown in the dark footer. */
  phone: string
  /** Website shown in the dark footer. */
  website: string
}

export interface DocumentLayoutProps {
  /** Wrapping class. `'share-page'` on share routes, `'print-overlay'`
   * on staff portal print routes. */
  wrapper: 'share-page' | 'print-overlay'
  /** Selects header / party / total labels + payment-section visibility. */
  kind: DocumentKind
  /** Header metadata: number + dates. */
  meta: DocumentMeta
  /** From / To parties. */
  fromParty: DocumentParty
  toParty: DocumentParty
  /** Line items rendered in the items list. */
  lineItems: ReadonlyArray<DocumentLineItem>
  /** Amount-column heading — reflects the GST treatment
   *  ("Amount (incl. GST)" or "Amount (excl. GST)"). */
  amountLabel?: string
  /** Notes block (free text). Optional. */
  notes?: string | null
  /** Invoice-only Payment Details block. Pass null/undefined for quotes. */
  paymentDetails?: ReadonlyArray<{ label: string; value: string }>
  /** Totals (subtotal, gst, total). */
  totals: DocumentTotals
  /** Terms paragraph — varies by kind + payment_type. */
  termsBody: string
  /** Dark footer content. */
  footer: DocumentFooter
  /** Optional interactive slot (AcceptQuote / PayNowButton) — only
   * rendered on share pages, hidden in PDF mode. */
  interactiveSlot?: ReactNode
  /** Optional share-page actions row (PDF download button) — only
   * rendered on share pages, hidden in PDF mode. */
  shareActionsSlot?: ReactNode
}

export function DocumentLayout({
  wrapper,
  kind,
  meta,
  fromParty,
  toParty,
  lineItems,
  amountLabel = 'Amount (incl. GST)',
  notes,
  paymentDetails,
  totals,
  termsBody,
  footer,
  interactiveSlot,
  shareActionsSlot,
}: DocumentLayoutProps) {
  const isQuote = kind === 'quote'
  const typeWord = isQuote ? 'Quote' : 'Invoice'
  const numberLabel = isQuote ? 'Quote #' : 'Invoice #'
  const toPartyLabel = isQuote ? 'Quote for' : 'Billed to'
  const grandTotalLabel = isQuote ? 'Quote total' : 'Amount due'

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: QUOTE_INVOICE_CSS }} />
      <div className={wrapper}>
        {shareActionsSlot && <div className="doc-share-actions">{shareActionsSlot}</div>}

        <article className="doc" aria-label={typeWord}>
          {/* Header — flat sage-800 with grain + bottom accent stripe. */}
          <header className="doc-header">
            <div className="doc-header-row">
              <div className="doc-logo-lockup">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="doc-logo-img"
                  src="/brand/sano-full-white.png"
                  alt="Sano — Cleaning, done properly"
                />
              </div>
              <div className="doc-identity">
                <h1 className="doc-type">
                  {typeWord}
                  <span className="dot">.</span>
                </h1>
                <dl className="doc-meta-grid">
                  <dt>{numberLabel}</dt>
                  <dd>{meta.number}</dd>
                  <dt>Issued</dt>
                  <dd>{meta.dateIssuedDisplay}</dd>
                  <dt>{meta.trailingDateLabel}</dt>
                  <dd>{meta.trailingDateDisplay}</dd>
                  {meta.referenceLabel && meta.referenceDisplay && (
                    <>
                      <dt>{meta.referenceLabel}</dt>
                      <dd>{meta.referenceDisplay}</dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
          </header>

          {/* Body */}
          <div className="doc-body">
            {/* Parties — From | Billed to / Quote for. */}
            <section className="doc-parties">
              <div>
                <div className="doc-party-eyebrow">From</div>
                <PartyBlock party={fromParty} />
              </div>
              <div>
                <div className="doc-party-eyebrow">{toPartyLabel}</div>
                <PartyBlock party={toParty} />
              </div>
            </section>

            {/* Items — block layout (not a table) so a long service description
                can FLOW across a page break while the priced-line header (No. ·
                name · amount) stays together and clearly associated. */}
            <section className="doc-items-section">
              <div className="doc-items-head">
                <span className="col-no">No.</span>
                <span className="col-desc">Description</span>
                <span className="col-amt">{amountLabel}</span>
              </div>
              {lineItems.map((item, i) => (
                <div className="doc-item" key={`${i}-${item.description}`}>
                  <div className="doc-item-row">
                    <span className="col-no">{String(i + 1).padStart(2, '0')}</span>
                    <span className="col-title">{item.description}</span>
                    <span className="col-amt">{item.amount}</span>
                  </div>
                  {item.subBlocks && item.subBlocks.length > 0 && (
                    <div className="doc-item-detail">
                      {item.subBlocks.map((block) => (
                        <div className="desc-block" key={block.label}>
                          <div className="desc-block-label">{block.label}</div>
                          <div className="desc-block-value">{block.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {item.structuredScope && (
                    <StructuredScopeView scope={item.structuredScope} />
                  )}
                </div>
              ))}
            </section>

          </div>

          {/* Last-page fill spacer. The PDF renderer grows this so the closing
              block below sits at the bottom of the final page. Zero otherwise
              (screen + browser print), so it never affects normal flow or the
              content pagination above. */}
          <div className="doc-endspacer" aria-hidden="true" />

          {/* Closing block — kept together as one unit (break-inside: avoid) so
              a page break can never orphan the footer from the terms/totals. */}
          <div className="doc-closing">
            {/* Totals block — Notes/Payment left, Totals + grand-total right. */}
            <section className="doc-totals-wrap">
              <div className="doc-side-notes">
                {notes && (
                  <>
                    <h4>Notes</h4>
                    <div className="doc-notes-body">{notes}</div>
                  </>
                )}
                {paymentDetails && paymentDetails.length > 0 && (
                  <>
                    <h4>Payment details</h4>
                    <dl className="doc-pay-list">
                      {paymentDetails.map((row) => (
                        <PayRow key={row.label} label={row.label} value={row.value} />
                      ))}
                    </dl>
                  </>
                )}
              </div>

              <div className="doc-totals">
                <div className="doc-total-row">
                  <span>Subtotal (excl. GST)</span>
                  <span className="val">{totals.subtotalExGstDisplay}</span>
                </div>
                <div className="doc-total-row">
                  <span>GST (15%)</span>
                  <span className="val">{totals.gstDisplay}</span>
                </div>
                <div className="doc-total-divider" />
                <div className="doc-grand-total">
                  <span className="label">{grandTotalLabel}</span>
                  <span className="val">{totals.totalDisplay}</span>
                </div>
              </div>
            </section>

          {/* Terms — cream band with sage-100 top border. */}
          <section className="doc-terms">
            <h4>Terms &amp; conditions</h4>
            <p>{termsBody}</p>
          </section>

          {/* Dark footer — contacts + italic thank-you. */}
          <footer className="doc-footer">
            <div className="doc-footer-contacts">
              <span className="doc-footer-item">
                <FooterIcon kind="mail" />
                <span>{footer.email}</span>
              </span>
              <span className="doc-footer-item">
                <FooterIcon kind="phone" />
                <span>{footer.phone}</span>
              </span>
              <span className="doc-footer-item">
                <FooterIcon kind="globe" />
                <span>{footer.website}</span>
              </span>
            </div>
            <div className="doc-footer-thanks">Cleaning, done properly.</div>
          </footer>
          </div>
        </article>

        {interactiveSlot}
      </div>
    </>
  )
}

function StructuredScopeView({ scope }: { scope: DocumentStructuredScope }) {
  const notes = (scope.notes ?? []).filter((n) => n.trim())
  const exclusions = (scope.exclusions ?? []).filter((e) => e.trim())
  return (
    <div className="doc-item-detail doc-scope">
      {scope.intro?.trim() && <p className="doc-scope-intro">{scope.intro}</p>}

      {scope.sections
        .filter((s) => s.heading.trim() || s.items.some((i) => i.trim()))
        .map((section, i) => (
          <div className="doc-scope-section" key={`${i}-${section.heading}`}>
            <div className="doc-scope-heading">{section.heading}</div>
            <ul className="doc-scope-list">
              {section.items.filter((it) => it.trim()).map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
          </div>
        ))}

      {scope.completion?.trim() && (
        <div className="doc-scope-section">
          <div className="doc-scope-heading">Completion approach</div>
          <p className="doc-scope-text">{scope.completion}</p>
        </div>
      )}

      {notes.length > 0 && (
        <div className="doc-scope-section">
          <div className="doc-scope-heading">Important notes</div>
          <ul className="doc-scope-list">
            {notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}

      {exclusions.length > 0 && (
        <div className="doc-scope-section">
          <div className="doc-scope-heading">Exclusions</div>
          <ul className="doc-scope-list">
            {exclusions.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

function PartyBlock({ party }: { party: DocumentParty }) {
  const detailLines: string[] = []
  if (party.company) detailLines.push(party.company)
  if (party.address) detailLines.push(party.address)
  if (party.attn) detailLines.push(`Attn: ${party.attn}`)
  if (party.email) detailLines.push(party.email)
  if (party.phone) detailLines.push(party.phone)
  if (party.gst) detailLines.push(`GST No. ${party.gst}`)
  if (party.reference) detailLines.push(`Reference: ${party.reference}`)

  return (
    <>
      <div className="doc-party-name">{party.name}</div>
      {detailLines.length > 0 && (
        <div className="doc-party-detail">{detailLines.join('\n')}</div>
      )}
    </>
  )
}

function PayRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  )
}

function FooterIcon({ kind }: { kind: 'mail' | 'phone' | 'globe' }) {
  if (kind === 'mail') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="2"
           strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    )
  }
  if (kind === 'phone') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="2"
           strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}
