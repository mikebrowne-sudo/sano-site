// Proposal Phase 1 — co-located stylesheet.
//
// All proposal styles in one place. Plain CSS in a single <style>
// injection (not Tailwind utilities) because:
//   1. Print/PDF engines render document-scoped CSS more reliably.
//   2. The proposal must look identical in screen preview, browser
//      print preview, and any future headless-Chromium PDF render.
//
// ── Brand guidelines alignment ───────────────────────────────────────
// Aligned to the Sano Branding Guidelines (2026-04-24):
//   • Primary: #0F1113 charcoal + #FFFFFF white. These are the only
//     structural colours.
//   • Sano green used sparingly as an ACCENT only (eyebrows, single
//     highlight). Never for dark surfaces or headings.
//   • Headings: consistent size across all pages. No decorative-large
//     titles.
//   • Body: ~13–14px equivalent (≈10pt in print). Max 4–5 lines per
//     paragraph — enforced by content authors, not CSS.
//   • Alignment: everything left. No centered body content anywhere.
//   • Header: fixed component, identical height + padding + logo size
//     + title placement + gradient on every page.
//   • Footer: fixed component, absolute-bottom, identical on every page.
//   • Imagery: one consistent commercial-interior image across every
//     page so the cover and inner headers feel like the same building.
//   • No gradients outside the defined header + cover overlays.
//
// If any rule here changes, update it once — do NOT override per page.

export const PROPOSAL_CSS = `
:root {
  /* Primary surface palette (brand guidelines) */
  --sano-dark:    #0F1113;   /* near-black / charcoal — all dark surfaces */
  --sano-paper:   #FFFFFF;

  /* Ink scale */
  --sano-ink:     #0F1113;   /* body text on light */
  --sano-ink-2:   #3A3D40;   /* muted body */
  --sano-muted:   #6B6F72;   /* supporting text / labels */
  --sano-faint:   #A4A7AA;   /* ghost labels, page numbers */
  --sano-line:    #E5E6E8;   /* hairlines + card borders */

  /* Accent — used sparingly */
  --sano-accent:  #076653;   /* Sano green. Eyebrows only + one cover
                                tagline. Never a surface fill. */
}

.proposal-document {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f5f5f5;
  color: var(--sano-ink);
  padding: 24px 0;
}

/* ── Page wrapper ────────────────────────────────────────────── */
/* A4 portrait. Margins are built into the body padding so every
   page has identical rhythm — rule: "Margins: Consistent across
   all pages." */

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
  padding: 16mm 18mm 24mm;  /* clears fixed footer */
  overflow: hidden;
}

/* ── Header (FIXED COMPONENT) ────────────────────────────────── */
/* Must not change size, padding, logo placement, or title
   placement between pages. Only the section title changes. */

.proposal-header {
  position: relative;
  height: 32mm;              /* fixed — per guidelines */
  flex-shrink: 0;
  overflow: hidden;
  color: #fff;
}
.proposal-header__bg {
  position: absolute; inset: 0;
  background-size: cover;
  background-position: center;
  filter: brightness(0.5);
}
.proposal-header__overlay {
  position: absolute; inset: 0;
  /* Left-to-right dark gradient — per guidelines */
  background: linear-gradient(
    90deg,
    rgba(15, 17, 19, 0.92) 0%,
    rgba(15, 17, 19, 0.72) 55%,
    rgba(15, 17, 19, 0.45) 100%
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
  height: 13mm;              /* fixed — same on every page */
  width: auto;
  object-fit: contain;
}
.proposal-header__title {
  font-size: 11pt;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #fff;
}

/* ── Footer (FIXED COMPONENT) ────────────────────────────────── */
/* Absolute bottom. Identical height, padding, and content on
   every page. Page number right-aligned. */

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
  font-size: 8.5pt;
  letter-spacing: 0.02em;
}
.proposal-footer__contact {
  display: flex;
  align-items: center;
  gap: 6px;
}
.proposal-footer__sep { color: var(--sano-faint); }
.proposal-footer__page { font-variant-numeric: tabular-nums; color: var(--sano-faint); }

/* ── Cover ───────────────────────────────────────────────────── */

.proposal-cover {
  position: relative;
  flex: 1;
  display: flex;
  align-items: stretch;
  margin: 0 -18mm;
  margin-bottom: -24mm;
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
    rgba(15, 17, 19, 0.96) 0%,
    rgba(15, 17, 19, 0.94) 100%
  );
  color: #fff;
  padding: 22mm 18mm 28mm;
  display: flex;
  flex-direction: column;
}
.proposal-cover__logo {
  height: 16mm;
  width: auto;
  object-fit: contain;
  margin-bottom: 18mm;
}
.proposal-cover__top-meta {
  font-size: 9pt;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--sano-accent);  /* sparing accent — single tagline */
  margin-bottom: 10mm;
  font-weight: 600;
}
.proposal-cover__title {
  font-size: 24pt;            /* consistent with inner-page h2 scale */
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.01em;
  margin: 0 0 14mm;
  color: #fff;
}
.proposal-cover__fields {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6mm;
}
.proposal-cover__fields > div {
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  padding-top: 3mm;
}
.proposal-cover__fields dt {
  font-size: 8pt;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 1.5mm;
  font-weight: 500;
}
.proposal-cover__fields dd {
  margin: 0;
  font-size: 11pt;
  font-weight: 500;
  color: #fff;
  line-height: 1.4;
}
.proposal-cover__footer-block {
  margin-top: auto;
  font-size: 8.5pt;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 0.04em;
}

/* ── Inner page content ──────────────────────────────────────── */

.proposal-content {
  display: flex;
  flex-direction: column;
}
.proposal-content--prose {
  max-width: 155mm;
}

/* Typography scale — LOCKED. Do not vary between pages.
   • h2 (page title):  18pt bold
   • h3 (subsection):   9.5pt semibold caps
   • eyebrow:           8pt accent caps
   • lead / body:       10pt (~13.3px)
   • supporting:        8.5pt
*/
.proposal-eyebrow {
  font-size: 8pt;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--sano-accent);  /* sparing accent use */
  margin: 0 0 5mm;
  font-weight: 600;
}
.proposal-h2 {
  font-size: 18pt;
  font-weight: 700;
  letter-spacing: -0.005em;
  color: var(--sano-ink);
  margin: 0 0 8mm;
  line-height: 1.2;
}
.proposal-h3 {
  font-size: 9.5pt;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sano-ink);
  margin: 0 0 4mm;
}
.proposal-lead {
  font-size: 10pt;
  line-height: 1.65;
  color: var(--sano-ink-2);
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
  border-radius: 2px;
  padding: 5mm 6mm;
  background: var(--sano-paper);
}
.proposal-callout__label {
  font-size: 7.5pt;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sano-muted);
  margin-bottom: 2mm;
  font-weight: 500;
}
.proposal-callout__value {
  font-size: 10.5pt;
  color: var(--sano-ink);
  font-weight: 500;
  line-height: 1.4;
}

/* Service-overview meta grid */
.proposal-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 0;
  border: 1px solid var(--sano-line);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8mm;
}
.proposal-meta-cell {
  padding: 5mm 5mm;
  border-right: 1px solid var(--sano-line);
}
.proposal-meta-cell:last-child { border-right: 0; }
.proposal-meta-cell__label {
  font-size: 7pt;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--sano-muted);
  margin-bottom: 1.5mm;
  font-weight: 500;
}
.proposal-meta-cell__value {
  font-size: 10pt;
  color: var(--sano-ink);
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
  padding-left: 5mm;
  font-size: 10pt;
  color: var(--sano-ink);
  line-height: 1.55;
}
.proposal-checklist li::before {
  content: '';
  position: absolute;
  left: 0; top: 2mm;
  width: 2.5mm; height: 2.5mm;
  background: var(--sano-ink);
  border-radius: 1px;
  -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="white" d="M6.4 11.4 3 8l1.4-1.4 2 2 5.2-5.2L13 4.8z"/></svg>') center / 80% no-repeat;
          mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="white" d="M6.4 11.4 3 8l1.4-1.4 2 2 5.2-5.2L13 4.8z"/></svg>') center / 80% no-repeat;
}
.proposal-checklist--compact li { font-size: 9.5pt; }

.proposal-scope-stack { display: flex; flex-direction: column; gap: 5mm; }
.proposal-scope-section {
  border: 1px solid var(--sano-line);
  border-radius: 2px;
  padding: 5mm 6mm;
}
.proposal-scope-section__title {
  font-size: 9.5pt;
  font-weight: 600;
  color: var(--sano-ink);
  letter-spacing: 0.14em;
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

/* Pricing card — "prominent but not oversized" per brand spec.
   Dark surface uses --sano-dark (not Sano green) so it reads as a
   structural emphasis, not a decorative highlight. */
.proposal-pricing-card {
  background: var(--sano-dark);
  color: #fff;
  border-radius: 2px;
  padding: 8mm 10mm;
  margin-bottom: 8mm;
  max-width: 120mm;
}
.proposal-pricing-card__label {
  font-size: 8pt;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 3mm;
  font-weight: 500;
}
.proposal-pricing-card__amount {
  font-size: 18pt;            /* matches h2 scale — consistent */
  font-weight: 700;
  letter-spacing: -0.01em;
  margin-bottom: 3mm;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.proposal-pricing-card__note {
  font-size: 9pt;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.72);
}
.proposal-pricing-context { max-width: 155mm; }

/* Terms prose */
.proposal-prose {
  font-size: 10pt;
  line-height: 1.65;
  color: var(--sano-ink);
  max-width: 155mm;
}
.proposal-prose h3 {
  font-size: 9.5pt;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sano-ink);
  margin: 6mm 0 2mm;
  font-weight: 600;
}
.proposal-prose p { margin: 0 0 3mm; }
.proposal-prose ul { margin: 0 0 3mm; padding-left: 5mm; }
.proposal-prose li { margin-bottom: 1mm; }

/* ── Print ───────────────────────────────────────────────────── */

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
