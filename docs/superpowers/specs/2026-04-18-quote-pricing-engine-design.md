# Quote Pricing Engine — Design

Date: 2026-04-18
Status: Approved (pending user review)

## 1. Purpose

Introduce a structured, time-based pricing engine into the Sano quote builder. Replaces the current guess-driven manual `base_price` input with a calculation derived from industry-standard labour hours, the existing structured builder inputs, and a staff-selectable pricing mode.

Sits alongside the existing quote wording system. The wording engine is untouched except for one additive entry (`mould_treatment`) appended to its add-on option list.

## 2. Scope

### In scope (v1)
- Guided pricing for service categories: **Residential**, **Property Management**, **Airbnb**.
- Manual `base_price` fallback retained for: **Commercial** (all four types), legacy quotes without structured builder fields, and any category where no service type is selected.
- New DB columns on `quotes`: `pricing_mode`, `estimated_hours`, `pricing_breakdown`.
- New pure engine module: `src/lib/quote-pricing.ts`.
- New UI component: `src/app/portal/quotes/_components/PricingSummary.tsx`.
- One additive change to `quote-wording.ts`: append `mould_treatment` to `ADDON_OPTIONS`.
- Minimal additive integration in `NewQuoteForm.tsx` and `EditQuoteForm.tsx`.

### Out of scope
- Commercial base-time model (separate design, later).
- Hourly rate UI override (hardcoded `$65` v1; spec allows future flex $60–$75).
- Bulk re-pricing of historical quotes.
- Changes to wording templates, generated_scope, invoice logic, labour-calc, print/PDF/email rendering (beyond naturally using the final `base_price`).

## 3. Pricing Model

### Billable Hour Calculation Order

The strict source of truth for both the live UI and the Jest suite:

1. Calculate base hours from property size (bedrooms) and service type (`base_hours × service_multiplier`).
2. Apply condition multiplier (product of all selected `%` adjustments, stacked multiplicatively).
3. Add bathroom, high-detail, and add-on hours (flat loadings; fixed-scope; not scaled by multipliers).
4. Apply frequency multiplier, respecting minimum hours: `max(MIN_JOB_HOURS, hours × frequency_multiplier)`. The minimum floor applies AFTER the frequency discount, so a weekly recurring 1-bed clean never drops below `MIN_JOB_HOURS`.
5. Apply buffer multiplier (`× 1.05` standard or `× 1.08` heavy).
6. Round up to the nearest 0.5 hour.
7. Multiply by hourly rate (selected directly by pricing mode) and add the callout / service fee.

Formulaically:

```
adjusted_hours  = (base_hours × service_multiplier × condition_multiplier)
                   + bathroom_hours + high_use_hours + Σ addon_hours
after_frequency = max(MIN_JOB_HOURS, adjusted_hours × frequency_multiplier)
buffered_hours  = after_frequency × (1 + buffer_percent)
final_hours     = ceil_to_0_5(buffered_hours)
final_price     = (final_hours × HOURLY_RATES[pricing_mode]) + SERVICE_FEE
```

If staff overrides the final price, `final_price = override` and `override_flag = true`; `final_hours` and the derived `calculated_price` are preserved in the breakdown unchanged.

### Engine invariants (enforced by tests and shared by the UI)

- Buffer is **always** applied to billable hours. It is never display-only.
- Rounding to 0.5 always happens **after** the buffer multiplier — never before.
- `final_hours` is always a multiple of 0.5.
- Tests and the UI both call `calculateQuotePrice` from `src/lib/quote-pricing.ts` — there is exactly one calculation path in the codebase.

Flat-hour loadings (bathroom, high-use, add-ons) are fixed-scope and never scaled by service or condition multipliers — a 2-bathroom 3-bed Deep Clean with an oven clean adds the same `0.5 + 1.0` hrs as a 2-bathroom 3-bed Standard Clean with an oven clean.

### 3.1 Base time by bedrooms (Residential / Property Management / Airbnb)

Aligned with the Sano 100-point residential system.

| Bedrooms | Hours |
|---|---|
| 1 | 2.0 |
| 2 | 2.75 |
| 3 | 3.5 |
| 4 | 5.0 |
| 5 | 6.0 |
| 6 | 7.5 |

- `bedrooms` empty or `0` → fall back to 1-bed base. UI note: *"Using 1-bedroom base until property size is selected."*
- `bedrooms > 6` → clamp to 6-bed base. UI note: *"Pricing currently caps at 6 bedrooms. Please review manually."*

### 3.2 Service type multipliers

| Category | Service type | Multiplier |
|---|---|---|
| Residential | `standard_clean` | 1.0 |
| Residential | `deep_clean` | 1.6 |
| Residential | `move_in_out` | 1.65 |
| Residential | `pre_sale` | 1.2 |
| Property Management | `routine` | 1.0 |
| Property Management | `end_of_tenancy` | 1.65 |
| Property Management | `pre_inspection` | 1.2 |
| Property Management | `handover` | 1.2 |
| Airbnb | `turnover` | 0.9 |
| Airbnb | `deep_reset` | 1.25 |

### 3.3 Condition / focus adjustments

| Builder tag | Adjustment |
|---|---|
| `well_maintained` | 0% |
| `average_condition` | +10% |
| `build_up_present` | +20% |
| `furnished_property` | +10% |
| `high_use_areas` | +0.5 hrs (flat) |
| `recently_renovated` | +20% |
| `inspection_focus` | +10% |
| `vacant_property` | 0 |
| `guest_ready_focus` | 0 |

Multiple `%` adjustments stack **multiplicatively** with each other and with the service type multiplier (e.g. Deep × Build-up × Furnished = `1.6 × 1.20 × 1.10`).

`high_use_areas` is a **flat hour addition** (`+0.5 hrs`) applied at step 3 alongside bathrooms and add-ons — not a percentage. Adding a "high-use areas" tag to a Deep Clean adds the same 0.5 hrs as it would to a Standard Clean.

### 3.4 Bathroom adjustment

`+0.5 hrs` for each bathroom over 1. Applied at step 3 as a flat-hour loading (not scaled by service type multiplier or condition percentages).

- `bathrooms` empty or `0` → treat as 1 (no adjustment).
- `bathrooms ≥ 2` → add `(bathrooms − 1) × 0.5` hrs.

### 3.5 Add-on time

| Add-on key | Hours |
|---|---|
| `oven_clean` | +1.0 |
| `fridge_clean` | +0.5 |
| `interior_window` | +1.0 |
| `wall_spot_cleaning` | +0.75 |
| `carpet_cleaning` | +0.5 |
| `spot_treatment` | +0.5 |
| `mould_treatment` | +1.5 |
| `glass_doors`, `skirting_detailing`, `garage_clean`, `outdoor_areas`, `pressure_washing` | 0 (wording-only; v1) |

Add-on keys intentionally match the existing `ADDON_OPTIONS` in `quote-wording.ts`; no renaming.

### 3.6 Frequency multiplier

Applied at step 4, AFTER flat-hour loadings and BEFORE the minimum-hours floor is enforced. `max(MIN_JOB_HOURS, adjusted_hours × frequency_multiplier)` means a heavy frequency discount will not push the billable below the floor.

| Frequency (from builder state) | Multiplier |
|---|---|
| `one_off`                | 1.0  |
| `monthly`                | 1.0  |
| `weekly`                 | 0.75 |
| `fortnightly`            | 0.85 |
| `x_per_week` with count=1 | 0.75 |
| `x_per_week` with count=2 | 0.60 |
| `x_per_week` with count≥3 | 0.50 |
| empty / null / unknown   | 1.0  |

### 3.7 Buffer classification

Heavy buffer (`× 1.08`) applies when service type is one of:
- `deep_clean`, `move_in_out`, `end_of_tenancy`, `deep_reset`

All other eligible service types use the standard buffer (`× 1.05`).

### 3.8 Pricing mode — direct hourly rate selection

Pricing mode selects the hourly rate directly. There is no post-rate multiplier.

| Mode | Hourly rate |
|---|---|
| `win` | $65 |
| `standard` | $75 |
| `premium` | $82 |

Default mode for a fresh quote: `standard`.

### 3.9 Constants

```
HOURLY_RATE_WIN       = 65
HOURLY_RATE_STANDARD  = 75
HOURLY_RATE_PREMIUM   = 82
SERVICE_FEE           = 25
MIN_JOB_HOURS         = 2.0
BUFFER_STANDARD       = 0.05
BUFFER_HEAVY          = 0.08
```

### 3.10 Canonical scenarios

Exact outputs of the formula above. Used as both Jest assertions and live-portal verification targets. No `%` conditions and no add-ons unless noted.

| # | Property | Service / frequency / mode | `final_hours` | `final_price` |
|---|---|---|---|---|
| 1 | 1 bed / 1 bath | Residential Standard / one-off / Win    | 2.5  | $187.50 |
| 2 | 3 bed / 2 bath | Residential Standard / one-off / Win    | 4.5  | $317.50 |
| 3 | 4 bed / 2 bath | Residential Standard / one-off / Win    | 6.0  | $415.00 |
| 4 | 4 bed / 2 bath | Residential Deep     / one-off / Win    | 9.5  | $642.50 |
| 5 | 3 bed / 2 bath | Residential Standard / **weekly** / Win | 3.5  | $252.50 |

The Jest suite contains these as `Canonical A`–`Canonical E` plus broader coverage for other modes, frequencies, edge cases (minimum floor activation, clamp, fallback, override), and legacy+new breakdown field parity.

## 4. Architecture

### 4.1 File layout

**New pure module** — `src/lib/quote-pricing.ts`
- No React, no Supabase, no formatting concerns. Returns raw numbers and structured breakdown only.
- Exports constants, types, `calculateQuotePrice`, and `isPricingEligible`.

**New UI component** — `src/app/portal/quotes/_components/PricingSummary.tsx`
- Reads `QuoteBuilderState` (read-only) plus owned fields (`pricing_mode`, `final_price`, `override_flag`).
- Renders summary, mode selector, override field, and collapsible staff-facing breakdown.
- Emits `{ pricing_mode, final_price, override_flag, estimated_hours, breakdown }` via a single `onChange` callback.

**Additive edits** — `QuoteBuilder.tsx` unchanged. `NewQuoteForm.tsx` / `EditQuoteForm.tsx` mount `<PricingSummary>` below the existing `<QuoteBuilder>`; the current manual `Base price ($)` input is replaced by the Final price field inside `<PricingSummary>` when pricing is eligible, and shown as today when not.

**Additive edit** — `src/lib/quote-wording.ts`: append one entry to `ADDON_OPTIONS` for `mould_treatment`. No other changes to this file.

### 4.2 Types (illustrative)

```ts
export type PricingMode = 'win' | 'standard' | 'premium'

export interface PricingInput {
  service_category: ServiceCategory | null
  service_type_code: string | null
  bedrooms: number | null
  bathrooms: number | null
  condition_tags: string[]
  addons_wording: string[]
  frequency?: string | null        // 'one_off', 'weekly', 'fortnightly', 'x_per_week', 'monthly', null
  x_per_week?: number | null       // only used when frequency === 'x_per_week'
}

// Breakdown is a SUPERSET — it retains all fields PricingSummary reads for UI continuity
// while adding the new spec-native fields. Legacy saved breakdowns (pre-2026-04 revision)
// use a subset of these fields; the UI tolerates missing fields gracefully.
export interface PricingBreakdown {
  // Base / inputs
  base_hours: number
  bed_count_used: number
  bed_count_clamped: boolean
  bed_count_fallback: boolean

  // Multipliers
  service_type_multiplier: number       // historical name kept for UI
  service_multiplier: number            // alias of service_type_multiplier (new spec name)
  condition_adjustments: Array<{ tag: string; type: 'percent' | 'hours'; value: number }>
  condition_multiplier: number          // scalar product of (1 + pct) across all % tags

  // Flat-hour loadings
  bathroom_hours: number
  high_use_hours: number
  addon_hours: number
  addon_items: Array<{ key: string; hours: number }>

  // Frequency
  frequency_key: string | null          // 'one_off' | 'weekly' | ... | null
  frequency_multiplier: number          // 1.0 / 0.75 / 0.85 / 0.60 / 0.50

  // Min / buffer / rounding
  hours_after_adjustments: number       // raw × multipliers + flat loadings (pre-frequency)
  pre_buffer_hours: number              // after frequency + min
  min_applied: boolean                  // true when min floor raised the hours
  buffer_percent: number                // 0.05 or 0.08
  rounded_hours: number                 // UI name kept
  final_hours: number                   // alias of rounded_hours (new spec name)

  // Rate / fee
  hourly_rate: number                   // selected rate (65, 75, or 82)
  hourly_rate_used: number              // alias (new spec name)
  pricing_mode: PricingMode
  pricing_mode_multiplier: number       // always 1.0 after 2026-04 revision; kept for UI field access on legacy quotes
  service_fee: number                   // 25

  // Prices
  calculated_price: number
  final_price: number
  override_flag: boolean
}

export interface PricingResult {
  eligible: boolean
  estimated_hours: number | null
  calculated_price: number | null
  final_price: number | null
  breakdown: PricingBreakdown | null
}
```

### 4.3 Data flow

```
QuoteBuilderState ─┐
                   ├→ <PricingSummary>  (read-only on builder state)
Form state         ┴→ onChange({ pricing_mode, final_price, override_flag,
                                  estimated_hours, breakdown })
                      │
NewQuoteForm / EditQuoteForm → createQuote / updateQuote
```

`<PricingSummary>` never mutates `QuoteBuilderState`. This keeps the wording engine and the pricing engine fully decoupled; removing `<PricingSummary>` would leave the wording flow unchanged.

## 5. UI

### 5.1 Pricing Summary layout (staff-only, inside the portal)

Placement: between the existing `QuoteBuilder` output and the Pricing section of the form. Replaces the legacy `Base price ($)` input **only when pricing is eligible**.

Visible elements, in order:
- **Estimated time** — e.g. `4.5 hrs` (the post-buffer, rounded `final_hours` — the same number used to compute the price).
- **Calculated price** — e.g. `$317.50` (always visible when eligible).
- **Mode selector** — three pill buttons (`Win` / `Standard` / `Premium`) in the QuoteBuilder chip style. Default `standard`.
- **Breakdown (collapsible, staff-facing only)** — plain-English lines in calculation order. Using Canonical scenario 4 (4-bed / 2-bath Deep / Win / one-off) for illustration:
  - `4-bed base            5.0 hrs`
  - `Deep clean            ×1.6`
  - `Bathrooms             +0.5 hrs`
  - `Rounded               9.5 hrs`
  - `Buffer (8%)           ×1.08`
  - `$65 × 9.5 hrs         $617.50`
  - `Service fee           +$25.00`
  - `Calculated            $642.50`
- **Final price** — numeric input, always editable, pre-populated with calculated price.
  - When different from calculated: muted line `Overridden from $X calculated` and a `Revert to calculated` link.
  - Field is labelled **Final price** in the UI. The word "override" stays internal only (`override_flag` in breakdown).

### 5.2 Ineligible / placeholder states

- Category or service type not selected → show placeholder: *"Select an eligible service to use guided pricing."* Legacy manual `Base price` input remains.
- Category = Commercial → engine never runs; legacy manual `Base price` input is rendered as today.
- Eligible but `bedrooms` empty / 0 → 1-bed fallback with muted note.
- Eligible but `bedrooms > 6` → 6-bed clamp with muted note.

### 5.3 Mode selector

- Always visible when pricing is eligible.
- Default `standard` for new quotes and for legacy rows with null `pricing_mode`.
- Saved mode hydrates on edit.

### 5.4 Customer-facing vs internal rendering

The breakdown is strictly internal. Every customer-visible surface shows only the final price.

| Surface | What it shows |
|---|---|
| Quote print / PDF (`/portal/quotes/{id}/print`) | Final price only. No hours, no buffer, no breakdown. |
| Shared quote link (`/share/quote/{token}`) | Final price only. No hours, no buffer, no breakdown. |
| Invoice (`/portal/invoices/{id}` + print) | Final price only. Same behaviour as today. |
| Email quote (via Send panel) | Final price only, inside the existing Resend template. |
| Portal quote edit (staff, `draft` status) | Full `<PricingSummary>` — mode selector, estimated time, calculated price, collapsible breakdown (bed base, service multiplier, conditions, bathroom, add-ons, frequency, minimum floor, buffer, rounded `final_hours`, rate × hours, service fee, calculated, final / overridden). |
| Portal quote view (staff, `sent` / `accepted` status) | `<PricingSummary>` renders read-only — breakdown visible for reference but mode and Final price controls disabled. Status transitions alone (Send, Mark as accepted) never recalculate pricing. |

The `$25` service fee is part of the internal breakdown and is rolled into the final price for customer-facing output; it is never surfaced as a separate line item anywhere the client sees.

## 6. Persistence

### 6.1 DB migration

Single additive migration on the `quotes` table:

```sql
alter table quotes
  add column pricing_mode       text,
  add column estimated_hours    numeric(5,2),
  add column pricing_breakdown  jsonb;
```

All three nullable. No backfill. Legacy rows unaffected.

### 6.2 Save rules (`createQuote` / `updateQuote`)

When pricing is **eligible** and the Final price is set:
- `base_price` = the Final price (final client-facing number).
- `pricing_mode` = selected mode.
- `estimated_hours` = rounded hours (after buffer + ceil-to-0.5).
- `pricing_breakdown` = full snapshot per the Types section above. Must store **both** `calculated_price` and `final_price` (not just the delta), so the record is unambiguous when `override_flag = true`.

When pricing is **ineligible** (Commercial, no service selected, legacy):
- `base_price` = manual input (unchanged behaviour).
- `pricing_mode`, `estimated_hours`, `pricing_breakdown` = `null`.

### 6.3 Breakdown as historical snapshot

Once saved, `pricing_breakdown` is a frozen snapshot. Future changes to multipliers, rates, buffers, or the bed table do not retroactively change historical breakdowns. The engine re-runs on current rules only for draft-editing.

## 7. Edit behaviour

### 7.1 Draft or unset status

- On reopen, engine re-runs live against the current `QuoteBuilderState`.
- The freshly calculated price is shown; the saved `pricing_breakdown` is held in component state as `savedBreakdown` purely for display of the "Overridden from $X calculated" line, until the user saves again.
- If `override_flag = true` on the saved row:
  - Saved override value hydrates into the `Final price` field.
  - `Overridden from $X calculated` line uses the **current live calculated price** as X (more useful than the stale saved calc).
  - `Revert to calculated` button clears the override and sets Final price = live calculated price.
- If `override_flag = false` on the saved row:
  - `Final price` follows the live calculated price automatically.
- On save, fresh breakdown replaces `savedBreakdown`.

### 7.2 Sent or accepted status

- Saved `pricing_breakdown` is displayed **read-only** for reference.
- No live recalculation until the user explicitly enters edit mode and modifies the quote.
- Status transitions alone (e.g. `sent` → `accepted`) must not recalculate pricing or alter `base_price`.
- Only an explicit edit-and-save action updates pricing. At that point the engine re-runs and a fresh breakdown replaces the saved one.

## 8. Integration with existing systems

### 8.1 Wording engine — untouched

- `quote-wording.ts` generator functions, templates, and sentences are unchanged.
- `generated_scope` content is unchanged.
- Only mechanical edit: append `{ value: 'mould_treatment', label: 'Mould treatment', wording: 'mould treatment' }` to `ADDON_OPTIONS`. The existing wording pipeline picks this up automatically.

### 8.2 Invoice / print / email — unchanged

- `quotes/[id]/_actions-invoice.ts` is not modified.
- Print and PDF views render `base_price` as they do today.
- The `$25` service fee is bundled into `base_price` and never itemised in client-facing output.
- No pricing mode, estimated hours, calculated price, service fee, or override note appears on the client-facing print or share page.

### 8.3 Labour costing — unchanged

- `src/lib/labour-calc.ts` is a separate internal concern (post-job margin tracking). No changes.

## 9. Testing

### 9.1 Scenario script (optional, internal only)

Optional one-off node script at `F:/Sano/Sano-site/scripts/pricing-scenarios.mjs` that imports the engine and prints a small table of canonical scenarios. Not the source of truth — deployed portal behaviour is the final verification step. Scenarios:

1. 3-bed / 2-bath / Residential Standard / well-maintained / no add-ons / Standard mode.
2. 3-bed / 2-bath / Residential Deep / build-up / oven + fridge / Premium mode (heavier buffer).
3. 1-bed / 1-bath / Residential Standard / average condition / no add-ons / Standard mode (minimum-hours check).
4. 4-bed / 3-bath / PM End of Tenancy / furnished / Win mode (multiplicative stacking check).
5. Commercial Maintenance — engine returns `eligible: false`.
6. 7-bed / 2-bath → cap warning, treated as 5-bed.
7. 0-bed / 1-bath → 1-bed fallback.

### 9.2 Browser verification (authoritative)

1. Create new quote, step through scenarios 1–4 via the builder; confirm numbers match the script (if run).
2. Scenario 5 (Commercial) — confirm engine does not activate and legacy `Base price` input is shown.
3. Scenarios 6 and 7 — confirm muted notes appear and numbers use the fallback/cap.
4. Override a price, save, reopen — confirm:
   - Override value hydrates into `Final price`.
   - "Overridden from $X calculated" line uses the current live calculated price.
   - `Revert to calculated` clears override and `override_flag`.
5. Change bed count after reopen — confirm live recalc; saved breakdown preserved in display until re-save.
6. Open a pre-existing legacy quote (no `pricing_mode`) — confirm form still works, falls back to manual `base_price`.
7. Send a quote with pricing, check invoice and print view — confirm the `$25` service fee is not itemised anywhere client-facing.
8. Accept a quote that used guided pricing — confirm:
   - Status transitions to `accepted`.
   - `base_price` remains unchanged.
   - No pricing recalculation occurs from the status change alone.
9. Quote print / share page — confirm only the final total is visible; no calculated price, no estimated hours, no service fee, no pricing mode, no override note.

## 10. Rollout

- Deploy migration first.
- Ship engine + UI in the same release.
- No feature flag; `pricing_mode` null behaviour makes legacy quotes naturally compatible.
- Mark live only after Netlify deploy and user verification (per Sano live-vs-implemented rule).

## 11. Explicitly out of scope

- Commercial-category base-time model.
- Hourly rate UI override ($65 hardcoded v1).
- Bulk migration / re-pricing of historical quotes.
- Changes to `quote-wording.ts` logic, templates, or sentences.
- Changes to invoice logic, labour-calc, print, PDF, or email rendering — beyond those naturally using the final `base_price`.
