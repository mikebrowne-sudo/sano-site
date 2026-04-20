# Commercial Pricing Calculator — Design

**Status:** Approved 2026-04-20
**Owner:** Mike Browne
**Scope:** New standalone calculator tool at `/portal/commercial-calculator` plus a minimal read-and-prefill integration with the existing quote creation page.

## Goal

Add a richer commercial cleaning pricing workflow to the portal that:

1. Captures detailed commercial job inputs (m² by zone, fixtures, complexity, frequency, location, one-off extras).
2. Calculates price, hours, cost, profit, margin, and effective hourly rate using NZD industry-aligned rates.
3. Keeps internal figures (cost / profit / margin) strictly internal.
4. Saves the calculation to Supabase.
5. Redirects to the existing `/portal/quotes/new` with the calculation pre-applied.

This is a **plug-in tool**. It sits alongside the existing quote builder and does not replace or modify it. The legacy `service_category = 'commercial'` path remains available as a fallback. The calculator becomes the preferred workflow for commercial quotes once validated in real use.

## Scope

**In scope**

- New table `commercial_calculations` with RLS.
- New nullable FK column `quotes.commercial_calc_id`.
- New library `src/lib/commercialPricing.ts` (pure calculation engine).
- New helper library `src/lib/commercialPricingMapping.ts` (pricing-mode mapping, description builder, quote-items builder).
- New page at `/portal/commercial-calculator` with form, live preview, summary, and two "use this price" actions.
- One line added to the portal sidebar nav.
- Read-and-prefill branch inside the existing `/portal/quotes/new` page, gated on `?calc_id=<id>`.
- A single new optional field `commercial_calc_id` on `CreateQuoteInput` in the existing `createQuote` server action.

**Out of scope**

- Any change to the existing `src/lib/quote-pricing.ts` engine.
- Any change to the existing commercial category builder in `NewQuoteForm` (fields, behaviour, or wording).
- Any change to the `quote_items` schema.
- Any change to `quotes.pricing_mode` enum values.
- Any data migration or transformation of existing rows.
- Retirement of the legacy commercial builder (a later decision).

## Locked decisions (from brainstorming)

1. **Integration approach:** plug-in, additive. Legacy commercial builder stays untouched. Calculator is the preferred new workflow.
2. **Complexity uplift** multiplies the area subtotal on price: `1 + traffic + fitout + access` where
   - `traffic_level`: low 0.00 / medium 0.05 / high 0.10
   - `fitout_level`: basic 0.00 / standard 0.05 / premium 0.10
   - `access_difficulty`: easy 0.00 / medium 0.05 / hard 0.15
   - Applied *after* the frequency multiplier, *before* the location uplift.
   - Values exported as a constant so they can be tuned without code edits to the calc order.
3. **Deep clean multiplier: 1.5×**, applied only to the m² base. Treated as a one-off extra on the quote. Priced as the **delta** (`area_base × (1.5 − 1) = area_base × 0.5`) because the core recurring clean is already billed in `core_subtotal`.
4. **Extras are one-off only** (windows, carpet, hard floor, deep clean):
   - Contribute to `extras_total` and `extras_breakdown` only.
   - Do **not** contribute to `total_per_clean`, `monthly_value`, or `estimated_hours`.
   - Not scaled by frequency.
5. **Quote prefill price source: user-selected** on the summary screen. Two buttons: "Use per-clean price" and "Use monthly contract value". The choice is persisted on `commercial_calculations.selected_pricing_view`.
6. **Quote line-item strategy: bundled core + separate extras.**
   - Core line = m² area + bathrooms + kitchens, priced by selected view.
   - Each non-zero extra is its own one-off line item.
   - Existing `quote_items` schema reused unmodified.
7. **`pricing_mode` mapping on quote prefill only:** `win_work → win`, `make_money → standard`, `premium → premium`. Calculator keeps the spec's names; quotes stay on their existing enum.
8. **RLS** mirrors existing portal pattern: `ENABLE ROW LEVEL SECURITY` with a single permissive policy for `authenticated` (`FOR ALL USING true WITH CHECK true`). No per-user ownership.
9. **`below_target_margin`** is set based on the pre-minimum-charge margin and is not recalculated after the minimum charge is applied. This is intentional: the flag tells the operator "without the minimum kicking in, this job would be under target."
10. **`suggested_price`** is informational only. It renders in the warning bar. Operators who want to use it lift the price manually on the existing quote override panel. No new button, no new flag column.
11. **Quote prefill locks the description builder.** `description_edited = true` is set, and `generated_scope` is populated from the calc. The existing commercial wording builder is bypassed for calc-driven quotes.
12. **Core line label on the quote:** short — `"Commercial cleaning — recurring service"`. The full verbose description lives in `generated_scope` only. No duplication.
13. **`service_type_code`** on prefill: inspect existing commercial codes in `quote-wording.ts`. If a clean "commercial contract / recurring service" code exists, use it; otherwise leave null. Do **not** invent a new code.

## Architecture

```
+---------------------------------------------+
|  /portal/commercial-calculator              |
|                                             |
|  CommercialCalculatorForm (client)          |
|   - inputs grouped in six fieldsets         |
|   - onChange -> calculateCommercialPrice()  |
|   - ResultSummary (live)                    |
|   - buttons: per-clean / monthly            |
|                                             |
|   click -> saveCommercialCalculation()      |
|                 |                           |
|                 v                           |
|   commercial_calculations row inserted      |
|                 |                           |
|                 v                           |
|   client navigates to                       |
|   /portal/quotes/new?calc_id=<id>           |
+---------------------------------------------+
                  |
                  v
+---------------------------------------------+
|  /portal/quotes/new                         |
|                                             |
|  page.tsx (server):                         |
|   - if searchParams.calc_id:                |
|       fetch commercial_calculations row     |
|       pass as <NewQuoteForm calc=... />     |
|                                             |
|  NewQuoteForm (client):                     |
|   - if calc present, seed initial state     |
|     from buildCommercialDescription +       |
|     buildQuoteItemsFromCalc +               |
|     mapPricingMode                          |
|                                             |
|  submit -> createQuote(input)               |
|   - includes commercial_calc_id             |
|   - writes quotes row + quote_items rows    |
+---------------------------------------------+
```

The calculator never writes to `quotes`. The quote form never writes to `commercial_calculations`. The two sides communicate only through the calc row keyed by `calc_id` on the redirect URL and stored as `commercial_calc_id` on the resulting quote.

## Section 1 — Data model

### New table: `commercial_calculations`

```sql
CREATE TABLE IF NOT EXISTS public.commercial_calculations (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inputs                   jsonb NOT NULL,
  pricing_mode             text NOT NULL,      -- win_work | make_money | premium
  selected_pricing_view    text NULL,          -- per_clean | monthly (null until user chooses)
  total_per_clean          numeric NOT NULL,   -- core recurring only (no extras)
  monthly_value            numeric NOT NULL,   -- total_per_clean * visits_per_month
  extras_total             numeric NOT NULL DEFAULT 0,
  extras_breakdown         jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_hours          numeric NOT NULL,   -- recurring only; minimum 1.5
  estimated_cost           numeric NOT NULL,   -- estimated_hours * HOURLY_COST
  profit                   numeric NOT NULL,   -- total_per_clean - estimated_cost
  margin                   numeric NOT NULL,   -- profit / total_per_clean
  effective_hourly_rate    numeric NOT NULL,   -- total_per_clean / estimated_hours
  below_target_margin      boolean NOT NULL DEFAULT false,
  suggested_price          numeric NULL,
  minimum_applied          boolean NOT NULL DEFAULT false,
  pricing_status           text NULL,          -- high_margin | healthy | tight
  created_at               timestamptz NOT NULL DEFAULT now()
);
```

Three columns beyond the original spec (`selected_pricing_view`, `extras_total`, `extras_breakdown`) exist so the quote prefill path can read calc outputs directly — no recalculation in the quote layer.

### `extras_breakdown` JSONB shape

```json
{
  "windows":    0,
  "carpet":     0,
  "hard_floor": 0,
  "deep_clean": 0
}
```

Always written with all four keys for consistency (zero when the input was zero). Values in NZD.

### Foreign key on quotes

```sql
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS commercial_calc_id uuid
    REFERENCES public.commercial_calculations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_commercial_calc_id
  ON public.quotes (commercial_calc_id) WHERE commercial_calc_id IS NOT NULL;
```

`ON DELETE SET NULL` — deleting a calc does not cascade to the quote; the quote keeps its prices and simply loses its back-link.

### RLS

```sql
ALTER TABLE public.commercial_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users full access"
  ON public.commercial_calculations
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

### Migration file

`docs/db/2026-04-20-commercial-calculator.sql` — one idempotent file covering the table, the FK column on quotes, the index, and the RLS policy. Applied manually via the Supabase dashboard SQL editor, per existing convention.

### Explicitly unchanged

- `quotes.pricing_mode` enum and values.
- `quote_items` schema.
- No columns renamed, dropped, or re-typed on existing tables.
- No existing rows touched.

## Section 2 — Pricing engine (`src/lib/commercialPricing.ts`)

Pure TypeScript, no React or Supabase imports. All constants exported so they're tunable without touching the calc order.

### Types

```ts
export type PropertyType = 'office' | 'warehouse' | 'retail' | 'medical'
export type LocationType = 'suburban' | 'cbd' | 'remote'
export type FrequencyType = 'weekly' | 'fortnightly' | 'monthly'
export type TrafficLevel = 'low' | 'medium' | 'high'
export type FitoutLevel = 'basic' | 'standard' | 'premium'
export type AccessDifficulty = 'easy' | 'medium' | 'hard'
export type PricingMode = 'win_work' | 'make_money' | 'premium'
export type PricingStatus = 'high_margin' | 'healthy' | 'tight'

export interface CommercialInputs {
  property_type: PropertyType
  office_m2?: number
  warehouse_m2?: number
  retail_m2?: number
  medical_m2?: number
  total_m2?: number                  // UI-only; ignored by engine
  floors?: number                    // UI-only; ignored by engine
  location_type: LocationType
  bathrooms: number
  kitchens: number
  windows?: number
  desks?: number
  bins?: number
  frequency_type: FrequencyType
  visits_per_period: number
  traffic_level: TrafficLevel
  fitout_level: FitoutLevel
  access_difficulty: AccessDifficulty
  carpet_clean_m2?: number
  hard_floor_m2?: number
  deep_clean?: boolean
  pricing_mode: PricingMode
}

export interface CommercialResult {
  total_per_clean: number
  monthly_value: number
  estimated_hours: number
  estimated_cost: number
  profit: number
  margin: number
  effective_hourly_rate: number
  below_target_margin: boolean
  suggested_price: number | null
  minimum_applied: boolean
  pricing_status: PricingStatus
  extras_total: number
  extras_breakdown: { windows: number; carpet: number; hard_floor: number; deep_clean: number }
}
```

`total_m2` and `floors` are UI concerns only. The engine sums the four per-type m² inputs itself and ignores floors (the spec has no per-floor pricing rule).

### Constants

```ts
export const BASE_RATES = {
  office:    { win_work: 0.60, make_money: 0.80, premium: 1.20 },
  warehouse: { win_work: 0.35, make_money: 0.50, premium: 0.70 },
  retail:    { win_work: 0.70, make_money: 0.90, premium: 1.30 },
  medical:   { win_work: 1.10, make_money: 1.50, premium: 2.20 },
}

export const FIXTURE_RATES = {
  bathroom: { win_work: 25, make_money: 30, premium: 40 },
  kitchen:  { win_work: 15, make_money: 20, premium: 28 },
  desk:     { win_work:  2, make_money:  3, premium:  5 },
  bin:      { win_work:  1, make_money: 1.5, premium:  2 },
  window:    8,   // flat, not mode-dependent
  carpet:    4,   // per m²
  hard_floor: 5,  // per m²
}

export const COMPLEXITY_UPLIFTS = {
  traffic: { low: 0.00, medium: 0.05, high: 0.10 },
  fitout:  { basic: 0.00, standard: 0.05, premium: 0.10 },
  access:  { easy: 0.00, medium: 0.05, hard: 0.15 },
}

export const LOCATION_UPLIFT = { suburban: 0.00, cbd: 0.10, remote: 0.20 }

export const DEEP_CLEAN_MULTIPLIER = 1.5

export const HOURLY_COST = 45
export const MINIMUM_HOURS = 1.5
export const SETUP_TIME = 0.25
export const TRAVEL_TIME = { suburban: 0.25, cbd: 0.30, remote: 0.50 }

export const FIXTURE_HOURS = { bathroom: 0.25, kitchen: 0.20 }

// fitout selects the column within the production-rate table:
// basic -> low column, standard -> medium, premium -> high.
// Warehouse is a flat 300 m²/hr regardless.
export const PRODUCTION_RATES = {
  office:    { low: 120, medium: 100, high: 80 },
  retail:    { low: 120, medium: 100, high: 80 },
  medical:   { low:  90, medium:  80, high: 65 },
  warehouse: { low: 300, medium: 300, high: 300 },
}
```

### Frequency normalisation

```ts
// visits_per_month, effective_visits_per_week
weekly:      visits * 4.33,  visits
fortnightly: visits * 2.165, visits / 2
monthly:     visits,         visits / 4.33
```

### Frequency multiplier, target margin, minimum charge

Bands keyed off `effective_visits_per_week`:

| effWeekly | freq_mul | target_margin | min_charge |
|---|---|---|---|
| ≥ 5 | 0.80 | 0.35 | 120 |
| ≥ 4 | 0.85 | 0.38 | 130 |
| ≥ 3 | 0.90 | 0.40 | 140 |
| ≥ 2 | 0.95 | 0.45 | 150 |
| ≥ 1 | 1.00 | 0.50 | 160 |
| < 1 | 1.15 | 0.55 | 180 |

### Calculation order

Grouped into four passes. All extras are flat one-off values and do not feed into `total_per_clean`, `monthly_value`, or `estimated_hours`.

**Pass 1 — core recurring price (`total_per_clean`):**

1. `area_base = Σ(property_m2 × BASE_RATES[property_type][mode])` — per type, summed.
2. `freq_mul = bandLookup(effective_visits_per_week)`
3. `complexity_mul = 1 + COMPLEXITY_UPLIFTS.traffic[traffic_level] + COMPLEXITY_UPLIFTS.fitout[fitout_level] + COMPLEXITY_UPLIFTS.access[access_difficulty]`
4. `location_mul = 1 + LOCATION_UPLIFT[location_type]`
5. `area_after = area_base × freq_mul × complexity_mul × location_mul`
6. `fixtures = bathrooms × FIXTURE_RATES.bathroom[mode] + kitchens × FIXTURE_RATES.kitchen[mode] + (desks ?? 0) × FIXTURE_RATES.desk[mode] + (bins ?? 0) × FIXTURE_RATES.bin[mode]`
7. `core_subtotal = area_after + fixtures`

Fixtures are added *after* the multipliers because the mode-specific fixture rates already encode the pricing tier, and the spec's calc order lists fixture addition as step 5.

**Pass 2 — labour hours & cost (recurring only):**

8. `area_hours = Σ(property_m2 / productionRate(property_type, fitout_level))` — per-type, summed.
9. `fixture_hours = bathrooms × 0.25 + kitchens × 0.20`
10. `raw_hours = area_hours + fixture_hours + TRAVEL_TIME[location_type] + SETUP_TIME`
11. `estimated_hours = max(raw_hours, MINIMUM_HOURS)`
12. `estimated_cost = estimated_hours × HOURLY_COST`

Windows, carpet, hard floor, deep clean do **not** add to `estimated_hours`.

**Pass 3 — margin check, minimum charge, finalise:**

13. `pre_min_margin = (core_subtotal − estimated_cost) / core_subtotal` (guard against `core_subtotal === 0`).
14. `target_margin = bandLookup(effective_visits_per_week)`. If `pre_min_margin < target_margin` then:
    - `below_target_margin = true`
    - `suggested_price = estimated_cost / (1 − target_margin)` (rounded to 2 dp)
    - Do **not** overwrite `total_per_clean`.
15. `minimum_charge = bandLookup(effective_visits_per_week)`. `total_per_clean = max(core_subtotal, minimum_charge)`. `minimum_applied = total_per_clean > core_subtotal`.
16. `profit = total_per_clean − estimated_cost`. `margin = profit / total_per_clean` (guard against division by zero).
17. `monthly_value = total_per_clean × visits_per_month`.
18. `effective_hourly_rate = total_per_clean / estimated_hours`.
19. `pricing_status`:
    - `margin > 0.55` → `'high_margin'`
    - `0.35 ≤ margin ≤ 0.55` → `'healthy'`
    - `margin < 0.35` → `'tight'`

`below_target_margin` is **not** recalculated in step 16. The flag reflects the pre-minimum-charge margin and is intentional.

**Pass 4 — extras (flat, one-off, not in recurring metrics):**

20. `extras_breakdown.windows    = (windows ?? 0) × FIXTURE_RATES.window`
21. `extras_breakdown.carpet     = (carpet_clean_m2 ?? 0) × FIXTURE_RATES.carpet`
22. `extras_breakdown.hard_floor = (hard_floor_m2 ?? 0) × FIXTURE_RATES.hard_floor`
23. `extras_breakdown.deep_clean = deep_clean ? area_base × (DEEP_CLEAN_MULTIPLIER − 1) : 0` — the *uplift* over a regular clean, not the full 1.5×, because the core clean is already billed in `core_subtotal`.
24. `extras_total = Σ extras_breakdown`

All monetary outputs rounded to 2 dp at the boundary.

## Section 3 — Calculator UI + server action

### New files

```
src/app/portal/commercial-calculator/
  page.tsx                                  — server component; renders the form
  _actions.ts                               — saveCommercialCalculation server action
  _components/
    CommercialCalculatorForm.tsx            — client form + live preview
    ResultSummary.tsx                       — internal-only summary card
```

### `page.tsx`

Mirrors `src/app/portal/contractors/new/page.tsx` exactly: back link, H1, render client form. No data fetching.

### `CommercialCalculatorForm.tsx`

Client component. All inputs controlled with `useState`. Six `<fieldset>` groups with sage-styled legends, matching the existing `Section` primitive used in `ContractorForm.tsx`:

1. **Property** — `property_type` buttons, primary type's m² input visible; a "Mixed site" toggle exposes the other three m² inputs. `floors` optional. `location_type` buttons.
2. **Fixtures** — `bathrooms`, `kitchens` required; `desks`, `bins` optional.
3. **Frequency** — `frequency_type` pills, `visits_per_period` integer (min 1).
4. **Complexity** — three button groups: `traffic_level`, `fitout_level`, `access_difficulty`.
5. **Extras (one-off)** — `windows`, `carpet_clean_m2`, `hard_floor_m2`, `deep_clean` toggle. Fieldset labelled **"One-off extras — not part of recurring service"** to prevent operator confusion.
6. **Pricing mode** — three pills: `win_work | make_money | premium`.

On every input change, the client calls `calculateCommercialPrice(inputs)` (pure function) to re-render `<ResultSummary />` instantly.

### `ResultSummary.tsx`

The calculator is operator-only. "Headline" figures are the prices that will flow to the quote document if the operator proceeds; "Internal only" figures are cost/margin data that must never leave the portal. Two columns:

**Headline (will feed the quote)**
- Price per clean (`total_per_clean`)
- Monthly value (`monthly_value`)
- Effective hourly rate

**Internal only** (visually distinct — muted background, "Internal only" label):
- Estimated hours
- Estimated cost
- Profit
- Margin (%)
- Pricing status chip (`high_margin` / `healthy` / `tight`)

Extras appear in a compact list below when non-zero.

**Warning bar** renders above the columns when any of these are true:
- `below_target_margin` → amber — "Margin is below the {targetMargin}% target for this frequency. Suggested price to hit target: **${suggested_price}**."
- `minimum_applied` → blue — "Minimum charge of ${minimum} applied."
- `pricing_status === 'tight'` → red — "Pricing is tight. Review inputs or raise mode."

`suggested_price` is informational only. There are no extra buttons for it; operators lift price manually on the existing quote override panel if they want to use it.

**Action buttons:**
- **[ Use per-clean price → quote ]**
- **[ Use monthly contract value → quote ]**

Disabled until: sum of `*_m2` > 0, `bathrooms ≥ 0`, `kitchens ≥ 0`, `visits_per_period ≥ 1`. HTML-level validation only.

### Server action `saveCommercialCalculation`

```ts
'use server'
export async function saveCommercialCalculation(
  input: CommercialInputs,
  selected_pricing_view: 'per_clean' | 'monthly',
): Promise<{ id: string } | { error: string }> {
  const supabase = createClient()
  const result = calculateCommercialPrice(input)   // authoritative; never trust client math

  const { data, error } = await supabase
    .from('commercial_calculations')
    .insert({
      inputs: input,
      pricing_mode: input.pricing_mode,
      selected_pricing_view,
      total_per_clean: result.total_per_clean,
      monthly_value: result.monthly_value,
      extras_total: result.extras_total,
      extras_breakdown: result.extras_breakdown,
      estimated_hours: result.estimated_hours,
      estimated_cost: result.estimated_cost,
      profit: result.profit,
      margin: result.margin,
      effective_hourly_rate: result.effective_hourly_rate,
      below_target_margin: result.below_target_margin,
      suggested_price: result.suggested_price,
      minimum_applied: result.minimum_applied,
      pricing_status: result.pricing_status,
    })
    .select('id')
    .single()

  if (error || !data) return { error: `Failed to save calculation: ${error?.message}` }
  return { id: data.id }
}
```

Returns `{ id }` on success. The client component handles navigation via `router.push('/portal/quotes/new?calc_id=' + id)`. No server-side redirect — save and navigate are cleanly separated.

### Sidebar nav entry

One array-element addition to the existing `PortalSidebar` nav list:

```ts
{ href: '/portal/commercial-calculator', label: 'Commercial calculator', icon: Calculator }
```

No restructuring of the sidebar.

## Section 4 — Quote prefill integration

### Files touched (minimum-impact edits)

| File | Change |
|---|---|
| `src/app/portal/quotes/new/page.tsx` | Read `searchParams.calc_id`; if present, fetch the `commercial_calculations` row and pass to the form. ~15 lines added in an `if (calc_id)` block. |
| `src/app/portal/quotes/new/_actions.ts` | `CreateQuoteInput` gains optional `commercial_calc_id?: string`; the insert statement includes it (pass-through). |
| `src/app/portal/quotes/new/_components/NewQuoteForm.tsx` | Accepts optional `calc?: CommercialCalculation` prop; if present, an initialiser branch seeds state from `calc`. All other behaviour unchanged. |

### New helper file

`src/lib/commercialPricingMapping.ts` — pure functions, no deps:

- `mapPricingMode(mode: PricingMode): 'win' | 'standard' | 'premium'`
- `buildCommercialDescription(inputs: CommercialInputs, view: 'per_clean' | 'monthly'): string`
- `buildQuoteItemsFromCalc(calc: CommercialCalculationRow): Array<{ label: string; price: number; sort_order: number }>`

### Prefill matrix

| Quote field | Source |
|---|---|
| `commercial_calc_id` | `calc.id` |
| `pricing_mode` | `mapPricingMode(calc.pricing_mode)` |
| `estimated_hours` | `calc.estimated_hours` |
| `calculated_price` | `calc.selected_pricing_view === 'monthly' ? calc.monthly_value : calc.total_per_clean` |
| `base_price` | Same as `calculated_price` |
| `generated_scope` | `buildCommercialDescription(calc.inputs, calc.selected_pricing_view)` |
| `description_edited` | `true` (locks the commercial wording builder for calc-driven quotes) |
| `service_category` | `'commercial'` |
| `service_type_code` | Existing code matching "commercial contract / recurring service" if present in `quote-wording.ts`; otherwise null. Do not invent a new code. |
| `pricing_breakdown` | Left as the existing default. **No margin, cost, or profit flows to `quotes`.** |
| `addons` (→ `quote_items`) | `buildQuoteItemsFromCalc(calc)` |

### `buildQuoteItemsFromCalc` output

```
sort_order 0: Core bundled line
  label: "Commercial cleaning — recurring service"
  price: selected_pricing_view === 'monthly' ? monthly_value : total_per_clean

sort_order 1: Windows            (only if extras_breakdown.windows > 0)
  label: "Window cleaning — N windows (one-off)"
  price: extras_breakdown.windows

sort_order 2: Carpet             (only if > 0)
  label: "Carpet cleaning — M m² (one-off)"
  price: extras_breakdown.carpet

sort_order 3: Hard floor         (only if > 0)
  label: "Hard floor treatment — P m² (one-off)"
  price: extras_breakdown.hard_floor

sort_order 4: Deep clean uplift  (only if > 0)
  label: "Deep clean — additional uplift (one-off)"
  price: extras_breakdown.deep_clean
```

Extras are never subtracted from the core line and are never scaled by frequency.

### `buildCommercialDescription` — frequency phrasing table

| frequency_type | visits_per_period | Phrase |
|---|---|---|
| weekly | 1 | "once per week" |
| weekly | 2 | "twice per week" |
| weekly | 3 | "three times per week" |
| weekly | 4 | "four times per week" |
| weekly | 5 | "five times per week" |
| weekly | 6 | "six times per week" |
| weekly | 7 | "daily" |
| fortnightly | 1 | "every two weeks" |
| fortnightly | 2 | "twice per fortnight" |
| monthly | 1 | "once per month" |
| monthly | 2 | "twice per month" |
| monthly | N (≥ 3) | "{N} times per month" |

Property phrase: single type → `"500m² office"`; mixed → `"400m² office plus 100m² warehouse"` (non-zero types joined with "plus"). Fixtures phrase: `"with N bathrooms and M kitchens"` (only non-zero included; "and" joins the tail).

Example output: `"Commercial cleaning for a 500m² office with 2 bathrooms and 1 kitchen, serviced twice per week"`.

### End-to-end flow

```
/portal/commercial-calculator
  fill inputs -> live preview
  click [Use per-clean price] or [Use monthly contract value]
  -> saveCommercialCalculation(input, view) returns { id }
  -> router.push('/portal/quotes/new?calc_id=<id>')

/portal/quotes/new?calc_id=<id>
  page.tsx: fetch commercial_calculations by id
  render <NewQuoteForm calc={calc} clients={clients} />
  initial state seeded via mapPricingMode / buildCommercialDescription / buildQuoteItemsFromCalc
  operator picks client, reviews, adjusts any field
  submit -> createQuote(input) with commercial_calc_id
  -> quotes row inserted; quote_items rows written
  -> redirect to /portal/quotes/<new_quote_id>
```

### Guarantees

- Navigating to `/portal/quotes/new` without a `calc_id` is byte-for-byte identical to current behaviour.
- If the fetched calc fails (404 / RLS deny) the page renders the form with no prefill and logs a console warning; no exception thrown.
- The existing commercial category builder is not modified.
- `quote_items` schema is not modified.
- `quotes.pricing_mode` enum values are not changed.
- Internal cost / profit / margin never reach the `quotes` table.

## Section 5 — Pricing-mode mapping

```ts
// src/lib/commercialPricingMapping.ts

import type { PricingMode } from './commercialPricing'

export type QuotePricingMode = 'win' | 'standard' | 'premium'

export function mapPricingMode(mode: PricingMode): QuotePricingMode {
  switch (mode) {
    case 'win_work':   return 'win'
    case 'make_money': return 'standard'
    case 'premium':    return 'premium'
  }
}
```

- Called in exactly one place: the quote prefill initialiser for `NewQuoteForm`.
- No reverse mapping.
- No changes to either enum.

## Testing strategy

- `src/lib/commercialPricing.test.ts` — unit tests for `calculateCommercialPrice`. Cases:
  - Each pricing mode at a representative job (medium-sized office, weekly × 2).
  - Each frequency band edge (1, 2, 3, 4, 5, <1) to verify band lookups.
  - Minimum-charge kick-in path (tiny job, low mode).
  - `below_target_margin` path (complex job under make_money).
  - Mixed property types (office + warehouse) — both price and hours sum correctly.
  - Extras-only calc: windows / carpet / hard floor / deep clean populate `extras_breakdown` and `extras_total`, do not affect `total_per_clean`, `monthly_value`, or `estimated_hours`.
  - Deep clean is priced as the delta (`area_base × 0.5`), not the full 1.5×.
- `src/lib/commercialPricingMapping.test.ts` — unit tests for the three helpers:
  - `mapPricingMode` exhaustive cases.
  - `buildCommercialDescription` for each frequency phrasing + mixed property.
  - `buildQuoteItemsFromCalc` output ordering and extras suppression when zero.

Matches existing lib-colocated test convention (confirm by reading `src/__tests__/` or lib-colocated layout at implementation time).

## File manifest

**New files**
```
docs/db/2026-04-20-commercial-calculator.sql
src/lib/commercialPricing.ts
src/lib/commercialPricing.test.ts
src/lib/commercialPricingMapping.ts
src/lib/commercialPricingMapping.test.ts
src/app/portal/commercial-calculator/page.tsx
src/app/portal/commercial-calculator/_actions.ts
src/app/portal/commercial-calculator/_components/CommercialCalculatorForm.tsx
src/app/portal/commercial-calculator/_components/ResultSummary.tsx
```

**Modified files (minimum-impact edits)**
```
src/app/portal/quotes/new/page.tsx                        — read calc_id, fetch, prop-thread
src/app/portal/quotes/new/_actions.ts                     — CreateQuoteInput gains optional commercial_calc_id
src/app/portal/quotes/new/_components/NewQuoteForm.tsx    — optional calc prop, initial-state seeding branch
src/app/portal/_components/PortalSidebar.tsx              — one new nav-array entry
```

No other files touched.

## Deferred / not in v1

- Retirement of the legacy commercial category builder.
- Per-extra "recurring vs one-off" flags (current design treats all extras as one-off).
- Any price multiplier on fixtures for CBD / remote sites (fixtures are flat per spec).
- "Use suggested price" as a first-class action (deferred to the existing manual override flow).
- Editing a saved calc. v1 is write-once; to revise, the operator creates a new calc.

These are explicit non-decisions to avoid scope creep.
