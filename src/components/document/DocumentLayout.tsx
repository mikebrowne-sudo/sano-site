import type { ReactNode } from 'react'
import { QUOTE_INVOICE_CSS } from './QuoteInvoiceCss'

/**
 * Shared chrome for the standard Sano Quote / Tax Invoice document.
 * Consumed by `QuoteDocument` and `InvoiceDocument`. Pages just supply
 * a `<wrapper>` (either `.share-page` for /share/* surfaces or
 * `.print-overlay` for /portal/.../print surfaces) — the document
 * card itself is identical.
 */

export type DocumentKind = 'quote' | 'invoice'

export interface DocumentParty {
  /** Bold first-line name. */
  name: string
  /** Optional company line beneath the name. */
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
  /** Document number (e.g. QUO-0081, INV-0062). */
  number: string
  /** Issue date formatted for display. */
  dateIssuedDisplay: string
  /** Trailing date label ("Valid until" for quote, "Due" for invoice). */
  trailingDateLabel: string
  /** Trailing date formatted for display. */
  trailingDateDisplay: string
}

export interface DocumentService {
  description?: string | null
  serviceAddress?: string | null
  scheduledDateDisplay?: string | null
}

export interface DocumentLineItem {
  description: string
  /** Formatted dollar amount, e.g. "$120.00" or "-$50.00". */
  amount: string
}

export interface DocumentTotals {
  subtotalExGstDisplay: string
  gstDisplay: string
  totalDisplay: string
}

export interface DocumentTerms {
  /** Primary terms paragraph (varies by payment_type). */
  primary: string
  /** Optional supporting line. */
  secondary?: string
  /** Anchor text + href for the agreement/terms link. */
  agreementLabel: string
  agreementHref: string
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
  /** Wrapping class. Use `'share-page'` on share routes or
   * `'print-overlay'` on the staff portal print routes. */
  wrapper: 'share-page' | 'print-overlay'
  /** Document type (selects title + party labels + payment section visibility). */
  kind: DocumentKind
  /** Header metadata: number + dates. */
  meta: DocumentMeta
  /** From / To parties. */
  fromParty: DocumentParty
  toParty: DocumentParty
  /** Service section content (description, address, scheduled date). */
  service?: DocumentService
  /** Line items rendered in the items table. */
  lineItems: ReadonlyArray<DocumentLineItem>
  /** Notes block (free text). Optional. */
  notes?: string | null
  /** Invoice-only Payment Details block. Pass null/undefined for quotes. */
  paymentDetails?: ReadonlyArray<{ label: string; value: string }>
  /** Totals (subtotal, gst, total). */
  totals: DocumentTotals
  /** Terms block. */
  terms: DocumentTerms
  /** Dark footer content. */
  footer: DocumentFooter
  /** Optional interactive slot (AcceptQuote / PayNowButton) — only
   * rendered on share pages, hidden on PDF render. */
  interactiveSlot?: ReactNode
  /** Optional share-page actions row (PDF download button) — only
   * rendered on share pages, hidden on PDF render. */
  shareActionsSlot?: ReactNode
}

export function DocumentLayout({
  wrapper,
  kind,
  meta,
  fromParty,
  toParty,
  service,
  lineItems,
  notes,
  paymentDetails,
  totals,
  terms,
  footer,
  interactiveSlot,
  shareActionsSlot,
}: DocumentLayoutProps) {
  const isQuote = kind === 'quote'
  const typeLabel = isQuote ? 'QUOTE' : 'INVOICE'
  const toPartyLabel = isQuote ? 'Quote for' : 'Invoiced to'

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: QUOTE_INVOICE_CSS }} />
      <div className={wrapper}>
        {shareActionsSlot && <div className="doc-share-actions">{shareActionsSlot}</div>}

        <article className="doc">
          {/* Gradient header */}
          <header className="doc-header">
            <div className="doc-logo-lockup">
              <span className="doc-logo-name">sano</span>
              <span className="doc-logo-tagline">Clean spaces · Healthy living</span>
            </div>
            <div className="doc-type-badge">
              <div className="doc-type-label">{typeLabel}</div>
              <table className="doc-meta-table">
                <tbody>
                  <tr>
                    <td className="doc-meta-label">Number</td>
                    <td className="doc-meta-value">{meta.number}</td>
                  </tr>
                  <tr>
                    <td className="doc-meta-label">Date</td>
                    <td className="doc-meta-value">{meta.dateIssuedDisplay}</td>
                  </tr>
                  <tr>
                    <td className="doc-meta-label">{meta.trailingDateLabel}</td>
                    <td className="doc-meta-value">{meta.trailingDateDisplay}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </header>

          {/* Body */}
          <div className="doc-body">
            {/* Parties */}
            <div className="doc-parties">
              <PartyBlock label="From" party={fromParty} />
              <PartyBlock label={toPartyLabel} party={toParty} />
            </div>

            <div className="doc-divider" aria-hidden="true" />

            {/* Service section */}
            {service && (service.description || service.serviceAddress || service.scheduledDateDisplay) && (
              <section className="doc-section">
                <h2 className="doc-section-title">Service</h2>
                {service.description && (
                  <div className="doc-field">
                    <div className="doc-field-label">Service description</div>
                    <div className="doc-field-value">
                      {service.description.split('\n\n').map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  </div>
                )}
                {service.serviceAddress && (
                  <div className="doc-field">
                    <div className="doc-field-label">Service address</div>
                    <div className="doc-field-value">{service.serviceAddress}</div>
                  </div>
                )}
                {service.scheduledDateDisplay && (
                  <div className="doc-field">
                    <div className="doc-field-label">Scheduled date</div>
                    <div className="doc-field-value">{service.scheduledDateDisplay}</div>
                  </div>
                )}
              </section>
            )}

            {/* Items table */}
            <table className="doc-items">
              <thead>
                <tr>
                  <th className="doc-items-no">No.</th>
                  <th>Description</th>
                  <th className="doc-items-right" style={{ width: 120 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <tr key={`${i}-${item.description}`}>
                    <td className="doc-items-no">{String(i + 1).padStart(2, '0')}</td>
                    <td>{item.description}</td>
                    <td className="doc-items-right">{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Bottom section: notes/payment | totals */}
            <div className="doc-bottom">
              <div>
                {notes && (
                  <div className="doc-notes">
                    <h4>Notes</h4>
                    <div className="doc-notes-body">{notes}</div>
                  </div>
                )}
                {paymentDetails && paymentDetails.length > 0 && (
                  <div className="doc-payment">
                    <h4>Payment details</h4>
                    {paymentDetails.map((row) => (
                      <div key={row.label} className="doc-payment-row">
                        <span>{row.label}</span>
                        <strong>{row.value}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="doc-totals">
                <div className="doc-totals-row">
                  <span>Subtotal (excl. GST)</span>
                  <span>{totals.subtotalExGstDisplay}</span>
                </div>
                <div className="doc-totals-row gst-row">
                  <span>GST (15%)</span>
                  <span>{totals.gstDisplay}</span>
                </div>
                <div className="doc-totals-total">
                  <span>Total (incl. GST)</span>
                  <span>{totals.totalDisplay}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
          <section className="doc-terms">
            <h4 className="doc-terms-title">Terms &amp; conditions</h4>
            <p className="doc-terms-text">{terms.primary}</p>
            {terms.secondary && <p className="doc-terms-text">{terms.secondary}</p>}
            <p className="doc-terms-text" style={{ marginTop: 8 }}>
              {isQuote
                ? 'By accepting this quote you agree to our '
                : 'By making payment you confirm acceptance of our '}
              <a
                href={terms.agreementHref}
                target="_blank"
                rel="noopener noreferrer"
                className="doc-terms-link"
              >
                {terms.agreementLabel}
              </a>
              .
            </p>
          </section>

          {/* Dark footer */}
          <footer className="doc-footer">
            <div className="doc-footer-contact">
              <span className="doc-footer-item">
                <FooterIcon kind="email" />
                <strong>{footer.email}</strong>
              </span>
              <span className="doc-footer-item">
                <FooterIcon kind="phone" />
                <strong>{footer.phone}</strong>
              </span>
              <span className="doc-footer-item">
                <FooterIcon kind="web" />
                <strong>{footer.website}</strong>
              </span>
            </div>
            <span className="doc-footer-thank">Thank you for your business ✦</span>
          </footer>
        </article>

        {interactiveSlot}
      </div>
    </>
  )
}

function PartyBlock({ label, party }: { label: string; party: DocumentParty }) {
  return (
    <div>
      <div className="doc-party-label">{label}</div>
      <div className="doc-party-name">{party.name}</div>
      {party.company && <div className="doc-party-line">{party.company}</div>}
      {party.address && (
        <div className="doc-party-line" style={{ whiteSpace: 'pre-line' }}>
          {party.address}
        </div>
      )}
      {party.attn && <div className="doc-party-line">Attn: {party.attn}</div>}
      {party.phone && <div className="doc-party-line">Phone: {party.phone}</div>}
      {party.email && <div className="doc-party-line">Email: {party.email}</div>}
      {party.gst && <div className="doc-party-line">GST: {party.gst}</div>}
      {party.reference && (
        <div className="doc-party-line" style={{ marginTop: 6 }}>
          Your reference: <strong style={{ color: 'var(--text-main)' }}>{party.reference}</strong>
        </div>
      )}
    </div>
  )
}

function FooterIcon({ kind }: { kind: 'email' | 'phone' | 'web' }) {
  const stroke = 'rgba(255,255,255,0.72)'
  if (kind === 'email') {
    return (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path
          d="M2 2.5h10a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1v-7a1 1 0 011-1zm0 0l5 5 5-5"
          stroke={stroke}
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (kind === 'phone') {
    return (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path
          d="M11.5 9.5c-.8-.8-1.7-1.3-2.5-.5l-.8.8c-.5.5-2-1-3-2s-2.5-2.5-2-3l.8-.8C4.7 3.2 4.2 2.3 3.4 1.5 2.6.7 2 .8 1.4 1.4L.8 2C-.3 3.1 1 7 4.5 10.5S10.9 14.3 12 13.2l.6-.6c.6-.6.7-1.3-.1-2.1z"
          stroke={stroke}
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="6" r="3" stroke={stroke} strokeWidth="1.3" />
      <path
        d="M7 13c2-2 5-4 5-7A5 5 0 002 6c0 3 3 5 5 7z"
        stroke={stroke}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}
