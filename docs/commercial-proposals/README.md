# Commercial Proposals — Master Template Stack

Single source of truth for the **client-facing commercial cleaning
proposal** that Sano issues from a saved commercial quote. The HTML
template here is the canonical visual / structural reference; the React
template that ships in the portal (`CommercialProposalTemplate.tsx` on
`feat/commercial-quote-phase-3`) is an alternative renderer of the same
JSON contract.

This is **not** a standalone design exercise. Every placeholder in the
HTML template has a defined source — either a column on a portal table
or a pure helper in `src/lib/commercialProposalMapping.ts` — documented
in [`field-map.md`](./field-map.md).

## Folder layout

```
docs/commercial-proposals/
├── README.md                              ← you are here
├── field-map.md                           ← JSON contract → DB / helper map
├── templates/
│   └── commercial-proposal-template.html  ← master JSON-driven template
└── assets/
    ├── images/                            ← inline imagery (e.g. hero photo)
    └── logos/                             ← Sano print-quality logo(s)
```

## How the pipeline fits together

```
┌──────────────────────────┐    ┌─────────────────────────────────┐
│ Portal commercial quote  │    │  src/lib/commercialProposal-    │
│ (quotes + clients +      │ →  │  Mapping.ts  (pure helpers,     │
│  commercial_quote_       │    │  already shipped Phase 3)        │
│  details +               │    └──────────────┬──────────────────┘
│  commercial_scope_items) │                   │
└──────────────────────────┘                   ▼
                                ┌─────────────────────────────────┐
                                │ buildProposalPayload(...)       │
                                │ — proposed aggregator,          │
                                │   not yet implemented           │
                                └──────────────┬──────────────────┘
                                               │  ProposalPayload (JSON)
                              ┌────────────────┼─────────────────────────────┐
                              ▼                ▼                             ▼
              ┌────────────────────────┐  ┌────────────────────────┐  ┌──────────────────────┐
              │ HTML template (this    │  │ React template          │  │ PDF (Puppeteer /     │
              │  folder) — preview /   │  │ (CommercialProposal-    │  │  Playwright over the │
              │  share / print fall-   │  │  Template.tsx) — used   │  │  rendered HTML)       │
              │  back                  │  │  by /portal/quotes/     │  │                       │
              └────────────────────────┘  │  [id]/proposal route    │  └──────────────────────┘
                                          └────────────────────────┘
```

The same JSON payload feeds all three renderers. That's the point of
having a shared field map: changing the data shape changes one
contract, not three.

## Template sections (matches `CommercialProposalTemplate.tsx`)

1. **Cover** — client name, reference, dates, Sano logo
2. **Parties** — recipient + issuer cards
3. **Executive summary** — auto-generated paragraph
4. **Site & service profile** — sector, building, area, fixtures
5. **Service schedule** — frequency, days, window, access, consumables
6. **Scope of works** — categorised into General Areas, Offices /
   Workstations, Kitchens / Breakout, Bathrooms / Washrooms, Common
   Areas, Specialist Areas (empty groups dropped)
7. **Assumptions, exclusions & compliance**
8. **Pricing summary** — monthly fee + add-ons + GST + indicative annualised
9. **Why Sano** — short bullet list
10. **Acceptance & next steps** — blurb, signature block, footer

## Previewing locally

The HTML template is self-rendering — open it directly in a browser:

```bash
# Windows
start docs/commercial-proposals/templates/commercial-proposal-template.html
```

A small (dependency-free, ~80-line) Mustache-compatible renderer at the
bottom of the file hydrates the template from the inline
`<script id="proposal-data">` block. To preview with different data,
either:

1. **Edit the inline JSON** in the `<script id="proposal-data">` block, or
2. **Set `window.PROPOSAL_DATA`** before the script runs (e.g. inject from
   an outer page).

The yellow "preview" banner is hidden in print.

## Rendering with the real proposal data

Once the aggregator (`buildProposalPayload`) is wired:

```html
<!-- replace the inline sample with: -->
<script id="proposal-data" type="application/json">
  {{REAL_PAYLOAD_JSON}}
</script>
```

The placeholder syntax is a strict subset of Mustache 3.x, so any
server-side Mustache or Handlebars engine will also render this template
without modification. If you go that route, drop the inline `<script
id="proposal-data">` block and the closing `<script>` renderer — they're
only needed for self-rendering previews.

## Generating a PDF (roadmap, not yet wired)

1. Run the aggregator to produce `ProposalPayload`.
2. Render the HTML server-side (either by Mustache substitution against
   the template, or by spawning a headless renderer pointed at a route
   that sets `window.PROPOSAL_DATA`).
3. Drive Puppeteer or Playwright to print:

   ```ts
   await page.pdf({
     format: 'A4',
     printBackground: true,
     margin: { top: 0, bottom: 0, left: 0, right: 0 },
   })
   ```

   The `@page { size: A4; margin: 0 }` and `@media print` rules in the
   template are already set so PDF margins come from the page padding,
   not the printer.

4. Stream the resulting buffer to the client (or persist it).

We have **not** picked a PDF runtime yet — Puppeteer is the lowest-
friction option but adds ~150MB to the deploy. A serverless alternative
(e.g. `@react-pdf/renderer` driven from the React template, or a hosted
service like DocRaptor) is also viable. Decision deferred until the
aggregator is in place and we know whether the React template or the
HTML template wins as the source of truth.

## Status

| Piece | Status | Notes |
|---|---|---|
| Helpers (`commercialProposalMapping.ts`) | shipped | On `feat/commercial-quote-phase-3`, awaiting merge to main. |
| React template (`CommercialProposalTemplate.tsx`) | shipped | Same branch. |
| Portal route `/portal/quotes/[id]/proposal` | shipped | Same branch. Internal preview only — no public share yet. |
| HTML master template | **shipped (this folder)** | Mirrors the React template's content + helpers. |
| Field map (this folder) | **shipped** | |
| Aggregator (`buildProposalPayload`) | not started | Trivial — see field-map's "Auto-fill wiring" section. |
| Constants module (`SANO_ISSUER`, `SANO_WHY_BULLETS`, etc.) | not started | Add to `commercialProposalMapping.ts`. |
| PDF rendering | not started | Decision pending — see roadmap above. |
| Public share route for commercial proposals | not started | Out of Phase 3 scope. |
| Acceptance signature capture | not started | The HTML signature block is print-only for now. |

## Where the existing system lives (for reference)

When the Phase 3 branches are merged, the live equivalents will be at:

- `src/lib/commercialQuote.ts` — types, enums, pricing engine
- `src/lib/commercialProposalMapping.ts` — proposal mapping helpers
- `src/app/portal/quotes/_components/commercial/CommercialProposalTemplate.tsx` — React render of the same payload
- `src/app/portal/quotes/[id]/proposal/page.tsx` — internal preview route
- `docs/db/2026-04-20-commercial-quote-foundation.sql` — schema

If any of these change, [`field-map.md`](./field-map.md) is the contract
that needs updating in lockstep.

## Brand & voice constraints

The template body and any default copy in this folder must respect the
rules in `CLAUDE.md`:

- Never use "premium", "eco-friendly", "industry-leading"
- No fake testimonials
- Tone: reliable, detail-focused, easy to deal with

The `why_sano` bullets and `acceptance.blurb` in the sample data are
written to that brief; if you swap them, run them past those rules.
