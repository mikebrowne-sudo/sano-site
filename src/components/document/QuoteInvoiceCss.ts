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
 * have a soft cream background and the document floats as a centred
 * 880px card) and the PDF / @media print output (the document fills
 * the A4 page edge-to-edge, gradient stripe stays under the dark
 * header, soft card chrome drops out).
 *
 * Design reference: the standalone bundled HTML at
 * `F:\Sano\30-Accounting\Templates\Examples\Sano Invoice _ Quote _standalone_.html`
 * (BRAND.md §8 "Invoice / Quote document spec"). Sage palette pinned to
 * #7EC87A / #076653 / #06231D, typography is Poppins (body / UI) +
 * Noto Serif (display / "Invoice." / "Quote." / grand-total value /
 * footer thank-you), per BRAND.md §5.
 *
 * PDF rendering note: render-pdf.ts already runs Puppeteer with
 * `preferCSSPageSize: true` and zero outer margins, so `@page` controls
 * the page geometry from inside this CSS. The internal safe-area
 * padding lives on `.doc-header`, `.doc-body`, `.terms`, `.doc-footer`.
 */

export const QUOTE_INVOICE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Noto+Serif:ital,wght@0,400;0,700;1,400&display=swap');

  :root {
    --sage-50:  #F7F9F7;
    --sage-100: #E0EAE3;
    --sage-200: #A8C5B0;
    --sage-300: #7EC87A;
    --sage-500: #076653;
    --sage-600: #5C6B64;
    --sage-700: #344C3D;
    --sage-800: #06231D;
    --cream:    #faf9f6;
    --white:    #FFFFFF;
    --gray-400: #9CA3AF;

    --font-sans:    'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-display: 'Noto Serif', Georgia, serif;
  }

  /* Page wrappers — .share-page on /share/* surfaces, .print-overlay
     on staff /portal/.../print surfaces. Both share the cream wash +
     centred-card preview, both flatten in @media print. */
  .share-page,
  .print-overlay {
    min-height: 100vh;
    background: var(--cream);
    color: var(--sage-800);
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.5;
    padding: 36px 24px 80px;
    -webkit-font-smoothing: antialiased;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .print-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    overflow: auto;
  }

  /* The document card itself. */
  .doc {
    max-width: 880px;
    margin: 0 auto;
    background: var(--white);
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid var(--sage-100);
    box-shadow:
      0 1px 2px rgba(6, 35, 29, 0.04),
      0 20px 50px -20px rgba(6, 35, 29, 0.18);
  }

  /* ====================== HEADER ====================== */
  .doc-header {
    background: var(--sage-800);
    color: var(--white);
    position: relative;
    padding: 40px 48px 36px;
    overflow: hidden;
  }
  .doc-header::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(circle at 85% 20%, rgba(126,200,122,0.10) 0%, transparent 45%),
      radial-gradient(circle at 5% 110%, rgba(126,200,122,0.06) 0%, transparent 50%);
    pointer-events: none;
  }
  .doc-header::after {
    content: "";
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--sage-300) 0%, var(--sage-500) 60%, transparent 100%);
  }
  .doc-header-row {
    position: relative;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: flex-start;
    gap: 32px;
  }
  .doc-logo-lockup { display: block; }
  .doc-logo-img {
    height: 56px;
    width: auto;
    display: block;
  }

  .doc-identity { text-align: right; }
  .doc-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--sage-300);
    margin-bottom: 8px;
  }
  .doc-type {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 34px;
    line-height: 1;
    letter-spacing: -0.025em;
    color: var(--white);
    margin: 0;
  }
  .doc-type .dot { color: var(--sage-300); }

  .doc-meta-grid {
    margin: 18px 0 0;
    display: grid;
    grid-template-columns: auto auto;
    column-gap: 14px;
    row-gap: 5px;
    justify-content: end;
    font-size: 12.5px;
  }
  .doc-meta-grid dt {
    color: rgba(255,255,255,0.55);
    text-align: right;
    font-weight: 500;
    margin: 0;
  }
  .doc-meta-grid dd {
    color: var(--white);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    text-align: right;
    margin: 0;
  }

  /* ====================== BODY ====================== */
  .doc-body { padding: 40px 48px 8px; }

  /* PARTIES — From | Billed to / Quote for, divided by sage-100 hairline. */
  .doc-parties {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    padding-bottom: 32px;
    border-bottom: 1px solid var(--sage-100);
  }
  .doc-party-eyebrow {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: var(--sage-500);
    margin-bottom: 12px;
  }
  .doc-party-name {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 19px;
    line-height: 1.25;
    color: var(--sage-800);
    margin: 0 0 8px;
    letter-spacing: -0.01em;
  }
  .doc-party-detail {
    font-size: 13.5px;
    line-height: 1.7;
    color: var(--sage-600);
    white-space: pre-line;
  }

  /* ====================== ITEMS (block layout) ======================
     Not a <table>: a long service description must be able to FLOW across a
     page break. The priced-line row (No · name · amount) is kept together and
     visually associated with its detail; only the detail is allowed to break. */
  .doc-items-section { padding-top: 32px; }

  .doc-items-head {
    display: grid;
    grid-template-columns: 38px 1fr 150px;
    column-gap: 16px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--sage-500);
    padding-bottom: 12px;
    border-bottom: 1.5px solid var(--sage-800);
    break-after: avoid; /* keep column labels with the first item */
  }
  .doc-items-head .col-amt { text-align: right; }

  .doc-item { border-bottom: 1px solid var(--sage-100); padding: 16px 0; }
  /* Name + amount + number never split apart, and stay with the start of their
     detail (break-after: avoid), so a page break never orphans a priced line. */
  .doc-item-row {
    display: grid;
    grid-template-columns: 38px 1fr 150px;
    column-gap: 16px;
    align-items: baseline;
    break-inside: avoid;
    break-after: avoid;
  }
  .doc-item-row .col-no {
    color: var(--gray-400);
    font-variant-numeric: tabular-nums;
    font-size: 12.5px;
    font-weight: 500;
  }
  .doc-item-row .col-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--sage-800);
    line-height: 1.5;
  }
  .doc-item-row .col-amt {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    font-size: 14px;
    color: var(--sage-800);
  }

  /* Long detail — service address + description. Flows; may break across pages. */
  .doc-item-detail { margin-top: 12px; padding-left: 54px; } /* aligns under Description */
  .doc-item-detail .desc-block { margin-top: 12px; }
  .doc-item-detail .desc-block:first-child { margin-top: 0; }
  .doc-item-detail .desc-block-label {
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--sage-500);
    margin-bottom: 3px;
  }
  .doc-item-detail .desc-block-value {
    font-size: 12.5px;
    color: var(--sage-600);
    line-height: 1.55;
    white-space: pre-line;
  }

  /* ── Pagination rules ──────────────────────────────────────────────
     Keep small, self-contained sections together; let large content flow.
     (No break-inside:avoid on whole items / terms — those must be free to
     break across pages.) */
  .doc-header { break-inside: avoid; }
  .doc-parties { break-inside: avoid; }
  .doc-totals { break-inside: avoid; }          /* the totals column stays as one block */
  .doc-terms h4 { break-after: avoid; }          /* T&C heading stays with the first of its body */
  .doc-footer { break-inside: avoid; }

  /* ====================== TOTALS ====================== */
  .doc-totals-wrap {
    margin-top: 32px;
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 40px;
    align-items: start;
  }

  .doc-side-notes h4 {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: var(--sage-500);
    margin: 0 0 12px;
  }
  .doc-notes-body {
    font-size: 13.5px;
    line-height: 1.7;
    color: var(--sage-600);
    margin-bottom: 24px;
    white-space: pre-line;
  }
  .doc-pay-list {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 16px;
    row-gap: 6px;
    font-size: 13px;
    line-height: 1.5;
    margin: 0;
  }
  .doc-pay-list dt { color: var(--sage-600); margin: 0; }
  .doc-pay-list dd {
    color: var(--sage-800);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    margin: 0;
  }

  .doc-totals {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .doc-total-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 13.5px;
    color: var(--sage-600);
  }
  .doc-total-row .val {
    font-variant-numeric: tabular-nums;
    color: var(--sage-800);
    font-weight: 500;
  }
  .doc-total-divider {
    height: 1px;
    background: var(--sage-100);
    margin: 4px 0;
  }
  .doc-grand-total {
    margin-top: 8px;
    background: var(--sage-800);
    color: var(--white);
    border-radius: 14px;
    padding: 18px 22px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    position: relative;
    overflow: hidden;
  }
  .doc-grand-total::after {
    content: "";
    position: absolute;
    top: 0; bottom: 0; left: 0;
    width: 4px;
    background: var(--sage-300);
  }
  .doc-grand-total .label {
    font-family: var(--font-sans);
    font-size: 12.5px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: rgba(255,255,255,0.7);
  }
  .doc-grand-total .val {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 26px;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }

  /* ====================== TERMS ====================== */
  .doc-terms {
    margin-top: 40px;
    background: var(--cream);
    border-top: 1px solid var(--sage-100);
    padding: 24px 48px 28px;
  }
  .doc-terms h4 {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: var(--sage-500);
    margin: 0 0 8px;
  }
  .doc-terms p {
    font-size: 12px;
    line-height: 1.7;
    color: var(--sage-600);
    max-width: 70ch;
    margin: 0;
  }

  /* ====================== FOOTER ====================== */
  .doc-footer {
    background: var(--sage-800);
    color: var(--white);
    padding: 24px 48px;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 24px;
    position: relative;
  }
  .doc-footer::before {
    content: "";
    position: absolute;
    left: 0; right: 0; top: 0;
    height: 1px;
    background: rgba(126,200,122,0.25);
  }
  .doc-footer-contacts {
    display: flex;
    gap: 28px;
    flex-wrap: wrap;
    font-size: 12.5px;
  }
  .doc-footer-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: rgba(255,255,255,0.85);
  }
  .doc-footer-item svg {
    flex: none;
    color: var(--sage-300);
  }
  .doc-footer-thanks {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 14px;
    color: rgba(255,255,255,0.75);
    white-space: nowrap;
  }

  /* ====================== SHARE-PAGE EXTRAS ====================== */
  /* Only on screen — not in the PDF. */
  .doc-share-actions {
    max-width: 880px;
    margin: 0 auto 22px;
    display: flex;
    justify-content: flex-end;
  }

  /* ====================== SHARE-PAGE CTA CARD ====================== */
  /* Customer-facing action card rendered directly below the document
     on /share/quote and /share/invoice. Centred, capped width, soft
     border + subtle shadow to match the document chrome above. */
  .accept-panel,
  .pay-panel {
    max-width: 560px;
    margin: 32px auto 0;
    background: var(--white);
    border: 1px solid var(--sage-100);
    border-radius: 18px;
    box-shadow:
      0 1px 2px rgba(6, 35, 29, 0.04),
      0 20px 50px -28px rgba(6, 35, 29, 0.14);
    padding: 32px 36px;
    text-align: center;
  }

  .accept-title,
  .pay-title {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 700;
    color: var(--sage-800);
    letter-spacing: -0.01em;
  }

  .accept-sub,
  .pay-sub {
    margin: 0 0 24px;
    color: var(--sage-600);
    font-size: 14px;
    line-height: 1.55;
  }

  .accept-checkbox-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin: 0 auto 24px;
    text-align: left;
    font-size: 14px;
    color: var(--sage-700);
    cursor: pointer;
    max-width: 420px;
  }
  .accept-checkbox {
    flex: none;
    margin-top: 3px;
    width: 18px;
    height: 18px;
    accent-color: var(--sage-500);
    cursor: pointer;
  }
  .accept-link {
    color: var(--sage-500);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .accept-link:hover { color: var(--sage-700); }

  .pay-amount-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    margin: 0 0 24px;
    padding: 18px 0;
    background: var(--cream);
    border-radius: 12px;
  }
  .pay-amount-label {
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.12em;
    color: var(--sage-600);
  }
  .pay-amount-value {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 700;
    color: var(--sage-800);
  }

  .accept-button,
  .pay-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px 24px;
    background: var(--sage-500);
    color: var(--white);
    font-family: var(--font-sans);
    font-size: 15px;
    font-weight: 600;
    border: 0;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.15s ease, box-shadow 0.15s ease;
    box-shadow: 0 6px 18px -8px rgba(7, 102, 83, 0.55);
  }
  .accept-button:hover:not(:disabled),
  .pay-button:hover:not(:disabled) {
    background: var(--sage-700);
  }
  .accept-button:disabled,
  .pay-button:disabled {
    background: var(--sage-200);
    cursor: not-allowed;
    box-shadow: none;
  }

  .accept-error,
  .pay-error {
    margin: 16px 0 0;
    color: #b3261e;
    font-size: 13px;
  }

  .pay-cancelled {
    margin: 0 0 18px;
    padding: 10px 14px;
    background: #fff7ed;
    color: #92400e;
    border-radius: 10px;
    font-size: 13px;
  }

  .accept-done,
  .pay-done {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .accept-done-icon,
  .pay-done-icon {
    color: var(--sage-500);
    margin-bottom: 10px;
  }
  .accept-done-title,
  .pay-done-title {
    margin: 0 0 6px;
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    color: var(--sage-800);
  }
  .accept-done-sub,
  .pay-done-sub {
    margin: 0 0 4px;
    color: var(--sage-600);
    font-size: 14px;
    line-height: 1.55;
  }

  @media (max-width: 480px) {
    .accept-panel,
    .pay-panel {
      padding: 26px 22px;
      margin: 24px auto 0;
      border-radius: 16px;
    }
    .accept-title,
    .pay-title { font-size: 21px; }
    .pay-amount-value { font-size: 28px; }
  }

  /* Keep critical sections together when paginating to a multi-page PDF. */
  .doc-parties,
  .doc-totals-wrap,
  .doc-grand-total,
  .doc-terms,
  .doc-footer { break-inside: avoid; page-break-inside: avoid; }
  .doc-items tr { break-inside: avoid; page-break-inside: avoid; }

  /* ====================== PRINT ====================== */
  @page { size: A4; margin: 0; }

  @media print {
    html, body { background: var(--white); padding: 0; margin: 0; }
    .share-page,
    .print-overlay {
      position: static;
      background: var(--white);
      padding: 0;
      /* Drop the screen-only 100vh wrapper height so .doc below
         controls the page-fill behaviour directly. */
      min-height: 0;
    }
    .doc {
      max-width: 100%;
      margin: 0;
      border-radius: 0;
      border: none;
      box-shadow: none;
      /* overflow:hidden is needed in screen mode to clip the rounded
         corners, but in print it makes Chromium treat the whole
         article as a single atomic box and push it to a fresh page
         when its natural height exceeds A4 — the cause of "page 1
         empty, doc starts on page 2". Reset here so pagination
         works normally. */
      overflow: visible;
      /* Flex column with a one-page min-height lets .doc-footer
         below use margin-top:auto to anchor itself to the bottom
         of the final page on single-page documents. On multi-page
         documents the doc naturally exceeds 100vh and the footer
         sits at the end of content. */
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .doc-terms {
      /* Tighter spacing keeps terms closer to totals so they're
         more likely to stay on the same page. */
      margin-top: 24px;
      /* break-inside:avoid on terms (defined above for screen) was
         forcing terms + footer onto a fresh page whenever they
         couldn't fit as a unit, producing a near-empty final page
         with footer near the top. Allow natural flow in print. */
      break-inside: auto;
      page-break-inside: auto;
    }
    .doc-footer {
      /* Anchor footer to the bottom of the final page on
         single-page documents (paired with .doc's flex column +
         100vh min-height above). Harmless on multi-page docs —
         the auto margin only takes effect when there's slack. */
      margin-top: auto;
    }
    .doc-share-actions { display: none !important; }
    .accept-panel,
    .pay-panel { display: none !important; }
  }
`
