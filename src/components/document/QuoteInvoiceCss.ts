/**
 * Single source of truth for the standard Sano Quote / Tax Invoice
 * document CSS. Consumed by:
 *
 *   - src/app/portal/quotes/[id]/print/page.tsx          (staff print)
 *   - src/app/portal/invoices/[id]/print/page.tsx        (staff print)
 *   - src/app/share/quote/[token]/page.tsx               (public share)
 *   - src/app/share/invoice/[token]/page.tsx             (public share)
 *
 * The same CSS supports both the screen preview (share/print pages
 * have a soft sage background and the document floats as a centred
 * card) and the PDF / @media print output (the document fills the
 * A4 page edge-to-edge with the gradient header bleeding to the
 * margins).
 *
 * Design reference: Templates/sano-invoice-quote-template.html in the
 * brand-asset repo. Colours pulled into the existing Sano sage palette
 * (`#7EC87A` / `#076653` / `#06231D`) so the document family stays in
 * step with the rest of the brand.
 *
 * PDF rendering note: render-pdf.ts already runs Puppeteer with
 * `preferCSSPageSize: true` and zero outer margins, so `@page` controls
 * the page geometry from inside this CSS. Internal padding on
 * `.doc-body` / `.doc-footer` / `.doc-header` provides the safe area.
 */

export const QUOTE_INVOICE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');

  :root {
    --sano-light: #7EC87A;
    --sano-mid:   #076653;
    --sano-dark:  #06231D;
    --text-main:  #06231D;
    --text-muted: #5C6B64;
    --border:     #E0EAE3;
    --row-tint:   #F7F9F7;
    --screen-bg:  #F7F9F7;
    --accent-pill-bg: rgba(126, 200, 122, 0.16);
  }

  body { margin: 0; }

  /* Screen background — only shows on the share/print pages while
     reading on screen. The PDF render emulateMediaType('print')
     activates @media print further down and the page background
     drops out. */
  .share-page,
  .print-overlay {
    min-height: 100vh;
    background: var(--screen-bg);
    font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 9.75pt;
    line-height: 1.6;
    color: var(--text-main);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    overflow: auto;
  }

  /* The document itself — fills the A4 area on print, floats as a
     centred card on screen. */
  .doc {
    max-width: 210mm;
    margin: 32px auto;
    background: #fff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 8px 40px rgba(6, 35, 29, 0.10);
  }

  /* GRADIENT HEADER — sage-300 → sage-500 → sage-800, with a soft
     decorative circle in the top-right corner. */
  .doc-header {
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg,
      var(--sano-light) 0%,
      var(--sano-mid) 50%,
      var(--sano-dark) 100%);
    padding: 36px 44px 32px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
  }
  .doc-header::after {
    content: '';
    position: absolute;
    right: -80px;
    top: -80px;
    width: 280px;
    height: 280px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 50%;
    pointer-events: none;
  }
  .doc-logo-lockup { position: relative; z-index: 1; }
  .doc-logo-name {
    display: block;
    font-size: 30pt;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.5px;
    color: rgba(255, 255, 255, 0.96);
  }
  .doc-logo-tagline {
    display: block;
    margin-top: 6px;
    font-size: 8.5pt;
    font-weight: 500;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.7);
  }

  .doc-type-badge {
    position: relative;
    z-index: 1;
    text-align: right;
  }
  .doc-type-label {
    font-size: 26pt;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.5px;
    color: rgba(255, 255, 255, 0.96);
  }
  .doc-meta-table {
    margin-top: 10px;
    margin-left: auto;
    border-collapse: collapse;
    font-size: 9pt;
  }
  .doc-meta-table td {
    padding: 2px 0;
    line-height: 1.5;
  }
  .doc-meta-label {
    padding-right: 14px;
    color: rgba(255, 255, 255, 0.65);
    text-align: right;
  }
  .doc-meta-value {
    color: rgba(255, 255, 255, 0.95);
    font-weight: 600;
    text-align: left;
  }

  /* BODY — internal safe-area padding for the print PDF. */
  .doc-body { padding: 36px 44px 4px; }

  /* PARTIES GRID — From / Invoiced To or Quote For. */
  .doc-parties {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 36px;
    margin-bottom: 28px;
  }
  .doc-party-label {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--sano-mid);
    margin-bottom: 8px;
  }
  .doc-party-name {
    font-size: 11pt;
    font-weight: 700;
    color: var(--text-main);
    margin-bottom: 4px;
  }
  .doc-party-line {
    color: var(--text-muted);
    font-size: 9pt;
    line-height: 1.6;
  }

  /* Gradient divider — sage-300 → sage-100 → transparent. */
  .doc-divider {
    height: 1.5px;
    margin: 0 0 28px;
    background: linear-gradient(90deg,
      var(--sano-light) 0%,
      var(--border) 60%,
      transparent 100%);
    border-radius: 2px;
  }

  /* SERVICE SECTION — compact field stack between parties and items. */
  .doc-section { margin-bottom: 24px; }
  .doc-section-title {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--sano-mid);
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--border);
  }
  .doc-field { margin-bottom: 10px; }
  .doc-field-label {
    font-size: 7.5pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    margin-bottom: 2px;
  }
  .doc-field-value {
    font-size: 9.5pt;
    color: var(--text-main);
  }
  .doc-field-value p { margin: 0 0 0.5em; }
  .doc-field-value p:last-child { margin-bottom: 0; }

  /* ITEMS TABLE — dark sage-800 header, alternating row tint. */
  .doc-items {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
    font-size: 9.5pt;
  }
  .doc-items thead tr {
    background: var(--sano-dark);
  }
  .doc-items thead th {
    padding: 11px 14px;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.88);
    text-align: left;
  }
  .doc-items thead th.doc-items-right { text-align: right; }
  .doc-items thead th.doc-items-no { width: 42px; }
  .doc-items tbody tr {
    border-bottom: 1px solid var(--border);
  }
  .doc-items tbody tr:nth-child(even) {
    background: var(--row-tint);
  }
  .doc-items tbody td {
    padding: 10px 14px;
    color: var(--text-main);
    font-size: 9.5pt;
    vertical-align: top;
  }
  .doc-items tbody td.doc-items-no {
    color: var(--text-muted);
    font-size: 8.5pt;
    width: 42px;
    font-variant-numeric: tabular-nums;
  }
  .doc-items tbody td.doc-items-right {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  /* BOTTOM SECTION — Notes/Payment left, Totals right. */
  .doc-bottom {
    display: grid;
    grid-template-columns: 1.05fr 0.95fr;
    gap: 28px;
    margin-bottom: 24px;
  }
  .doc-notes h4,
  .doc-payment h4 {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--sano-mid);
    margin: 0 0 10px;
  }
  .doc-notes-body {
    font-size: 9pt;
    line-height: 1.65;
    color: var(--text-muted);
    white-space: pre-wrap;
  }
  .doc-payment { margin-top: 18px; }
  .doc-payment-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 9pt;
    color: var(--text-muted);
    padding: 3px 0;
  }
  .doc-payment-row strong {
    color: var(--text-main);
    font-weight: 600;
  }

  .doc-totals {
    background: var(--row-tint);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px 22px;
    align-self: start;
  }
  .doc-totals-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    font-size: 9.5pt;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
  .doc-totals-row span:last-child {
    color: var(--text-main);
    font-weight: 600;
  }
  .doc-totals-row.gst-row {
    border-top: 1px solid var(--border);
    margin-top: 4px;
    padding-top: 10px;
  }
  .doc-totals-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    padding: 12px 16px;
    background: var(--sano-dark);
    color: rgba(255, 255, 255, 0.96);
    border-radius: 8px;
    font-size: 11pt;
    font-weight: 800;
    letter-spacing: -0.3px;
    font-variant-numeric: tabular-nums;
  }

  /* TERMS — small block above the dark footer. */
  .doc-terms {
    padding: 20px 44px 24px;
    border-top: 1px solid var(--border);
  }
  .doc-terms-title {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--sano-mid);
    margin-bottom: 8px;
  }
  .doc-terms-text {
    font-size: 8.5pt;
    color: var(--text-muted);
    line-height: 1.65;
    margin-bottom: 4px;
  }
  .doc-terms-text:last-child { margin-bottom: 0; }
  .doc-terms-link {
    color: var(--sano-mid);
    text-decoration: underline;
  }

  /* DARK FOOTER — contact row + thank-you. */
  .doc-footer {
    background: var(--sano-dark);
    padding: 22px 44px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
  }
  .doc-footer-contact {
    display: flex;
    gap: 26px;
    flex-wrap: wrap;
  }
  .doc-footer-item {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 9pt;
    color: rgba(255, 255, 255, 0.72);
  }
  .doc-footer-item strong {
    color: rgba(255, 255, 255, 0.92);
    font-weight: 600;
  }
  .doc-footer-thank {
    font-size: 9.5pt;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.88);
    white-space: nowrap;
  }

  /* SHARE PAGE EXTRAS — only on /share/* pages, not in PDF render. */
  .doc-share-actions {
    max-width: 210mm;
    margin: 16px auto 8px;
    padding: 0 4px;
    display: flex;
    justify-content: flex-end;
  }

  /* PAGE BREAKS — keep totals + sections intact. */
  .doc-parties,
  .doc-section,
  .doc-items,
  .doc-bottom,
  .doc-totals,
  .doc-terms { break-inside: avoid; page-break-inside: avoid; }
  .doc-items tr { break-inside: avoid; }

  /* A4 PAGE — full-bleed via @page margin: 0 + internal safe-area
     padding inside the doc. Matches the design reference template. */
  @page { margin: 0; size: A4; }

  @media print {
    /* Hide screen chrome on PDF render. */
    .share-page,
    .print-overlay {
      position: static;
      background: #fff;
    }
    .doc {
      margin: 0;
      border-radius: 0;
      box-shadow: none;
      max-width: 100%;
    }
    .doc-share-actions { display: none; }
    .accept-panel,
    .pay-now-panel { display: none; }
  }
`
