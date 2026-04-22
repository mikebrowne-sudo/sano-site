# Commercial Proposal — Field Map

> Maps every placeholder in `templates/commercial-proposal-template.html`
> back to its source: a database column on a portal table or a pure helper
> in `src/lib/commercialProposalMapping.ts`. The goal is a single contract
> the auto-fill layer can build against, so `commercial_quote_details` +
> `commercial_scope_items` + `quotes` + `clients` rows hydrate the template
> with no per-section wiring code.

## Source tables (portal)

| Table | Where it's defined | Key columns used here |
|---|---|---|
| `quotes` | `docs/db/2026-04-20-commercial-quote-foundation.sql` (commercial fields) and the prior portal migrations | `id`, `quote_number`, `status`, `date_issued`, `valid_until`, `accepted_at`, `service_address`, `notes`, `base_price`, `discount`, `gst_included`, `payment_type` |
| `quote_items` | original portal migration | `label`, `price`, `sort_order` |
| `clients` | original portal migration | `name`, `company_name`, `service_address`, `phone`, `email` |
| `commercial_quote_details` | `docs/db/2026-04-20-commercial-quote-foundation.sql` | full row — see `CommercialQuoteDetails` in `src/lib/commercialQuote.ts` |
| `commercial_scope_items` | same migration | full row — see `CommercialScopeItem` in `src/lib/commercialQuote.ts` |

## Helpers (already implemented)

All live in `src/lib/commercialProposalMapping.ts` (shipped on
`feat/commercial-quote-phase-3`). Pure TypeScript, no Supabase, safe for
any layer to import.

| Helper | Purpose | Returns |
|---|---|---|
| `sectorLabel(s)` | Internal enum → client-friendly sector label | `string` |
| `frequencyLabel(f)` | Scope row frequency → client-friendly label | `string` |
| `trafficLabel(t)` / `occupancyLabel(o)` | Enum → "Low / Medium / High" | `string` |
| `serviceDaysSummary(days)` | `["mon","tue",…]` → `"Weekdays (Mon–Fri)"` | `string` |
| `buildingTypeLabel(t)` | snake_case → Title Case | `string` |
| `nzd(n)` | Number → NZ-formatted currency | `string` |
| `fmtArea(m2)` / `fmtCount(n, sing, pl?)` | Numeric formatting | `string` |
| `groupScopeForProposal(rows)` | Categorises scope rows into proposal groups (general / offices / kitchens / bathrooms / common / specialist) and orders them | `ProposalScopeGroup[]` |
| `splitToBullets(raw)` | Multi-line text → array of bullets, or single-entry array if it looks like a paragraph | `string[]` |
| `buildSiteProfile(details, addr)` | Site profile block | `SiteProfileView` |
| `buildServiceSchedule(details)` | Schedule block | `ServiceScheduleView` |
| `buildExecutiveSummary(details, scope, clientName)` | Auto-generated summary sentence | `string` |
| `buildPricingSummary(base, addons, discount, gstIncluded)` | Pricing roll-up incl. annualised + GST note | `ProposalPricingView` |

The HTML template is intentionally a 1:1 consumer of these helper outputs
— field names below match the helper return shapes exactly so a future
auto-fill function is mostly a `JSON.stringify` of an aggregator that
calls those helpers.

---

## JSON contract → template placeholder map

Each row: **JSON path** (used by the template) | **Source** (DB column or
helper call) | **Type** | **Example** | **Notes**.

### `meta` — proposal metadata

| JSON path | Source | Type | Example | Notes |
|---|---|---|---|---|
| `meta.reference` | `quotes.quote_number` | string | `"Q-2026-0084"` | |
| `meta.issued` | `quotes.date_issued` (ISO date) → `fmtDate(...)` | string | `"22 April 2026"` | Already-formatted display string. |
| `meta.valid_until` | `quotes.valid_until` → `fmtDate(...)` | string | `"22 May 2026"` | |
| `meta.accepted_at` | `quotes.accepted_at` → `fmtDate(...)` or `null` | string \| null | `null` | Renders an extra row only when present. |
| `meta.status` | `quotes.status` | string | `"sent"` | Drives status copy elsewhere; not currently shown on cover. |
| `meta.version` | `quotes.proposal_version` (if present) or `1` | integer | `1` | Reserved for proposal-versioning. |

### `sano` — issuer (static)

| JSON path | Source | Type | Example | Notes |
|---|---|---|---|---|
| `sano.company_name` | constant | string | `"Sano Property Services Limited"` | |
| `sano.trading_as` | constant | string | `"Sano"` | Shown in footers. |
| `sano.phone` | constant | string | `"0800 726 686"` | Toll-free / general line. From `CLAUDE.md`. |
| `sano.mobile_phone` | constant | string | `"022 394 3982"` | Operations / direct line. Used on the React commercial proposal's Parties + footer blocks. |
| `sano.email` | constant | string | `"hello@sano.nz"` | |
| `sano.website` | constant | string | `"sano.nz"` | |
| `sano.address_line` | constant | string | `"Auckland, New Zealand"` | |
| `sano.gst_number` | constant | string | `"141-577-062"` | Rendered as `GST {gst_number}`. |
| `sano.logo_src` | path to image | string | `"../assets/logos/sano-logo-print.png"` | Drop the file into `assets/logos/`. Renderer skips the `<img>` if empty. |

> Recommendation: keep `sano.*` in a single shared constant in
> `src/lib/commercialProposalMapping.ts` (e.g. `SANO_ISSUER`) when wiring
> auto-fill, so all templates draw from one place.

### `client` — recipient

| JSON path | Source | Type | Example | Notes |
|---|---|---|---|---|
| `client.company_name` | `clients.company_name` ?? `clients.name` ?? `"Client"` | string | `"Riverstone Property Group"` | Fallback chain matches the React template's existing logic. |
| `client.contact_name` | `clients.name` | string \| null | `"Anita Patel"` | |
| `client.site_address` | `quotes.service_address` ?? `clients.service_address` | string \| null | `"Level 3, 88 Albert Street…"` | Quote-level address wins so per-site overrides apply. |
| `client.phone` | `clients.phone` | string \| null | `"09 555 1234"` | |
| `client.email` | `clients.email` | string \| null | `"anita@riverstone.co.nz"` | |

### `executive_summary` — auto-generated paragraph

| JSON path | Source | Type | Notes |
|---|---|---|---|
| `executive_summary` | `buildExecutiveSummary(details, scope, clientName)` | string | Already produces a single 3-4 sentence paragraph from the captured site, schedule, and scope counts. Pass through verbatim. |

### `site_profile` — site & service profile dl

| JSON path | Source | Type | Example |
|---|---|---|---|
| `site_profile.sector` | `sectorLabel(details.sector_category)` | string | `"Office"` |
| `site_profile.building_type` | `buildingTypeLabel(details.building_type)` | string | `"Multi Tenant"` |
| `site_profile.service_address` | `quotes.service_address` ?? `clients.service_address` | string \| `""` | |
| `site_profile.total_area` | `fmtArea(details.total_area_m2)` | string | `"1,250 m²"` |
| `site_profile.floors` | `fmtCount(details.floor_count, 'floor')` | string | `"3 floors"` |
| `site_profile.traffic` | `trafficLabel(details.traffic_level)` | string | `"Medium"` |
| `site_profile.occupancy` | `occupancyLabel(details.occupancy_level)` | string | `"High"` |
| `site_profile.fixtures_summary` | `buildSiteProfile(...).fixtures_summary` (toilets · urinals · basins · showers · kitchens · desks · offices · meeting rooms · reception) | string | `"8 toilets · 4 urinals · 8 basins · 2 kitchens · 60 desks"` |

> The template skips any row whose value is empty (`{{#field}}…{{/field}}`),
> so partial captures still render cleanly.

### `service_schedule` — service schedule dl

| JSON path | Source | Type |
|---|---|---|
| `service_schedule.frequency_summary` | `buildServiceSchedule(details).frequency_summary` | string |
| `service_schedule.service_days` | `serviceDaysSummary(details.service_days)` | string |
| `service_schedule.service_window` | `details.service_window` | string |
| `service_schedule.access_requirements` | `details.access_requirements` | string |
| `service_schedule.consumables` | derived from `details.consumables_by` (`'sano' → "Provided by Sano"`, etc.) | string |

### `scope_groups` — categorised scope of works

`scope_groups` is the direct return of `groupScopeForProposal(rows)`.
Empty groups are dropped; tasks within a group preserve operator
`display_order`.

| JSON path | Source | Type | Example |
|---|---|---|---|
| `scope_groups` | `groupScopeForProposal(commercial_scope_items)` | `ProposalScopeGroup[]` | see below |
| `scope_groups[i].key` | one of `general_areas \| offices_workstations \| kitchens_breakout \| bathrooms_washrooms \| common_areas \| specialist_areas` | string | `"general_areas"` |
| `scope_groups[i].label` | `PROPOSAL_GROUP_LABEL[key]` | string | `"General Areas"` |
| `scope_groups[i].tasks[j].task_name` | `commercial_scope_items.task_name` | string | `"Vacuum carpeted floors"` |
| `scope_groups[i].tasks[j].frequency_label` | `frequencyLabel(row.frequency)` | string | `"Weekly"` |
| `scope_groups[i].tasks[j].area_type` | `commercial_scope_items.area_type` | string \| null | `"Open plan"` |
| `scope_groups[i].tasks[j].notes` | `commercial_scope_items.notes` | string \| null | `"Replace liners as needed."` |

> Internal-only scope fields (`quantity_type`, `quantity_value`,
> `unit_minutes`, `production_rate`, `display_order`, `included`) are
> intentionally **not** surfaced to the client. They're used for pricing,
> not for the proposal narrative.

### `assumptions` / `exclusions` — bullet pillars

| JSON path | Source | Type |
|---|---|---|
| `assumptions` | `splitToBullets(details.assumptions)` | `string[]` |
| `exclusions` | `splitToBullets(details.exclusions)` | `string[]` |

### `compliance_notes` — narrative block

| JSON path | Source | Type |
|---|---|---|
| `compliance_notes` | `details.compliance_notes` | string \| null |

### `pricing` — pricing summary

`pricing` is the direct return of
`buildPricingSummary(quotes.base_price, addons, quotes.discount,
quotes.gst_included)`. The template's renderer also computes
NZD-formatted variants (`*_fmt`) on top of these raw numbers so the
HTML can stay free of formatting logic.

| JSON path | Source | Type | Notes |
|---|---|---|---|
| `pricing.base_label` | helper constant: `"Monthly service fee"` | string | |
| `pricing.base_amount` | `quotes.base_price` | number | Renderer derives `base_amount_fmt`. |
| `pricing.addons[]` | `quote_items` rows mapped to `{ label, amount }` (price > 0 only) | array | Renderer derives `amount_fmt` per row. |
| `pricing.discount` | `quotes.discount` | number | Renderer derives `discount_fmt` and `discount_positive`. |
| `pricing.subtotal_ex_gst` | helper-computed | number | |
| `pricing.gst_amount` | helper-computed | number | |
| `pricing.total_inc_gst` | helper-computed | number | |
| `pricing.annualised_inc_gst` | `total_inc_gst × 12` (already in helper) | number | Labelled "indicative" in the template. |
| `pricing.gst_included` | `quotes.gst_included` | boolean | Drives the GST note copy. |
| `pricing.gst_note` | helper-computed copy | string | `"Pricing shown excludes GST. GST is added at 15%."` etc. |

### `why_sano` — bullet list (static for now)

| JSON path | Source | Type | Notes |
|---|---|---|---|
| `why_sano` | constant array (recommended: same module as `SANO_ISSUER`) | `string[]` | Pure marketing copy. Override per-quote later if needed. |

### `acceptance` — closing block

| JSON path | Source | Type | Notes |
|---|---|---|---|
| `acceptance.blurb` | constant copy (overrideable per quote later) | string | Currently static. |
| `acceptance.next_steps` | constant array | `string[]` | Currently static. |

---

## Auto-fill wiring (proposed shape)

A single aggregator function is enough to fill the contract — it doesn't
need a new module beyond what already exists:

```ts
// src/lib/commercialProposalPayload.ts (proposed; not yet implemented)
import {
  buildExecutiveSummary, buildPricingSummary, buildServiceSchedule,
  buildSiteProfile, groupScopeForProposal, splitToBullets,
} from '@/lib/commercialProposalMapping'

export function buildProposalPayload(args: {
  quote: ProposalQuote
  client: ProposalClient | null
  addons: ProposalAddon[]
  details: CommercialQuoteDetails
  scope: readonly CommercialScopeItem[]
}): ProposalPayload {
  const { quote, client, addons, details, scope } = args
  return {
    meta: { reference: quote.quote_number, issued: fmtDate(quote.date_issued), /* … */ },
    sano: SANO_ISSUER,
    client: { /* fallback chain — see field-map */ },
    executive_summary: buildExecutiveSummary(details, scope, client?.name ?? client?.company_name ?? null),
    site_profile:     buildSiteProfile(details, quote.service_address ?? client?.service_address ?? null),
    service_schedule: buildServiceSchedule(details),
    scope_groups:     groupScopeForProposal(scope),
    assumptions:      splitToBullets(details.assumptions),
    exclusions:       splitToBullets(details.exclusions),
    compliance_notes: details.compliance_notes,
    pricing:          buildPricingSummary(quote.base_price ?? 0, addons, quote.discount ?? 0, quote.gst_included),
    why_sano:         SANO_WHY_BULLETS,
    acceptance:       SANO_ACCEPTANCE_BLOCK,
  }
}
```

That payload is what feeds:

1. **The HTML template** — `JSON.stringify(payload)` into the
   `<script id="proposal-data">` block, or set `window.PROPOSAL_DATA`
   before the renderer runs.
2. **The existing React template** (`CommercialProposalTemplate.tsx`) —
   the same payload can also drive that component since the helpers
   already match.
3. **PDF generation** — Puppeteer / Playwright opens the rendered HTML
   and calls `page.pdf({ format: 'A4', printBackground: true })`.

---

## What's not yet wired

These fields exist in the contract but are not yet pulled from the DB
auto-fill — they currently come from constants or sample data:

| Field | Status | Next action |
|---|---|---|
| `sano.*` (issuer block) | constant — needs a single source-of-truth | Add `SANO_ISSUER` constant to `commercialProposalMapping.ts`. |
| `why_sano[]` | constant placeholder copy | Treat as marketing copy; review with brand voice rules in `CLAUDE.md` before locking in. |
| `acceptance.blurb`, `acceptance.next_steps[]` | constant placeholder copy | Same — keep static for v1, per-quote overrides later. |
| `meta.version` | always `1` for now | Wire to `proposals.proposal_version` if/when the proposal-versioning system lands and is connected to commercial. |
| `pricing.addons[*].sort_order` | not surfaced | Sort in the aggregator before passing in; template renders in array order. |

## What we deliberately do NOT surface to the client

These are stored on `commercial_quote_details` for internal pricing and
must never appear in the client-facing proposal:

- `selected_margin_tier`, `labour_cost_basis`
- `estimated_service_hours`, `estimated_weekly_hours`, `estimated_monthly_hours`
- `sector_fields` JSONB (operator-only sector intake data)
- `commercial_scope_items.quantity_*`, `unit_minutes`, `production_rate`, `included` flag

The aggregator above already excludes them by virtue of mapping through
the helpers, which only return client-safe shapes.
