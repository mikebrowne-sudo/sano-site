// Proposal — locked brand stylesheet.
//
// Single CSS payload for the entire proposal template. Matches the
// Sano proposal design system 2026-04-24:
//
//   PRIMARY  #0F1113 (charcoal)  +  #FFFFFF (white)
//   ACCENT   #6FBF4A (Sano green) — used sparingly
//   SUPPORT  #F5F5F5  #E5E5E5  #6B7280
//   FONT     Inter, Arial, sans-serif
//   BASE     8px spacing grid — 8 / 16 / 24 / 32 / 48
//
// Typography — LOCKED, no drift between pages:
//   Cover title           56px / 700
//   Cover tagline (green) 11px / 600 / uppercase / tracking 0.1em
//   Cover body            16px / 400
//   Page title (h2)       30px / 600
//   Section header (h3)   14px / 600 / uppercase / tracking 0.08em
//   Body                  13.5px / 400 / line-height 1.6
//   Labels (grey)         11px / 500 / uppercase / tracking 0.08em
//
// Updating any rule: change it here once — never override per page.

export const PROPOSAL_CSS = `
:root {
  /* Primary */
  --sano-charcoal: #0F1113;
  --sano-white:    #FFFFFF;

  /* Accent — used sparingly: cover tagline, section-title underline,
     page eyebrows, pricing figure, bullet / icon tint. Never a
     structural surface colour.
     Muted matt green per locked brand spec (was #6FBF4A — now toned
     down for a more refined, less vivid feel). */
  --sano-green:    #6F8458;
  --sano-green-08: rgba(111, 132, 88, 0.10);

  /* Supporting neutrals */
  --sano-bg-soft:  #F5F5F5;
  --sano-line:     #E5E5E5;
  --sano-muted:    #6B7280;

  /* Ink scale (derived) */
  --sano-ink:      #0F1113;
  --sano-ink-2:    #1F2937;
}

.proposal-document {
  /* Phase 3.2 — Poppins is loaded globally via next/font (see
     src/lib/fonts.ts). --font-poppins is always available under the
     root <html>. Falls back to system-ui if the variable can't be
     resolved (e.g. isolated print preview). Portal UI outside this
     scoped selector is unaffected. */
  font-family: var(--font-poppins), 'Poppins', system-ui, -apple-system, sans-serif;
  background: var(--sano-bg-soft);
  color: var(--sano-ink);
  padding: 24px 0;
  -webkit-font-smoothing: antialiased;
}

/* ── Page wrapper ──────────────────────────────────────────────── */

.proposal-page {
  position: relative;
  width: 210mm;
  height: 297mm;
  margin: 0 auto 16px;
  background: var(--sano-white);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Inner pages use a consistent 48px content padding (12mm ≈ 45px, but
   the spec says 40–60px; 12mm hits that range and aligns to print). */
.proposal-page__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12mm 14mm 20mm;
  overflow: hidden;
}

/* ── Header (FIXED — identical on every inner page) ────────────── */

.proposal-header {
  position: relative;
  height: 28mm;                       /* locked */
  flex-shrink: 0;
  overflow: hidden;
  color: var(--sano-white);
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
    rgba(15, 17, 19, 0.92) 0%,
    rgba(15, 17, 19, 0.75) 55%,
    rgba(15, 17, 19, 0.45) 100%
  );
}
.proposal-header__content {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14mm;
}
.proposal-header__logo {
  height: 12mm;                       /* locked */
  width: auto;
  object-fit: contain;
}
.proposal-header__title-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2mm;
}
.proposal-header__title {
  font-size: 11pt;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sano-white);
}
.proposal-header__underline {
  height: 1.5px;
  width: 22mm;
  background: var(--sano-green);
}

/* ── Footer (FIXED — identical on every page) ──────────────────── */

.proposal-footer {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 12mm;
  padding: 0 14mm;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--sano-line);
  background: var(--sano-white);
  color: var(--sano-muted);
  font-size: 8.5pt;
}
.proposal-footer__contact {
  display: flex;
  align-items: center;
  gap: 12px;
}
.proposal-footer__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--sano-muted);
}
.proposal-footer__icon {
  width: 11px;
  height: 11px;
  stroke: var(--sano-muted);
  flex-shrink: 0;
}
.proposal-footer__page {
  font-variant-numeric: tabular-nums;
  color: var(--sano-muted);
}

/* ── Cover — full-bleed dark, structured left-aligned content ──── */

.proposal-cover {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: 18mm 18mm 20mm;    /* leaves room for footer (12mm) */
  color: var(--sano-white);
}
.proposal-cover__bg {
  position: absolute; inset: 0;
  background-size: cover;
  background-position: center;
}
.proposal-cover__overlay {
  position: absolute; inset: 0;
  background: linear-gradient(
    100deg,
    rgba(15, 17, 19, 0.96) 0%,
    rgba(15, 17, 19, 0.82) 45%,
    rgba(15, 17, 19, 0.30) 100%
  );
}
/* Cover top — logo + tagline LEFT ALIGNED in the upper-left dark
   panel area (same 105mm column extent as __main). Logo + tagline
   share the same left edge as the title block below, so the
   entire left panel reads as one consistent left-aligned stack. */
.proposal-cover__top {
  position: relative;
  z-index: 1;
  max-width: 105mm;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  margin-bottom: 22mm;
}
.proposal-cover__logo {
  height: 16mm;
  width: auto;
  object-fit: contain;
  margin-bottom: 4mm;
}
.proposal-cover__tagline {
  font-size: 10.5pt;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--sano-green);           /* sparing green */
  font-weight: 600;
}

/* Cover main — left-aligned, capped to the dark left column. */
.proposal-cover__main {
  position: relative;
  z-index: 1;
  max-width: 105mm;
  display: flex;
  flex-direction: column;
}
.proposal-cover__title {
  font-size: 42pt;                    /* mockup scale */
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.015em;
  margin: 0 0 8mm;
  color: var(--sano-white);
}
.proposal-cover__title-rule {
  height: 1.5px;
  width: 30mm;
  background: var(--sano-green);
  margin-bottom: 12mm;
}
.proposal-cover__fields {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.proposal-cover__field {
  padding: 4mm 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}
.proposal-cover__field:last-child { border-bottom: 0; }
.proposal-cover__field dt {
  font-size: 8.5pt;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sano-green);           /* sparing green */
  margin-bottom: 1.5mm;
  font-weight: 600;
}
.proposal-cover__field dd {
  margin: 0;
  font-size: 12pt;
  font-weight: 500;
  color: var(--sano-white);
  line-height: 1.35;
}

/* ── Inner page typography ─────────────────────────────────────── */

.proposal-content {
  display: flex;
  flex-direction: column;
}

.proposal-eyebrow {
  font-size: 8pt;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--sano-green);
  font-weight: 600;
  margin: 0 0 3mm;
}
.proposal-h2 {
  font-size: 22pt;                    /* ≈ 30px — inner title */
  font-weight: 600;
  letter-spacing: -0.005em;
  color: var(--sano-ink);
  margin: 0 0 8mm;
  line-height: 1.2;
}
.proposal-h3 {
  font-size: 10pt;                    /* ≈ 13–14px — section header */
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--sano-ink);
  margin: 0 0 3mm;
}
.proposal-lead {
  font-size: 11.5pt;                  /* Phase 3.2 — +1pt for readability */
  line-height: 1.6;
  color: var(--sano-ink-2);
  margin: 0 0 5mm;
}
.proposal-label {
  font-size: 8pt;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--sano-muted);
  font-weight: 500;
}

/* Executive summary — copy left, full-height image right.
   The body wrapper is a flex column with proposal-content--exec
   stretching to fill remaining space, so the grid below inherits a
   real height and the right column can stretch top-to-bottom of
   the page body. */
.proposal-content--exec {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.proposal-exec-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 75mm;
  gap: 8mm;
  align-items: stretch;
  /* The right grid column is reserved as empty space — the image
     renders absolutely (see below) so the text column (1fr) keeps
     its proper width. */
}
.proposal-exec-grid__copy {
  display: flex;
  flex-direction: column;
}

/* Image is positioned absolutely against .proposal-page so a single
   --exec-gap value drives all three visible gaps. This avoids
   fighting the asymmetric body padding (12mm/14mm/20mm) with
   mismatched negative margins.
   Header (28mm) and footer (12mm) are added to the top/bottom
   offsets so the gap is measured from the header line / footer
   line, not the page edges. */
.proposal-exec-grid__image {
  --exec-gap: 5mm;
  position: absolute;
  top:    calc(28mm + var(--exec-gap));
  right:  var(--exec-gap);
  bottom: calc(12mm + var(--exec-gap));
  /* Left aligned with the natural grid image-column boundary
     (page width − body right padding − image column width). */
  left: calc(210mm - 14mm - 75mm);
  background-size: cover;
  background-position: center;
  border-radius: 0;
}
.proposal-exec-opener {
  font-size: 12pt;
  font-weight: 600;
  color: var(--sano-green);
  line-height: 1.4;
  margin: 0 0 5mm;
}

/* Service overview — labelled cell grid. Even rhythm: fixed 10mm
   row gap, 12mm column gap. Tile column widened for the larger
   icon tile below. */
.proposal-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10mm 12mm;
  margin-top: 2mm;
}
.proposal-meta-cell {
  display: grid;
  grid-template-columns: 13mm 1fr;
  gap: 5mm;
  align-items: start;
}

/* Shared icon tile — same dimensions on Service Overview AND Scope
   of Works. Glyphs are stroke-only line drawings at 1.4px with
   rounded line caps. Sized to read with the weight shown in the
   example-layout reference. */
.proposal-icon-tile {
  width: 13mm;
  height: 13mm;
  background: var(--sano-green-08);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3mm;
  color: var(--sano-green);
  flex-shrink: 0;
}
.proposal-icon-tile svg {
  width: 6mm; height: 6mm;
  stroke: var(--sano-green);
  stroke-width: 1.4;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.proposal-meta-cell__body {
  padding-top: 0.5mm;
}
.proposal-meta-cell__label {
  font-size: 8pt;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--sano-green);
  font-weight: 600;
  margin-bottom: 1.5mm;
}
.proposal-meta-cell__value {
  font-size: 11pt;                    /* Phase 3.2 — +0.5pt */
  color: var(--sano-ink);
  font-weight: 500;
  line-height: 1.55;
}

/* Scope page — green icon bullets per section */
.proposal-scope-intro {
  font-size: 11pt;                    /* Phase 3.2 — +1pt */
  color: var(--sano-green);
  font-weight: 500;
  margin: 0 0 6mm;
  line-height: 1.55;
}
.proposal-scope-stack {
  display: flex;
  flex-direction: column;
  gap: 7mm;
}
.proposal-scope-row {
  display: grid;
  grid-template-columns: 13mm 1fr;   /* matches service-overview tile */
  gap: 5mm;
  align-items: start;
}
.proposal-scope-row__head {
  font-size: 9.5pt;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--sano-ink);
  font-weight: 700;
  margin: 0 0 2mm;
}
.proposal-scope-row__list {
  margin: 0;
  padding-left: 4mm;
  list-style: disc;
  font-size: 11pt;                    /* Phase 3.2 — +1pt */
  color: var(--sano-ink-2);
  line-height: 1.55;
}
.proposal-scope-row__list li {
  margin-bottom: 0.5mm;
}

/* Pricing — prominent but not oversized */
.proposal-pricing-wrap {
  display: flex;
  justify-content: center;
  margin: 6mm 0 8mm;
}
.proposal-pricing-card {
  border: 1.5px solid var(--sano-green);
  border-radius: 2px;
  padding: 12mm 18mm;
  text-align: center;
  max-width: 120mm;
  width: 100%;
}
.proposal-pricing-card__label {
  font-size: 9pt;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sano-ink);
  font-weight: 600;
  margin-bottom: 4mm;
}
.proposal-pricing-card__amount {
  font-size: 28pt;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--sano-green);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  margin-bottom: 2mm;
}
.proposal-pricing-card__suffix {
  font-size: 10pt;
  color: var(--sano-muted);
  margin-bottom: 4mm;
}
.proposal-pricing-card__note {
  font-size: 9pt;
  color: var(--sano-muted);
  line-height: 1.5;
}
.proposal-pricing-support {
  text-align: center;
  font-size: 10.5pt;                  /* Phase 3.2 — +1pt */
  color: var(--sano-muted);
  line-height: 1.6;
  max-width: 140mm;
  margin: 6mm auto 0;
}
/* Phase 4 — subtle accent positioning line, slightly darker and
   italicised so it sits between the structural copy and the
   invoice-terms note without shouting. */
.proposal-pricing-support--accent {
  color: var(--sano-ink-2);
  font-style: italic;
  margin-top: 5mm;
}
.proposal-pricing-shield {
  display: flex;
  justify-content: center;
  margin: 4mm 0 2mm;
  color: var(--sano-muted);
}
.proposal-pricing-shield svg {
  width: 7mm; height: 7mm;
  stroke: var(--sano-muted);
  stroke-width: 1.4;
  fill: none;
}

/* Terms prose — default (single-column, looser) used by ad-hoc
   terms callers. */
.proposal-prose {
  font-size: 10pt;
  line-height: 1.6;
  color: var(--sano-ink-2);
  max-width: 155mm;
}
.proposal-prose h3 {
  font-size: 10pt;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--sano-ink);
  margin: 5mm 0 2mm;
  font-weight: 600;
}
.proposal-prose p { margin: 0 0 3mm; }
.proposal-prose ul { margin: 0 0 3mm; padding-left: 5mm; }
.proposal-prose li { margin-bottom: 1mm; }

/* ── Terms & Conditions — compact 2-column variant ──────────────
   Designed to fit the locked 19-section approved Sano commercial
   terms on a single A4 page.

   Tightening knob: change --terms-shrink to a positive number to
   shave that many points off the body type. e.g. 0.5 nudges body
   from 8.5pt → 8pt and h3 from 9pt → 8.5pt without touching markup.
   Keep at 0 for the documented "comfortable" rendering.

   break-inside: avoid-column keeps each heading + its paragraphs +
   bullet list together — no orphaned headings at the bottom of
   column 1. column-fill: balance gives even column heights. */

.proposal-content--terms {
  flex: 1;
}

.proposal-prose--terms {
  --terms-shrink: 1.3;
  font-size: calc(8.5pt - var(--terms-shrink) * 1pt);
  line-height: 1.3;
  color: var(--sano-ink-2);
  max-width: none;
  columns: 2;
  column-gap: 5mm;
  column-fill: balance;
}

.proposal-prose--terms h3 {
  font-size: calc(9pt - var(--terms-shrink) * 1pt);
  letter-spacing: 0.03em;
  text-transform: none;
  color: var(--sano-ink);
  font-weight: 700;
  margin: 0 0 0.6mm;
  break-after: avoid-column;
  break-inside: avoid-column;
}

.proposal-prose--terms h3:first-child {
  margin-top: 0;
}

.proposal-prose--terms > h3 + p,
.proposal-prose--terms > h3 + ul {
  margin-top: 0;
}

.proposal-prose--terms p {
  margin: 0 0 0.6mm;
  break-inside: avoid-column;
}

.proposal-prose--terms ul {
  margin: 0 0 0.6mm;
  padding-left: 3mm;
  break-inside: avoid-column;
  list-style: disc;
}

.proposal-prose--terms li {
  margin-bottom: 0.2mm;
}

/* Add a small breath between sections without growing the heading
   margin (which would orphan headings). */
.proposal-prose--terms > h3 {
  margin-top: 2.5mm;
}
.proposal-prose--terms > h3:first-child {
  margin-top: 0;
}

/* ── Phase 3: tailored content blocks (additive — no existing rules
      changed). Service-summary paragraph, "What this means" benefits
      grid, pricing "What's included" checklist, acceptance page. ── */

/* Short intro paragraph above the service-overview meta grid. */
.proposal-service-summary {
  font-size: 11pt;                    /* Phase 3.2 — +1pt */
  line-height: 1.6;
  color: var(--sano-ink-2);
  margin: 0 0 5mm;
  max-width: 165mm;
}

/* "What this means" benefits block — sits below the meta grid. */
.proposal-benefits {
  margin-top: 8mm;
  padding: 6mm 7mm;
  background: var(--sano-green-08);
  border-left: 2px solid var(--sano-green);
  border-radius: 1mm;
}
.proposal-benefits__head {
  font-size: 8pt;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sano-green);
  font-weight: 600;
  margin: 0 0 3mm;
}
.proposal-benefits__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3mm 8mm;
}
.proposal-benefits__item {
  display: grid;
  grid-template-columns: 5mm 1fr;
  gap: 2mm;
  align-items: start;
  font-size: 10.5pt;                  /* Phase 3.2 — +1pt */
  line-height: 1.55;
  color: var(--sano-ink-2);
}
.proposal-benefits__check {
  width: 4mm;
  height: 4mm;
  stroke: var(--sano-green);
  stroke-width: 1.6;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  margin-top: 0.5mm;
  flex-shrink: 0;
}

/* Pricing "What's included" list + basis paragraph. */
.proposal-pricing-basis {
  text-align: center;
  font-size: 10.5pt;                  /* Phase 3.2 — +1pt */
  color: var(--sano-ink-2);
  line-height: 1.6;
  max-width: 155mm;
  margin: 0 auto 5mm;
}
.proposal-pricing-included {
  max-width: 150mm;
  margin: 0 auto 5mm;
  padding: 5mm 7mm;
  border: 1px solid var(--sano-line);
  border-radius: 1mm;
}
.proposal-pricing-included__head {
  font-size: 8pt;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sano-ink);
  font-weight: 600;
  margin: 0 0 3mm;
}
.proposal-pricing-included__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2mm;
}
.proposal-pricing-included__item {
  display: grid;
  grid-template-columns: 5mm 1fr;
  gap: 2mm;
  align-items: start;
  font-size: 10.5pt;                  /* Phase 3.2 — +1pt */
  color: var(--sano-ink-2);
  line-height: 1.55;
}
.proposal-pricing-included__check {
  width: 4mm;
  height: 4mm;
  stroke: var(--sano-green);
  stroke-width: 1.6;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  margin-top: 0.5mm;
  flex-shrink: 0;
}

/* Why Sano — lead intro + 2×2 grid of green-accented points. Additive
   in Phase 4, no existing rule modified. */
.proposal-why-intro {
  font-size: 11.5pt;
  line-height: 1.6;
  color: var(--sano-ink-2);
  margin: 0 0 8mm;
  max-width: 170mm;
}
.proposal-why-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8mm 12mm;
  margin-top: 2mm;
}
.proposal-why-item {
  padding-left: 5mm;
  border-left: 2px solid var(--sano-green);
}
.proposal-why-item__label {
  font-size: 10pt;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--sano-green);
  font-weight: 600;
  margin-bottom: 2.5mm;
}
.proposal-why-item__body {
  font-size: 10.5pt;
  line-height: 1.55;
  color: var(--sano-ink-2);
  margin: 0;
}

/* Acceptance page — title, wording, signature block. */
.proposal-acceptance-wording {
  font-size: 11.5pt;                  /* Phase 3.2 — +1pt */
  line-height: 1.6;
  color: var(--sano-ink-2);
  max-width: 165mm;
  margin: 0 0 6mm;
}
/* Phase 4 — optional close line. Slightly dimmer, italicised so it
   reads as a friendly sign-off rather than a clause. */
.proposal-acceptance-wording--close {
  color: var(--sano-green);
  font-style: italic;
  font-weight: 500;
  margin-top: 2mm;
  margin-bottom: 8mm;
}
.proposal-acceptance-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8mm 10mm;
  margin-top: 6mm;
}
.proposal-acceptance-field {
  display: flex;
  flex-direction: column;
  gap: 2mm;
}
.proposal-acceptance-field__label {
  font-size: 8pt;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sano-green);
  font-weight: 600;
}
.proposal-acceptance-field__line {
  border-bottom: 1px solid var(--sano-ink);
  height: 10mm;
}
.proposal-acceptance-field--wide { grid-column: span 2; }
.proposal-acceptance-note {
  margin-top: 10mm;
  font-size: 10pt;                    /* Phase 3.2 — +1pt */
  color: var(--sano-muted);
  line-height: 1.55;
  max-width: 165mm;
}

/* ── Print ─────────────────────────────────────────────────────── */

@media print {
  /* Keep colours (green accents, background tints on benefits /
     included blocks, cover overlay gradient) when Chrome / Puppeteer
     renders the page to PDF. Without these properties browsers
     strip backgrounds and colour fills on print by default. */
  html, body {
    background: #fff !important;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color-adjust: exact;
  }

  /* Portal chrome hide — when the proposal is rendered inside the
     portal preview route (/portal/quotes/[id]/proposal/preview) the
     page is wrapped in the portal sidebar + topbar. Without this
     rule the portal chrome occupies the first printed sheet and
     pushes the cover page to page 2. Safe no-op on the dedicated
     /proposals/print/[id] route because no shell elements exist
     there.
     header:not(.proposal-header) keeps the per-page proposal
     banner; only the portal topbar is hidden. */
  aside,
  header:not(.proposal-header),
  nav {
    display: none !important;
  }

  /* Strip the min-height / padding / max-width that the portal
     layout applies to <main> and its container, so the proposal
     document sits flush at the top-left of page 1. Each
     .proposal-page already carries its own internal padding. */
  main {
    display: block !important;
    padding: 0 !important;
    margin: 0 !important;
    flex: none !important;
    min-height: 0 !important;
    background: transparent !important;
  }
  main > div {
    max-width: none !important;
    padding: 0 !important;
    margin: 0 !important;
    width: auto !important;
  }

  /* Re-assert Poppins at the body level so the print stylesheet
     doesn't fall back to a browser default when --font-poppins is
     not yet resolved at print time. */
  body {
    font-family: var(--font-poppins), 'Poppins', system-ui, -apple-system, sans-serif;
  }

  .proposal-document {
    background: #fff;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .proposal-page {
    box-shadow: none;
    margin: 0;
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .proposal-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  /* Let page-level colour tints (benefits block, pricing card accent
     border, cover gradient) render in print. */
  .proposal-benefits,
  .proposal-pricing-card,
  .proposal-pricing-included,
  .proposal-cover__bg,
  .proposal-cover__overlay,
  .proposal-header__bg,
  .proposal-header__overlay,
  .proposal-icon-tile {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  @page {
    size: A4;
    margin: 0;
  }
}
`
