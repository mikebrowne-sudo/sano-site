// Proposal Phase 1 — co-located stylesheet.
//
// All proposal styles in one place. Using plain CSS via a single
// <style> injection rather than Tailwind utility classes because:
//   1. Print/PDF engines render predictable, document-scoped CSS more
//      reliably than utility-soup with media queries baked in.
//   2. The proposal must look identical in screen preview, browser
//      print preview, and any future headless-Chromium PDF render.
//
// Sano brand greens used: #06231D (deep), #076653 (primary), with
// neutrals tuned for print contrast.

export const PROPOSAL_CSS = `
:root {
  --sano-deep: #06231D;
  --sano-primary: #076653;
  --sano-accent: #7EC87A;
  --sano-ink: #1a1a1a;
  --sano-muted: #5C6B64;
  --sano-faint: #9AA5A0;
  --sano-line: #E5E9EE;
  --sano-paper: #FFFFFF;
}

.proposal-document {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f5f5f5;
  color: var(--sano-ink);
  padding: 24px 0;
}

/* ── Page wrapper ───────────────────────────────────────────── */

.proposal-page {
  position: relative;
  width: 210mm;
  height: 297mm;
  margin: 0 auto 16px;
  background: var(--sano-paper);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.proposal-page__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16mm 18mm 24mm;  /* leaves room for fixed footer */
  overflow: hidden;
}

/* ── Header ─────────────────────────────────────────────────── */

.proposal-header {
  position: relative;
  height: 26mm;
  flex-shrink: 0;
  overflow: hidden;
  color: #fff;
}
.proposal-header__bg {
  position: absolute; inset: 0;
  background-size: cover;
  background-position: center;
  filter: brightness(0.55);
}
.proposal-header__overlay {
  position: absolute; inset: 0;
  background: linear-gradient(
    90deg,
    rgba(6, 35, 29, 0.85) 0%,
    rgba(6, 35, 29, 0.55) 50%,
    rgba(6, 35, 29, 0.35) 100%
  );
}
.proposal-header__content {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18mm;
}
.proposal-header__logo {
  height: 14mm;
  width: auto;
  object-fit: contain;
}
.proposal-header__title {
  font-size: 13pt;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* ── Footer ─────────────────────────────────────────────────── */

.proposal-footer {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 14mm;
  padding: 0 18mm;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--sano-line);
  background: var(--sano-paper);
  color: var(--sano-muted);
  font-size: 9pt;
}
.proposal-footer__contact {
  display: flex;
  align-items: center;
  gap: 6px;
}
.proposal-footer__sep { color: var(--sano-faint); }
.proposal-footer__page { font-variant-numeric: tabular-nums; color: var(--sano-faint); }

/* ── Cover ──────────────────────────────────────────────────── */

.proposal-cover {
  position: relative;
  flex: 1;
  display: flex;
  align-items: stretch;
  margin: 0 -18mm;        /* full-bleed inside the body padding */
  margin-bottom: -24mm;   /* extends to footer line */
}
.proposal-cover__bg {
  position: absolute; inset: 0;
  background-size: cover;
  background-position: center;
}
.proposal-cover__panel {
  position: relative;
  width: 56%;
  background: linear-gradient(
    180deg,
    rgba(6, 35, 29, 0.94) 0%,
    rgba(6, 35, 29, 0.92) 100%
  );
  color: #fff;
  padding: 22mm 18mm 28mm;  /* extra bottom padding to clear footer */
  display: flex;
  flex-direction: column;
}
.proposal-cover__logo {
  height: 18mm;
  width: auto;
  object-fit: contain;
  margin-bottom: 18mm;
}
.proposal-cover__top-meta {
  font-size: 10pt;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--sano-accent);
  margin-bottom: 10mm;
}
.proposal-cover__title {
  font-size: 28pt;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.01em;
  margin: 0 0 12mm;
}
.proposal-cover__fields {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6mm;
}
.proposal-cover__fields > div {
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  padding-top: 3mm;
}
.proposal-cover__fields dt {
  font-size: 8.5pt;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 1.5mm;
}
.proposal-cover__fields dd {
  margin: 0;
  font-size: 12pt;
  font-weight: 500;
  color: #fff;
}
.proposal-cover__footer-block {
  margin-top: auto;
  font-size: 9pt;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.04em;
}

/* ── Inner page content ─────────────────────────────────────── */

.proposal-content {
  display: flex;
  flex-direction: column;
}
.proposal-content--prose {
  max-width: 150mm;
}

.proposal-eyebrow {
  font-size: 8.5pt;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--sano-primary);
  margin: 0 0 4mm;
  font-weight: 600;
}
.proposal-h2 {
  font-size: 22pt;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--sano-deep);
  margin: 0 0 8mm;
  line-height: 1.15;
}
.proposal-h3 {
  font-size: 11pt;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--sano-primary);
  margin: 0 0 4mm;
}
.proposal-lead {
  font-size: 11pt;
  line-height: 1.65;
  color: var(--sano-muted);
  margin: 0 0 8mm;
}

/* Callouts (executive summary) */
.proposal-callout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4mm;
  margin-top: 6mm;
}
.proposal-callout {
  border: 1px solid var(--sano-line);
  border-radius: 4px;
  padding: 5mm 6mm;
  background: #FAFBFC;
}
.proposal-callout__label {
  font-size: 8pt;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--sano-faint);
  margin-bottom: 2mm;
}
.proposal-callout__value {
  font-size: 11pt;
  color: var(--sano-deep);
  font-weight: 500;
  line-height: 1.4;
}

/* Service-overview meta grid */
.proposal-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 0;
  border: 1px solid var(--sano-line);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8mm;
}
.proposal-meta-cell {
  padding: 5mm 5mm;
  border-right: 1px solid var(--sano-line);
}
.proposal-meta-cell:last-child { border-right: 0; }
.proposal-meta-cell__label {
  font-size: 7.5pt;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sano-faint);
  margin-bottom: 1.5mm;
}
.proposal-meta-cell__value {
  font-size: 10.5pt;
  color: var(--sano-deep);
  font-weight: 600;
}

/* Checklist + scope lists */
.proposal-checklist {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3mm 8mm;
}
.proposal-checklist li {
  position: relative;
  padding-left: 6mm;
  font-size: 10pt;
  color: var(--sano-ink);
  line-height: 1.55;
}
.proposal-checklist li::before {
  content: '';
  position: absolute;
  left: 0; top: 1.5mm;
  width: 3mm; height: 3mm;
  background: var(--sano-primary);
  border-radius: 2px;
  -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="white" d="M6.4 11.4 3 8l1.4-1.4 2 2 5.2-5.2L13 4.8z"/></svg>') center / 80% no-repeat;
          mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="white" d="M6.4 11.4 3 8l1.4-1.4 2 2 5.2-5.2L13 4.8z"/></svg>') center / 80% no-repeat;
}
.proposal-checklist--compact li { font-size: 9.5pt; }

.proposal-scope-stack { display: flex; flex-direction: column; gap: 6mm; }
.proposal-scope-section {
  border: 1px solid var(--sano-line);
  border-radius: 4px;
  padding: 5mm 6mm;
}
.proposal-scope-section__title {
  font-size: 11pt;
  font-weight: 700;
  color: var(--sano-deep);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin: 0 0 3mm;
}
.proposal-scope-section__list {
  margin: 0;
  padding-left: 5mm;
  display: flex;
  flex-direction: column;
  gap: 1.5mm;
}
.proposal-scope-section__list li {
  font-size: 10pt;
  color: var(--sano-ink);
  line-height: 1.5;
}

/* Pricing card — restrained per brief */
.proposal-pricing-card {
  background: linear-gradient(135deg, #06231D 0%, #0a3d31 100%);
  color: #fff;
  border-radius: 4px;
  padding: 10mm 12mm;
  margin-bottom: 8mm;
  max-width: 130mm;
}
.proposal-pricing-card__label {
  font-size: 9pt;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 3mm;
}
.proposal-pricing-card__amount {
  font-size: 22pt;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin-bottom: 4mm;
  font-variant-numeric: tabular-nums;
}
.proposal-pricing-card__note {
  font-size: 9.5pt;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.78);
}
.proposal-pricing-context { max-width: 150mm; }

/* Terms prose */
.proposal-prose {
  font-size: 10pt;
  line-height: 1.65;
  color: var(--sano-ink);
  max-width: 150mm;
}
.proposal-prose h3 {
  font-size: 10.5pt;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--sano-primary);
  margin: 6mm 0 2mm;
  font-weight: 600;
}
.proposal-prose p { margin: 0 0 3mm; }
.proposal-prose ul { margin: 0 0 3mm; padding-left: 5mm; }
.proposal-prose li { margin-bottom: 1mm; }

/* ── Print ──────────────────────────────────────────────────── */

@media print {
  html, body { background: #fff !important; margin: 0; padding: 0; }
  .proposal-document { background: #fff; padding: 0; }
  .proposal-page {
    box-shadow: none;
    margin: 0;
    page-break-after: always;
    page-break-inside: avoid;
  }
  .proposal-page:last-child { page-break-after: auto; }

  @page {
    size: A4;
    margin: 0;
  }
}
`
