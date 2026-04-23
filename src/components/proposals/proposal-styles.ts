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
     structural surface colour. */
  --sano-green:    #6FBF4A;
  --sano-green-08: rgba(111, 191, 74, 0.08);

  /* Supporting neutrals */
  --sano-bg-soft:  #F5F5F5;
  --sano-line:     #E5E5E5;
  --sano-muted:    #6B7280;

  /* Ink scale (derived) */
  --sano-ink:      #0F1113;
  --sano-ink-2:    #1F2937;
}

.proposal-document {
  font-family: 'Inter', 'Arial', sans-serif;
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
.proposal-cover__inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 105mm;                   /* keeps text in the left panel */
}
.proposal-cover__logo {
  height: 16mm;
  width: auto;
  object-fit: contain;
  margin-bottom: 6mm;
}
.proposal-cover__tagline {
  font-size: 10.5pt;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--sano-green);           /* sparing green */
  font-weight: 600;
  margin-bottom: 28mm;
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
  font-size: 10.5pt;                  /* ≈ 14px — body */
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

/* Executive summary — intro paragraph + right image placeholder */
.proposal-intro-grid {
  display: grid;
  grid-template-columns: 1fr 85mm;
  gap: 12mm;
  align-items: start;
}
.proposal-intro-image {
  width: 100%;
  height: 100mm;
  background-size: cover;
  background-position: center;
  border-radius: 2px;
}

/* Service overview — labelled cell grid with green icon tile */
.proposal-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8mm 12mm;
}
.proposal-meta-cell {
  display: grid;
  grid-template-columns: 10mm 1fr;
  gap: 4mm;
  align-items: start;
}
.proposal-icon-tile {
  width: 10mm;
  height: 10mm;
  background: var(--sano-green-08);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  color: var(--sano-green);
  flex-shrink: 0;
}
.proposal-icon-tile svg {
  width: 4.5mm; height: 4.5mm;
  stroke: var(--sano-green);
  stroke-width: 1.6;
  fill: none;
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
  font-size: 10.5pt;
  color: var(--sano-ink);
  font-weight: 500;
  line-height: 1.5;
}

/* Scope page — green icon bullets per section */
.proposal-scope-intro {
  font-size: 10pt;
  color: var(--sano-green);
  font-weight: 500;
  margin: 0 0 6mm;
  line-height: 1.5;
}
.proposal-scope-stack {
  display: flex;
  flex-direction: column;
  gap: 6mm;
}
.proposal-scope-row {
  display: grid;
  grid-template-columns: 10mm 1fr;
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
  font-size: 10pt;
  color: var(--sano-ink-2);
  line-height: 1.5;
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
  font-size: 9.5pt;
  color: var(--sano-muted);
  line-height: 1.6;
  max-width: 130mm;
  margin: 6mm auto 0;
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

/* Terms prose */
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

/* ── Print ─────────────────────────────────────────────────────── */

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
