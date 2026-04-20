# Commercial Pricing Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a plug-in commercial cleaning pricing calculator at `/portal/commercial-calculator` that saves its result to a new `commercial_calculations` table and prefills the existing quote-creation form via `?calc_id=<id>`, without modifying the existing quote pricing engine or commercial builder.

**Architecture:** Pure-TypeScript calculation engine (`src/lib/commercialPricing.ts`) called client-side for live preview and server-side for authoritative save. A sibling helper module (`src/lib/commercialPricingMapping.ts`) translates saved calcs into quote-form inputs. Quote prefill is a **read-and-map only** path — no recalculation in the quote layer. Legacy commercial quote builder is untouched.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind, Supabase (postgres + RLS), Jest.

**Design spec:** `docs/superpowers/specs/2026-04-20-commercial-pricing-calculator-design.md` — every numeric constant, band lookup, and formula quoted in this plan traces back to that spec.

**Guardrails carried from brainstorming** (re-stated here so the implementer never forgets):

1. Quote prefill is **read-and-map only**. No call to `calculateCommercialPrice` from the quote layer.
2. Extras (windows / carpet / hard_floor / deep_clean) never leak into `total_per_clean`, `monthly_value`, or `estimated_hours`.
3. Deep clean is priced as the **uplift delta** (`area_base × 0.5`), not the full 1.5×.
4. `suggested_price` is **informational only** — no new buttons or flag columns.
5. The existing commercial builder is untouched. If you're tempted to edit `QuoteBuilder.tsx`, `quote-wording.ts`, or `quote-pricing.ts`, stop and re-read the design spec's "Out of scope" section.

**TDD expectation:** Tasks 2–6 use test-driven development. For each, the red (failing test) and green (passing test) runs must be executed and verified — the step sequence enforces this.

---

## File structure

**New files (9):**

```
docs/db/2026-04-20-commercial-calculator.sql                                      migration
src/lib/commercialPricing.ts                                                      pure pricing engine
src/lib/__tests__/commercialPricing.test.ts                                       engine tests
src/lib/commercialPricingMapping.ts                                               pure mapping helpers
src/lib/__tests__/commercialPricingMapping.test.ts                                mapping tests
src/app/portal/commercial-calculator/page.tsx                                     server page
src/app/portal/commercial-calculator/_actions.ts                                  server action
src/app/portal/commercial-calculator/_components/CommercialCalculatorForm.tsx     client form + live preview
src/app/portal/commercial-calculator/_components/ResultSummary.tsx                summary card
```

**Modified files (4, minimum-impact edits only):**

```
src/app/portal/_components/PortalSidebar.tsx                                      add one nav entry
src/app/portal/quotes/new/page.tsx                                                read calc_id, fetch, prop-thread
src/app/portal/quotes/new/_actions.ts                                             CreateQuoteInput + commercial_calc_id
src/app/portal/quotes/new/_components/NewQuoteForm.tsx                            accept optional calc prop, seed state
```

---

## Task 1: Create the database migration

**Files:**
- Create: `docs/db/2026-04-20-commercial-calculator.sql`

This task is SQL-only; it is applied manually via the Supabase dashboard SQL editor per existing repo convention, so there is no automated verification beyond reading the statement back and a post-apply sanity query.

- [ ] **Step 1: Create the migration file**

Path: `docs/db/2026-04-20-commercial-calculator.sql`

```sql
-- Commercial pricing calculator
-- Adds commercial_calculations table + quotes.commercial_calc_id FK.
-- Idempotent via IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public.commercial_calculations (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inputs                   jsonb NOT NULL,
  pricing_mode             text NOT NULL,
  selected_pricing_view    text NULL,
  total_per_clean          numeric NOT NULL,
  monthly_value            numeric NOT NULL,
  extras_total             numeric NOT NULL DEFAULT 0,
  extras_breakdown         jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_hours          numeric NOT NULL,
  estimated_cost           numeric NOT NULL,
  profit                   numeric NOT NULL,
  margin                   numeric NOT NULL,
  effective_hourly_rate    numeric NOT NULL,
  below_target_margin      boolean NOT NULL DEFAULT false,
  suggested_price          numeric NULL,
  minimum_applied          boolean NOT NULL DEFAULT false,
  pricing_status           text NULL,
  created_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS commercial_calc_id uuid
    REFERENCES public.commercial_calculations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_commercial_calc_id
  ON public.quotes (commercial_calc_id) WHERE commercial_calc_id IS NOT NULL;

ALTER TABLE public.commercial_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated users full access"
  ON public.commercial_calculations;

CREATE POLICY "authenticated users full access"
  ON public.commercial_calculations
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Apply the migration to Supabase**

Open the Supabase dashboard → SQL editor → paste the file contents → Run. Expected: "Success. No rows returned." If any statement reports "already exists" it's safe — the file is idempotent and intended to be re-runnable.

- [ ] **Step 3: Verify the table exists**

Run this query in the SQL editor:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'commercial_calculations'
ORDER BY ordinal_position;
```

Expected: 17 rows. `id`, `inputs`, `pricing_mode`, `selected_pricing_view`, `total_per_clean`, `monthly_value`, `extras_total`, `extras_breakdown`, `estimated_hours`, `estimated_cost`, `profit`, `margin`, `effective_hourly_rate`, `below_target_margin`, `suggested_price`, `minimum_applied`, `pricing_status`, `created_at`.

Also verify the FK on quotes:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='quotes' AND column_name='commercial_calc_id';
```

Expected: one row.

- [ ] **Step 4: Commit**

```bash
git add docs/db/2026-04-20-commercial-calculator.sql
git commit -m "db: add commercial_calculations table and quotes.commercial_calc_id FK"
```

---

## Task 2: Pricing engine — types, constants, helpers (TDD)

**Files:**
- Create: `src/lib/commercialPricing.ts`
- Create: `src/lib/__tests__/commercialPricing.test.ts`

This task stops short of the full `calculateCommercialPrice` function — Task 3 handles that. Here we build the deterministic helpers (frequency normalisation, band lookups) and prove them in isolation.

- [ ] **Step 1: Write failing test for helpers**

Path: `src/lib/__tests__/commercialPricing.test.ts`

```ts
import {
  BASE_RATES,
  FIXTURE_RATES,
  COMPLEXITY_UPLIFTS,
  LOCATION_UPLIFT,
  DEEP_CLEAN_MULTIPLIER,
  HOURLY_COST,
  MINIMUM_HOURS,
  SETUP_TIME,
  TRAVEL_TIME,
  FIXTURE_HOURS,
  PRODUCTION_RATES,
  normaliseFrequency,
  frequencyMultiplier,
  targetMargin,
  minimumCharge,
} from '../commercialPricing'

describe('commercialPricing — constants', () => {
  it('exposes spec-accurate base rates', () => {
    expect(BASE_RATES.office.make_money).toBe(0.80)
    expect(BASE_RATES.warehouse.win_work).toBe(0.35)
    expect(BASE_RATES.medical.premium).toBe(2.20)
  })

  it('exposes fixture rates with flat windows/carpet/hard_floor', () => {
    expect(FIXTURE_RATES.bathroom.make_money).toBe(30)
    expect(FIXTURE_RATES.window).toBe(8)
    expect(FIXTURE_RATES.carpet).toBe(4)
    expect(FIXTURE_RATES.hard_floor).toBe(5)
  })

  it('exposes complexity uplifts (matches spec values)', () => {
    expect(COMPLEXITY_UPLIFTS.traffic.high).toBe(0.10)
    expect(COMPLEXITY_UPLIFTS.fitout.premium).toBe(0.10)
    expect(COMPLEXITY_UPLIFTS.access.hard).toBe(0.15)
  })

  it('exposes location uplift, deep clean multiplier, hourly cost, min hours', () => {
    expect(LOCATION_UPLIFT.cbd).toBe(0.10)
    expect(LOCATION_UPLIFT.remote).toBe(0.20)
    expect(DEEP_CLEAN_MULTIPLIER).toBe(1.5)
    expect(HOURLY_COST).toBe(45)
    expect(MINIMUM_HOURS).toBe(1.5)
    expect(SETUP_TIME).toBe(0.25)
    expect(TRAVEL_TIME.cbd).toBe(0.30)
    expect(FIXTURE_HOURS.bathroom).toBe(0.25)
    expect(PRODUCTION_RATES.warehouse.low).toBe(300)
  })
})

describe('commercialPricing — normaliseFrequency', () => {
  it('weekly: visits_per_month = visits × 4.33, effective = visits', () => {
    const r = normaliseFrequency('weekly', 2)
    expect(r.visits_per_month).toBeCloseTo(8.66, 2)
    expect(r.effective_visits_per_week).toBe(2)
  })

  it('fortnightly: visits_per_month = visits × 2.165, effective = visits / 2', () => {
    const r = normaliseFrequency('fortnightly', 1)
    expect(r.visits_per_month).toBeCloseTo(2.165, 3)
    expect(r.effective_visits_per_week).toBe(0.5)
  })

  it('monthly: visits_per_month = visits, effective = visits / 4.33', () => {
    const r = normaliseFrequency('monthly', 1)
    expect(r.visits_per_month).toBe(1)
    expect(r.effective_visits_per_week).toBeCloseTo(0.231, 3)
  })
})

describe('commercialPricing — band lookups', () => {
  it('frequencyMultiplier bands (0.80 / 0.85 / 0.90 / 0.95 / 1.00 / 1.15)', () => {
    expect(frequencyMultiplier(5)).toBe(0.80)
    expect(frequencyMultiplier(4)).toBe(0.85)
    expect(frequencyMultiplier(3)).toBe(0.90)
    expect(frequencyMultiplier(2)).toBe(0.95)
    expect(frequencyMultiplier(1)).toBe(1.00)
    expect(frequencyMultiplier(0.5)).toBe(1.15)
  })

  it('targetMargin bands (0.35 / 0.38 / 0.40 / 0.45 / 0.50 / 0.55)', () => {
    expect(targetMargin(5)).toBe(0.35)
    expect(targetMargin(3)).toBe(0.40)
    expect(targetMargin(0.5)).toBe(0.55)
  })

  it('minimumCharge bands (120 / 130 / 140 / 150 / 160 / 180)', () => {
    expect(minimumCharge(5)).toBe(120)
    expect(minimumCharge(3)).toBe(140)
    expect(minimumCharge(0.5)).toBe(180)
  })
})
```

- [ ] **Step 2: Run to verify red**

```bash
npx jest src/lib/__tests__/commercialPricing.test.ts
```

Expected: fails with "Cannot find module '../commercialPricing'".

- [ ] **Step 3: Create the engine module with types, constants, and helpers**

Path: `src/lib/commercialPricing.ts`

```ts
// Pure TypeScript. No React, no Supabase imports.
// All constants exported so they can be tuned without touching the calc order.

export type PropertyType = 'office' | 'warehouse' | 'retail' | 'medical'
export type LocationType = 'suburban' | 'cbd' | 'remote'
export type FrequencyType = 'weekly' | 'fortnightly' | 'monthly'
export type TrafficLevel = 'low' | 'medium' | 'high'
export type FitoutLevel = 'basic' | 'standard' | 'premium'
export type AccessDifficulty = 'easy' | 'medium' | 'hard'
export type PricingMode = 'win_work' | 'make_money' | 'premium'
export type PricingStatus = 'high_margin' | 'healthy' | 'tight'
export type PricingView = 'per_clean' | 'monthly'

export interface CommercialInputs {
  property_type: PropertyType
  office_m2?: number
  warehouse_m2?: number
  retail_m2?: number
  medical_m2?: number
  total_m2?: number
  floors?: number
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

export interface ExtrasBreakdown {
  windows: number
  carpet: number
  hard_floor: number
  deep_clean: number
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
  extras_breakdown: ExtrasBreakdown
}

// ─ Constants (spec-accurate) ───────────────────────────────────────

export const BASE_RATES: Record<PropertyType, Record<PricingMode, number>> = {
  office:    { win_work: 0.60, make_money: 0.80, premium: 1.20 },
  warehouse: { win_work: 0.35, make_money: 0.50, premium: 0.70 },
  retail:    { win_work: 0.70, make_money: 0.90, premium: 1.30 },
  medical:   { win_work: 1.10, make_money: 1.50, premium: 2.20 },
}

export const FIXTURE_RATES = {
  bathroom: { win_work: 25, make_money: 30, premium: 40 } as Record<PricingMode, number>,
  kitchen:  { win_work: 15, make_money: 20, premium: 28 } as Record<PricingMode, number>,
  desk:     { win_work:  2, make_money:  3, premium:  5 } as Record<PricingMode, number>,
  bin:      { win_work:  1, make_money: 1.5, premium:  2 } as Record<PricingMode, number>,
  window:    8,
  carpet:    4,
  hard_floor: 5,
} as const

export const COMPLEXITY_UPLIFTS = {
  traffic: { low: 0.00, medium: 0.05, high: 0.10 } as Record<TrafficLevel, number>,
  fitout:  { basic: 0.00, standard: 0.05, premium: 0.10 } as Record<FitoutLevel, number>,
  access:  { easy: 0.00, medium: 0.05, hard: 0.15 } as Record<AccessDifficulty, number>,
}

export const LOCATION_UPLIFT: Record<LocationType, number> = {
  suburban: 0.00,
  cbd:      0.10,
  remote:   0.20,
}

export const DEEP_CLEAN_MULTIPLIER = 1.5

export const HOURLY_COST = 45
export const MINIMUM_HOURS = 1.5
export const SETUP_TIME = 0.25

export const TRAVEL_TIME: Record<LocationType, number> = {
  suburban: 0.25,
  cbd:      0.30,
  remote:   0.50,
}

export const FIXTURE_HOURS = { bathroom: 0.25, kitchen: 0.20 }

// fitout selects the column within this table:
// basic -> low, standard -> medium, premium -> high
// warehouse is a flat 300 m²/hr regardless of fitout
export const PRODUCTION_RATES: Record<PropertyType, { low: number; medium: number; high: number }> = {
  office:    { low: 120, medium: 100, high: 80 },
  retail:    { low: 120, medium: 100, high: 80 },
  medical:   { low:  90, medium:  80, high: 65 },
  warehouse: { low: 300, medium: 300, high: 300 },
}

// ─ Helpers ─────────────────────────────────────────────────────────

export interface FrequencyNormal {
  visits_per_month: number
  effective_visits_per_week: number
}

export function normaliseFrequency(
  frequency_type: FrequencyType,
  visits_per_period: number,
): FrequencyNormal {
  switch (frequency_type) {
    case 'weekly':
      return {
        visits_per_month: visits_per_period * 4.33,
        effective_visits_per_week: visits_per_period,
      }
    case 'fortnightly':
      return {
        visits_per_month: visits_per_period * 2.165,
        effective_visits_per_week: visits_per_period / 2,
      }
    case 'monthly':
      return {
        visits_per_month: visits_per_period,
        effective_visits_per_week: visits_per_period / 4.33,
      }
  }
}

export function frequencyMultiplier(effectiveVisitsPerWeek: number): number {
  if (effectiveVisitsPerWeek >= 5) return 0.80
  if (effectiveVisitsPerWeek >= 4) return 0.85
  if (effectiveVisitsPerWeek >= 3) return 0.90
  if (effectiveVisitsPerWeek >= 2) return 0.95
  if (effectiveVisitsPerWeek >= 1) return 1.00
  return 1.15
}

export function targetMargin(effectiveVisitsPerWeek: number): number {
  if (effectiveVisitsPerWeek >= 5) return 0.35
  if (effectiveVisitsPerWeek >= 4) return 0.38
  if (effectiveVisitsPerWeek >= 3) return 0.40
  if (effectiveVisitsPerWeek >= 2) return 0.45
  if (effectiveVisitsPerWeek >= 1) return 0.50
  return 0.55
}

export function minimumCharge(effectiveVisitsPerWeek: number): number {
  if (effectiveVisitsPerWeek >= 5) return 120
  if (effectiveVisitsPerWeek >= 4) return 130
  if (effectiveVisitsPerWeek >= 3) return 140
  if (effectiveVisitsPerWeek >= 2) return 150
  if (effectiveVisitsPerWeek >= 1) return 160
  return 180
}

// calculateCommercialPrice will be added in Task 3.
```

- [ ] **Step 4: Run to verify green**

```bash
npx jest src/lib/__tests__/commercialPricing.test.ts
```

Expected: all test cases pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/commercialPricing.ts src/lib/__tests__/commercialPricing.test.ts
git commit -m "feat(commercial): add pricing engine types, constants, and frequency helpers"
```

---

## Task 3: Pricing engine — `calculateCommercialPrice` (TDD)

**Files:**
- Modify: `src/lib/commercialPricing.ts` (append `calculateCommercialPrice` + private helpers)
- Modify: `src/lib/__tests__/commercialPricing.test.ts` (append scenario tests)

- [ ] **Step 1: Write failing tests for each calculation scenario**

Append to `src/lib/__tests__/commercialPricing.test.ts`:

```ts
import { calculateCommercialPrice, type CommercialInputs } from '../commercialPricing'

function baseInputs(over: Partial<CommercialInputs> = {}): CommercialInputs {
  return {
    property_type: 'office',
    office_m2: 500,
    warehouse_m2: 0,
    retail_m2: 0,
    medical_m2: 0,
    location_type: 'suburban',
    bathrooms: 2,
    kitchens: 1,
    windows: 0,
    desks: 0,
    bins: 0,
    frequency_type: 'weekly',
    visits_per_period: 2,
    traffic_level: 'medium',
    fitout_level: 'standard',
    access_difficulty: 'easy',
    carpet_clean_m2: 0,
    hard_floor_m2: 0,
    deep_clean: false,
    pricing_mode: 'make_money',
    ...over,
  }
}

describe('calculateCommercialPrice — office, make_money, weekly x2', () => {
  const r = calculateCommercialPrice(baseInputs())

  it('returns all required fields', () => {
    expect(r).toHaveProperty('total_per_clean')
    expect(r).toHaveProperty('monthly_value')
    expect(r).toHaveProperty('estimated_hours')
    expect(r).toHaveProperty('estimated_cost')
    expect(r).toHaveProperty('profit')
    expect(r).toHaveProperty('margin')
    expect(r).toHaveProperty('effective_hourly_rate')
    expect(r).toHaveProperty('below_target_margin')
    expect(r).toHaveProperty('suggested_price')
    expect(r).toHaveProperty('minimum_applied')
    expect(r).toHaveProperty('pricing_status')
    expect(r).toHaveProperty('extras_total')
    expect(r).toHaveProperty('extras_breakdown')
  })

  it('computes core_subtotal = area_after + fixtures', () => {
    // area_base   = 500 * 0.80              = 400
    // freq_mul    = 0.95 (effWeekly=2)
    // complexity  = 1 + 0.05 + 0.05 + 0     = 1.10
    // location    = 1 + 0                   = 1.00
    // area_after  = 400 * 0.95 * 1.10 * 1   = 418.00
    // fixtures    = 2*30 + 1*20             = 80
    // core        = 498.00
    expect(r.total_per_clean).toBeCloseTo(498.00, 2)
  })

  it('extras are all zero when no extras chosen', () => {
    expect(r.extras_total).toBe(0)
    expect(r.extras_breakdown).toEqual({ windows: 0, carpet: 0, hard_floor: 0, deep_clean: 0 })
  })

  it('monthly_value = total_per_clean × visits_per_month (weekly × 2 = 8.66 visits/month)', () => {
    expect(r.monthly_value).toBeCloseTo(498.00 * 8.66, 1)
  })
})

describe('calculateCommercialPrice — minimum charge kicks in', () => {
  // tiny job: 20 m² office, weekly x1, win_work
  // area_base = 20 * 0.60 = 12
  // freq = 1.00, complexity = 1, location = 1 -> area_after = 12
  // fixtures = 0
  // core_subtotal = 12
  // min_charge (effWeekly=1) = 160
  const r = calculateCommercialPrice(baseInputs({
    office_m2: 20,
    bathrooms: 0,
    kitchens: 0,
    visits_per_period: 1,
    traffic_level: 'low',
    fitout_level: 'basic',
    pricing_mode: 'win_work',
  }))

  it('lifts total_per_clean to the minimum charge', () => {
    expect(r.total_per_clean).toBe(160)
    expect(r.minimum_applied).toBe(true)
  })
})

describe('calculateCommercialPrice — below_target_margin flag', () => {
  // heavy, cheap job: 2000 m² office, weekly x5, win_work
  // area_base = 2000 * 0.60 = 1200
  // freq = 0.80, complexity = 1 + 0 + 0 + 0 = 1.00, location = 1
  // area_after = 960; fixtures = 0 -> core = 960
  // area_hours: office+basic fitout -> rate 120 m²/hr; 2000/120 = 16.67
  // + setup 0.25 + travel 0.25 = 17.17 -> estimated_hours = 17.17
  // estimated_cost = 17.17 * 45 = 772.65
  // pre_min_margin = (960 - 772.65) / 960 = 0.195
  // target_margin at effWeekly=5 = 0.35 -> BELOW TARGET
  const r = calculateCommercialPrice(baseInputs({
    office_m2: 2000,
    bathrooms: 0,
    kitchens: 0,
    visits_per_period: 5,
    traffic_level: 'low',
    fitout_level: 'basic',
    pricing_mode: 'win_work',
  }))

  it('sets below_target_margin=true and emits a suggested_price', () => {
    expect(r.below_target_margin).toBe(true)
    expect(r.suggested_price).not.toBeNull()
    // suggested_price = estimated_cost / (1 - 0.35)
    expect(r.suggested_price!).toBeCloseTo(r.estimated_cost / 0.65, 1)
  })

  it('does not overwrite total_per_clean with suggested_price', () => {
    // total_per_clean stays at core (since min_charge 120 < 960)
    expect(r.total_per_clean).toBeCloseTo(960, 2)
  })
})

describe('calculateCommercialPrice — extras are one-off and do not leak into recurring metrics', () => {
  // baseline without extras
  const bare = calculateCommercialPrice(baseInputs())
  // same but with windows + carpet + hard floor + deep clean
  const withExtras = calculateCommercialPrice(baseInputs({
    windows: 10,
    carpet_clean_m2: 50,
    hard_floor_m2: 30,
    deep_clean: true,
  }))

  it('total_per_clean is identical with and without extras', () => {
    expect(withExtras.total_per_clean).toBeCloseTo(bare.total_per_clean, 2)
  })

  it('monthly_value is identical with and without extras', () => {
    expect(withExtras.monthly_value).toBeCloseTo(bare.monthly_value, 2)
  })

  it('estimated_hours is identical with and without extras', () => {
    expect(withExtras.estimated_hours).toBeCloseTo(bare.estimated_hours, 3)
  })

  it('populates extras_breakdown with spec-accurate flat rates', () => {
    expect(withExtras.extras_breakdown.windows).toBe(80)       // 10 * 8
    expect(withExtras.extras_breakdown.carpet).toBe(200)       // 50 * 4
    expect(withExtras.extras_breakdown.hard_floor).toBe(150)   // 30 * 5
  })

  it('deep_clean is priced as area_base × (1.5 - 1), not full 1.5×', () => {
    // baseInputs uses 500 m² office, make_money, so area_base = 400
    // deep_clean extra = 400 * 0.5 = 200
    expect(withExtras.extras_breakdown.deep_clean).toBeCloseTo(200, 2)
  })

  it('extras_total = sum of breakdown', () => {
    expect(withExtras.extras_total).toBeCloseTo(80 + 200 + 150 + 200, 2)
  })
})

describe('calculateCommercialPrice — mixed property types', () => {
  // 400 m² office + 100 m² warehouse, make_money, weekly x1
  // area_base = 400*0.80 + 100*0.50 = 320 + 50 = 370
  // freq = 1.00, complexity (mid/std/easy) = 1.10, location = 1
  // area_after = 370 * 1.10 = 407
  // fixtures = 60 (2 bathrooms) + 20 (1 kitchen) = 80
  // core = 487
  const r = calculateCommercialPrice(baseInputs({
    office_m2: 400,
    warehouse_m2: 100,
    visits_per_period: 1,
  }))

  it('sums per-type m² × base-rate correctly', () => {
    expect(r.total_per_clean).toBeCloseTo(487, 2)
  })

  it('sums per-type area_hours correctly', () => {
    // office 400/100 = 4.0, warehouse 100/300 = 0.333
    // fixture_hours = 2*0.25 + 1*0.20 = 0.70
    // travel + setup = 0.25 + 0.25 = 0.50
    // total = 5.533
    expect(r.estimated_hours).toBeCloseTo(5.533, 2)
  })
})

describe('calculateCommercialPrice — estimated_hours floors at MINIMUM_HOURS (1.5)', () => {
  // tiny office, basic fitout — raw hours would be < 1.5
  const r = calculateCommercialPrice(baseInputs({
    office_m2: 20,
    bathrooms: 0,
    kitchens: 0,
    fitout_level: 'basic',
    traffic_level: 'low',
  }))

  expect(r.estimated_hours).toBe(1.5)
})

describe('calculateCommercialPrice — pricing_status bands', () => {
  // Test the margin -> status mapping via three constructed cases
  // margin > 0.55 -> high_margin (premium mode small job)
  const high = calculateCommercialPrice(baseInputs({ pricing_mode: 'premium', office_m2: 1000, visits_per_period: 1 }))
  expect(high.pricing_status).toBe('high_margin')

  // margin in [0.35, 0.55] -> healthy (make_money moderate)
  const healthy = calculateCommercialPrice(baseInputs({ pricing_mode: 'make_money' }))
  expect(healthy.pricing_status).toBe('healthy')

  // margin < 0.35 -> tight (win_work large cheap job)
  const tight = calculateCommercialPrice(baseInputs({
    pricing_mode: 'win_work',
    office_m2: 2000,
    visits_per_period: 5,
    traffic_level: 'low',
    fitout_level: 'basic',
  }))
  expect(tight.pricing_status).toBe('tight')
})
```

- [ ] **Step 2: Run to verify red**

```bash
npx jest src/lib/__tests__/commercialPricing.test.ts
```

Expected: tests fail because `calculateCommercialPrice` is not yet exported.

- [ ] **Step 3: Implement `calculateCommercialPrice`**

Append to `src/lib/commercialPricing.ts` (replace the `// calculateCommercialPrice will be added in Task 3.` marker):

```ts
// ─ Main function ───────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function fitoutColumn(level: FitoutLevel): 'low' | 'medium' | 'high' {
  // per spec: basic -> low column, standard -> medium, premium -> high
  if (level === 'basic')    return 'low'
  if (level === 'standard') return 'medium'
  return 'high'
}

function pricingStatusFromMargin(margin: number): PricingStatus {
  if (margin > 0.55) return 'high_margin'
  if (margin >= 0.35) return 'healthy'
  return 'tight'
}

export function calculateCommercialPrice(input: CommercialInputs): CommercialResult {
  const mode = input.pricing_mode

  // ── Pass 1: core recurring price ──

  const office_m2    = input.office_m2    ?? 0
  const warehouse_m2 = input.warehouse_m2 ?? 0
  const retail_m2    = input.retail_m2    ?? 0
  const medical_m2   = input.medical_m2   ?? 0

  const area_base =
    office_m2    * BASE_RATES.office[mode] +
    warehouse_m2 * BASE_RATES.warehouse[mode] +
    retail_m2    * BASE_RATES.retail[mode] +
    medical_m2   * BASE_RATES.medical[mode]

  const { visits_per_month, effective_visits_per_week } =
    normaliseFrequency(input.frequency_type, input.visits_per_period)

  const freq_mul = frequencyMultiplier(effective_visits_per_week)
  const complexity_mul =
    1 +
    COMPLEXITY_UPLIFTS.traffic[input.traffic_level] +
    COMPLEXITY_UPLIFTS.fitout[input.fitout_level] +
    COMPLEXITY_UPLIFTS.access[input.access_difficulty]
  const location_mul = 1 + LOCATION_UPLIFT[input.location_type]

  const area_after = area_base * freq_mul * complexity_mul * location_mul

  const fixtures =
    input.bathrooms * FIXTURE_RATES.bathroom[mode] +
    input.kitchens  * FIXTURE_RATES.kitchen[mode] +
    (input.desks ?? 0) * FIXTURE_RATES.desk[mode] +
    (input.bins  ?? 0) * FIXTURE_RATES.bin[mode]

  const core_subtotal = area_after + fixtures

  // ── Pass 2: hours & cost (recurring only) ──

  const col = fitoutColumn(input.fitout_level)

  const area_hours =
    office_m2    / PRODUCTION_RATES.office[col] +
    warehouse_m2 / PRODUCTION_RATES.warehouse[col] +
    retail_m2    / PRODUCTION_RATES.retail[col] +
    medical_m2   / PRODUCTION_RATES.medical[col]

  const fixture_hours =
    input.bathrooms * FIXTURE_HOURS.bathroom +
    input.kitchens  * FIXTURE_HOURS.kitchen

  const raw_hours =
    area_hours + fixture_hours + TRAVEL_TIME[input.location_type] + SETUP_TIME
  const estimated_hours_raw = Math.max(raw_hours, MINIMUM_HOURS)
  const estimated_hours = round2(estimated_hours_raw)
  const estimated_cost = round2(estimated_hours * HOURLY_COST)

  // ── Pass 3: margin check, minimum charge, finalise ──

  const pre_min_margin = core_subtotal > 0
    ? (core_subtotal - estimated_cost) / core_subtotal
    : 0
  const target_margin = targetMargin(effective_visits_per_week)

  let below_target_margin = false
  let suggested_price: number | null = null
  if (pre_min_margin < target_margin) {
    below_target_margin = true
    suggested_price = round2(estimated_cost / (1 - target_margin))
  }

  const min_charge = minimumCharge(effective_visits_per_week)
  const total_per_clean = round2(Math.max(core_subtotal, min_charge))
  const minimum_applied = total_per_clean > round2(core_subtotal)

  const profit = round2(total_per_clean - estimated_cost)
  const margin = total_per_clean > 0 ? profit / total_per_clean : 0
  const monthly_value = round2(total_per_clean * visits_per_month)
  const effective_hourly_rate = estimated_hours > 0
    ? round2(total_per_clean / estimated_hours)
    : 0
  const pricing_status = pricingStatusFromMargin(margin)

  // ── Pass 4: extras (flat, one-off, not in recurring metrics) ──

  const windows      = round2((input.windows         ?? 0) * FIXTURE_RATES.window)
  const carpet       = round2((input.carpet_clean_m2 ?? 0) * FIXTURE_RATES.carpet)
  const hard_floor   = round2((input.hard_floor_m2   ?? 0) * FIXTURE_RATES.hard_floor)
  // Deep clean: uplift delta only — core clean already billed in core_subtotal.
  const deep_clean   = input.deep_clean
    ? round2(area_base * (DEEP_CLEAN_MULTIPLIER - 1))
    : 0

  const extras_breakdown: ExtrasBreakdown = { windows, carpet, hard_floor, deep_clean }
  const extras_total = round2(windows + carpet + hard_floor + deep_clean)

  return {
    total_per_clean,
    monthly_value,
    estimated_hours,
    estimated_cost,
    profit,
    margin: round2(margin * 100) / 100, // keep 2 dp as a fraction (e.g. 0.42 for 42%)
    effective_hourly_rate,
    below_target_margin,
    suggested_price,
    minimum_applied,
    pricing_status,
    extras_total,
    extras_breakdown,
  }
}
```

- [ ] **Step 4: Run to verify green**

```bash
npx jest src/lib/__tests__/commercialPricing.test.ts
```

Expected: **all** test cases pass. If any fail, re-read the spec's Section 2 and reconcile — do not relax test expectations to make them green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/commercialPricing.ts src/lib/__tests__/commercialPricing.test.ts
git commit -m "feat(commercial): implement calculateCommercialPrice with full spec coverage"
```

---

## Task 4: `mapPricingMode` helper (TDD)

**Files:**
- Create: `src/lib/commercialPricingMapping.ts`
- Create: `src/lib/__tests__/commercialPricingMapping.test.ts`

- [ ] **Step 1: Write failing test**

Path: `src/lib/__tests__/commercialPricingMapping.test.ts`

```ts
import { mapPricingMode } from '../commercialPricingMapping'

describe('mapPricingMode', () => {
  it('maps win_work -> win', () => {
    expect(mapPricingMode('win_work')).toBe('win')
  })
  it('maps make_money -> standard', () => {
    expect(mapPricingMode('make_money')).toBe('standard')
  })
  it('maps premium -> premium', () => {
    expect(mapPricingMode('premium')).toBe('premium')
  })
})
```

- [ ] **Step 2: Run to verify red**

```bash
npx jest src/lib/__tests__/commercialPricingMapping.test.ts
```

Expected: fails with "Cannot find module '../commercialPricingMapping'".

- [ ] **Step 3: Create the mapping module with `mapPricingMode`**

Path: `src/lib/commercialPricingMapping.ts`

```ts
import type { PricingMode } from './commercialPricing'

export type QuotePricingMode = 'win' | 'standard' | 'premium'

export function mapPricingMode(mode: PricingMode): QuotePricingMode {
  switch (mode) {
    case 'win_work':   return 'win'
    case 'make_money': return 'standard'
    case 'premium':    return 'premium'
  }
}

// buildCommercialDescription + buildQuoteItemsFromCalc will be added in later tasks.
```

- [ ] **Step 4: Run to verify green**

```bash
npx jest src/lib/__tests__/commercialPricingMapping.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/commercialPricingMapping.ts src/lib/__tests__/commercialPricingMapping.test.ts
git commit -m "feat(commercial): add mapPricingMode helper"
```

---

## Task 5: `buildCommercialDescription` (TDD)

**Files:**
- Modify: `src/lib/commercialPricingMapping.ts`
- Modify: `src/lib/__tests__/commercialPricingMapping.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/lib/__tests__/commercialPricingMapping.test.ts`:

```ts
import { buildCommercialDescription } from '../commercialPricingMapping'
import type { CommercialInputs } from '../commercialPricing'

function descInputs(over: Partial<CommercialInputs> = {}): CommercialInputs {
  return {
    property_type: 'office',
    office_m2: 500,
    warehouse_m2: 0, retail_m2: 0, medical_m2: 0,
    location_type: 'suburban',
    bathrooms: 2, kitchens: 1,
    frequency_type: 'weekly',
    visits_per_period: 2,
    traffic_level: 'medium', fitout_level: 'standard', access_difficulty: 'easy',
    pricing_mode: 'make_money',
    ...over,
  }
}

describe('buildCommercialDescription', () => {
  it('single-property weekly x2 matches spec example', () => {
    const out = buildCommercialDescription(descInputs(), 'per_clean')
    expect(out).toBe('Commercial cleaning for a 500m² office with 2 bathrooms and 1 kitchen, serviced twice per week')
  })

  it('weekly 1/2/3/4/5/6/7 render as once / twice / three / four / five / six / daily', () => {
    const f = (v: number) => buildCommercialDescription(descInputs({ visits_per_period: v, bathrooms: 0, kitchens: 0 }), 'per_clean')
    expect(f(1)).toContain('once per week')
    expect(f(2)).toContain('twice per week')
    expect(f(3)).toContain('three times per week')
    expect(f(4)).toContain('four times per week')
    expect(f(5)).toContain('five times per week')
    expect(f(6)).toContain('six times per week')
    expect(f(7)).toContain('daily')
  })

  it('fortnightly renders as "every two weeks" (x1) and "twice per fortnight" (x2)', () => {
    expect(buildCommercialDescription(descInputs({ frequency_type: 'fortnightly', visits_per_period: 1, bathrooms: 0, kitchens: 0 }), 'per_clean'))
      .toContain('every two weeks')
    expect(buildCommercialDescription(descInputs({ frequency_type: 'fortnightly', visits_per_period: 2, bathrooms: 0, kitchens: 0 }), 'per_clean'))
      .toContain('twice per fortnight')
  })

  it('monthly 1/2/3 render as once / twice / 3 times per month', () => {
    const f = (v: number) => buildCommercialDescription(descInputs({ frequency_type: 'monthly', visits_per_period: v, bathrooms: 0, kitchens: 0 }), 'per_clean')
    expect(f(1)).toContain('once per month')
    expect(f(2)).toContain('twice per month')
    expect(f(3)).toContain('3 times per month')
  })

  it('mixed properties listed with "plus"', () => {
    const out = buildCommercialDescription(descInputs({ office_m2: 400, warehouse_m2: 100, bathrooms: 0, kitchens: 0 }), 'per_clean')
    expect(out).toContain('400m² office plus 100m² warehouse')
  })

  it('omits fixtures when both bathrooms and kitchens are zero', () => {
    const out = buildCommercialDescription(descInputs({ bathrooms: 0, kitchens: 0 }), 'per_clean')
    expect(out).not.toContain('bathrooms')
    expect(out).not.toContain('kitchen')
  })

  it('lists only the non-zero fixture when one is zero', () => {
    expect(buildCommercialDescription(descInputs({ bathrooms: 2, kitchens: 0 }), 'per_clean')).toContain('with 2 bathrooms')
    expect(buildCommercialDescription(descInputs({ bathrooms: 0, kitchens: 1 }), 'per_clean')).toContain('with 1 kitchen')
  })
})
```

- [ ] **Step 2: Run to verify red**

```bash
npx jest src/lib/__tests__/commercialPricingMapping.test.ts
```

Expected: tests fail because `buildCommercialDescription` is not exported.

- [ ] **Step 3: Implement `buildCommercialDescription`**

Replace the `// buildCommercialDescription + buildQuoteItemsFromCalc will be added in later tasks.` marker in `src/lib/commercialPricingMapping.ts` with:

```ts
import type {
  CommercialInputs,
  PricingView,
  PropertyType,
} from './commercialPricing'

const PROPERTY_LABEL: Record<PropertyType, string> = {
  office: 'office',
  warehouse: 'warehouse',
  retail: 'retail space',
  medical: 'medical space',
}

function propertyPhrase(input: CommercialInputs): string {
  const parts: string[] = []
  if ((input.office_m2    ?? 0) > 0) parts.push(`${input.office_m2}m² ${PROPERTY_LABEL.office}`)
  if ((input.warehouse_m2 ?? 0) > 0) parts.push(`${input.warehouse_m2}m² ${PROPERTY_LABEL.warehouse}`)
  if ((input.retail_m2    ?? 0) > 0) parts.push(`${input.retail_m2}m² ${PROPERTY_LABEL.retail}`)
  if ((input.medical_m2   ?? 0) > 0) parts.push(`${input.medical_m2}m² ${PROPERTY_LABEL.medical}`)
  if (parts.length === 0) return `${PROPERTY_LABEL[input.property_type]} site`
  return parts.join(' plus ')
}

function fixturePhrase(bathrooms: number, kitchens: number): string {
  const bits: string[] = []
  if (bathrooms > 0) bits.push(`${bathrooms} ${bathrooms === 1 ? 'bathroom' : 'bathrooms'}`)
  if (kitchens  > 0) bits.push(`${kitchens} ${kitchens  === 1 ? 'kitchen'  : 'kitchens'}`)
  if (bits.length === 0) return ''
  return ` with ${bits.join(' and ')}`
}

function frequencyPhrase(input: CommercialInputs): string {
  const v = input.visits_per_period
  if (input.frequency_type === 'weekly') {
    if (v === 1) return 'once per week'
    if (v === 2) return 'twice per week'
    if (v === 3) return 'three times per week'
    if (v === 4) return 'four times per week'
    if (v === 5) return 'five times per week'
    if (v === 6) return 'six times per week'
    if (v === 7) return 'daily'
    return `${v} times per week`
  }
  if (input.frequency_type === 'fortnightly') {
    if (v === 1) return 'every two weeks'
    if (v === 2) return 'twice per fortnight'
    return `${v} times per fortnight`
  }
  // monthly
  if (v === 1) return 'once per month'
  if (v === 2) return 'twice per month'
  return `${v} times per month`
}

export function buildCommercialDescription(
  input: CommercialInputs,
  _view: PricingView,
): string {
  const property = propertyPhrase(input)
  const fixtures = fixturePhrase(input.bathrooms, input.kitchens)
  const cadence  = frequencyPhrase(input)
  return `Commercial cleaning for a ${property}${fixtures}, serviced ${cadence}`
}
```

The `_view` argument is accepted but not used in v1 — it's part of the function's documented contract and may shape wording later. The leading underscore signals intentional non-use.

- [ ] **Step 4: Run to verify green**

```bash
npx jest src/lib/__tests__/commercialPricingMapping.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/commercialPricingMapping.ts src/lib/__tests__/commercialPricingMapping.test.ts
git commit -m "feat(commercial): add buildCommercialDescription with frequency phrasing"
```

---

## Task 6: `buildQuoteItemsFromCalc` (TDD)

**Files:**
- Modify: `src/lib/commercialPricingMapping.ts`
- Modify: `src/lib/__tests__/commercialPricingMapping.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/lib/__tests__/commercialPricingMapping.test.ts`:

```ts
import { buildQuoteItemsFromCalc, type CommercialCalculationRow } from '../commercialPricingMapping'

function calcRow(over: Partial<CommercialCalculationRow> = {}): CommercialCalculationRow {
  return {
    id: 'calc-1',
    total_per_clean: 498,
    monthly_value: 4313.16,
    extras_breakdown: { windows: 0, carpet: 0, hard_floor: 0, deep_clean: 0 },
    selected_pricing_view: 'per_clean',
    inputs: {
      property_type: 'office',
      office_m2: 500, warehouse_m2: 0, retail_m2: 0, medical_m2: 0,
      location_type: 'suburban',
      bathrooms: 2, kitchens: 1,
      windows: 0, desks: 0, bins: 0,
      frequency_type: 'weekly', visits_per_period: 2,
      traffic_level: 'medium', fitout_level: 'standard', access_difficulty: 'easy',
      carpet_clean_m2: 0, hard_floor_m2: 0, deep_clean: false,
      pricing_mode: 'make_money',
    },
    ...over,
  }
}

describe('buildQuoteItemsFromCalc', () => {
  it('returns only the core line when no extras', () => {
    const items = buildQuoteItemsFromCalc(calcRow())
    expect(items).toHaveLength(1)
    expect(items[0]).toEqual({
      label: 'Commercial cleaning — recurring service',
      price: 498,
      sort_order: 0,
    })
  })

  it('uses monthly_value when selected_pricing_view is monthly', () => {
    const items = buildQuoteItemsFromCalc(calcRow({ selected_pricing_view: 'monthly' }))
    expect(items[0].price).toBe(4313.16)
  })

  it('adds extra rows for each non-zero extra with labels matching the spec', () => {
    const items = buildQuoteItemsFromCalc(calcRow({
      extras_breakdown: { windows: 80, carpet: 200, hard_floor: 150, deep_clean: 200 },
      inputs: {
        ...calcRow().inputs,
        windows: 10,
        carpet_clean_m2: 50,
        hard_floor_m2: 30,
        deep_clean: true,
      },
    }))
    expect(items).toHaveLength(5)
    expect(items[0]).toMatchObject({ label: 'Commercial cleaning — recurring service', sort_order: 0 })
    expect(items[1]).toEqual({ label: 'Window cleaning — 10 windows (one-off)', price: 80,  sort_order: 1 })
    expect(items[2]).toEqual({ label: 'Carpet cleaning — 50 m² (one-off)',       price: 200, sort_order: 2 })
    expect(items[3]).toEqual({ label: 'Hard floor treatment — 30 m² (one-off)',  price: 150, sort_order: 3 })
    expect(items[4]).toEqual({ label: 'Deep clean — additional uplift (one-off)',price: 200, sort_order: 4 })
  })

  it('omits extras whose breakdown is 0 even if input was set', () => {
    const items = buildQuoteItemsFromCalc(calcRow({
      extras_breakdown: { windows: 80, carpet: 0, hard_floor: 0, deep_clean: 0 },
      inputs: { ...calcRow().inputs, windows: 10 },
    }))
    expect(items).toHaveLength(2)
    expect(items[1].label).toBe('Window cleaning — 10 windows (one-off)')
  })

  it('defaults to per_clean when selected_pricing_view is null', () => {
    const items = buildQuoteItemsFromCalc(calcRow({ selected_pricing_view: null }))
    expect(items[0].price).toBe(498)
  })
})
```

- [ ] **Step 2: Run to verify red**

```bash
npx jest src/lib/__tests__/commercialPricingMapping.test.ts
```

Expected: new tests fail because `buildQuoteItemsFromCalc` and `CommercialCalculationRow` are not exported.

- [ ] **Step 3: Implement `buildQuoteItemsFromCalc` and the `CommercialCalculationRow` type**

Append to `src/lib/commercialPricingMapping.ts`:

```ts
import type { ExtrasBreakdown } from './commercialPricing'

export interface CommercialCalculationRow {
  id: string
  inputs: CommercialInputs
  total_per_clean: number
  monthly_value: number
  extras_breakdown: ExtrasBreakdown
  selected_pricing_view: PricingView | null
}

export interface QuoteLineItem {
  label: string
  price: number
  sort_order: number
}

export function buildQuoteItemsFromCalc(calc: CommercialCalculationRow): QuoteLineItem[] {
  const items: QuoteLineItem[] = []

  const view: PricingView = calc.selected_pricing_view ?? 'per_clean'
  const corePrice = view === 'monthly' ? calc.monthly_value : calc.total_per_clean

  items.push({
    label: 'Commercial cleaning — recurring service',
    price: corePrice,
    sort_order: 0,
  })

  let order = 1
  if (calc.extras_breakdown.windows > 0) {
    items.push({
      label: `Window cleaning — ${calc.inputs.windows ?? 0} windows (one-off)`,
      price: calc.extras_breakdown.windows,
      sort_order: order++,
    })
  }
  if (calc.extras_breakdown.carpet > 0) {
    items.push({
      label: `Carpet cleaning — ${calc.inputs.carpet_clean_m2 ?? 0} m² (one-off)`,
      price: calc.extras_breakdown.carpet,
      sort_order: order++,
    })
  }
  if (calc.extras_breakdown.hard_floor > 0) {
    items.push({
      label: `Hard floor treatment — ${calc.inputs.hard_floor_m2 ?? 0} m² (one-off)`,
      price: calc.extras_breakdown.hard_floor,
      sort_order: order++,
    })
  }
  if (calc.extras_breakdown.deep_clean > 0) {
    items.push({
      label: 'Deep clean — additional uplift (one-off)',
      price: calc.extras_breakdown.deep_clean,
      sort_order: order++,
    })
  }

  return items
}
```

- [ ] **Step 4: Run to verify green**

```bash
npx jest src/lib/__tests__/commercialPricingMapping.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/commercialPricingMapping.ts src/lib/__tests__/commercialPricingMapping.test.ts
git commit -m "feat(commercial): add buildQuoteItemsFromCalc + CommercialCalculationRow type"
```

---

## Task 7: Calculator server action

**Files:**
- Create: `src/app/portal/commercial-calculator/_actions.ts`

No automated test for this task — it depends on Supabase and is validated by the end-to-end smoke test in Task 15. Match the existing server-action shape used in `src/app/portal/quotes/new/_actions.ts`.

- [ ] **Step 1: Create the server action**

Path: `src/app/portal/commercial-calculator/_actions.ts`

```ts
'use server'

import { createClient } from '@/lib/supabase-server'
import { calculateCommercialPrice, type CommercialInputs, type PricingView } from '@/lib/commercialPricing'

export async function saveCommercialCalculation(
  input: CommercialInputs,
  selected_pricing_view: PricingView,
): Promise<{ id: string } | { error: string }> {
  const supabase = createClient()

  // Re-run the calculation server-side so the stored values are authoritative.
  const result = calculateCommercialPrice(input)

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

  if (error || !data) {
    return { error: `Failed to save calculation: ${error?.message ?? 'unknown'}` }
  }
  return { id: data.id }
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/commercial-calculator/_actions.ts
git commit -m "feat(commercial): add saveCommercialCalculation server action"
```

---

## Task 8: `ResultSummary` component

**Files:**
- Create: `src/app/portal/commercial-calculator/_components/ResultSummary.tsx`

- [ ] **Step 1: Create the component**

Path: `src/app/portal/commercial-calculator/_components/ResultSummary.tsx`

```tsx
'use client'

import clsx from 'clsx'
import type { CommercialResult } from '@/lib/commercialPricing'

function nzd(n: number): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

export function ResultSummary({
  result,
  targetMarginPct,
  minimumCharge,
}: {
  result: CommercialResult
  targetMarginPct: number
  minimumCharge: number
}) {
  const warnings: { tone: 'amber' | 'blue' | 'red'; text: string }[] = []
  if (result.below_target_margin) {
    warnings.push({
      tone: 'amber',
      text: `Margin is below the ${Math.round(targetMarginPct * 100)}% target for this frequency.` +
            (result.suggested_price != null
              ? ` Suggested price to hit target: ${nzd(result.suggested_price)}.`
              : ''),
    })
  }
  if (result.minimum_applied) {
    warnings.push({
      tone: 'blue',
      text: `Minimum charge of ${nzd(minimumCharge)} applied.`,
    })
  }
  if (result.pricing_status === 'tight') {
    warnings.push({
      tone: 'red',
      text: 'Pricing is tight. Review inputs or lift the pricing mode.',
    })
  }

  const extras = result.extras_breakdown
  const hasExtras = result.extras_total > 0

  return (
    <div className="rounded-xl border border-sage-100 bg-white p-5 space-y-5">
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={clsx('text-sm rounded-lg px-3 py-2 border',
                w.tone === 'amber' && 'bg-amber-50 border-amber-200 text-amber-800',
                w.tone === 'blue'  && 'bg-blue-50 border-blue-200 text-blue-800',
                w.tone === 'red'   && 'bg-red-50 border-red-200 text-red-800',
              )}
            >
              {w.text}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <div className="text-xs uppercase tracking-wide text-sage-500 mb-1">Headline (feeds the quote)</div>
          <dl className="space-y-1.5 text-sm">
            <Row label="Price per clean"        value={nzd(result.total_per_clean)} strong />
            <Row label="Monthly value"          value={nzd(result.monthly_value)} />
            <Row label="Effective hourly rate"  value={`${nzd(result.effective_hourly_rate)} / hr`} />
          </dl>
        </div>

        <div className="rounded-lg bg-sage-50 border border-sage-100 p-3">
          <div className="text-xs uppercase tracking-wide text-sage-500 mb-1">Internal only</div>
          <dl className="space-y-1.5 text-sm">
            <Row label="Estimated hours"       value={`${result.estimated_hours} hrs`} />
            <Row label="Estimated cost"        value={nzd(result.estimated_cost)} />
            <Row label="Profit"                value={nzd(result.profit)} />
            <Row label="Margin"                value={pct(result.margin)} />
            <Row label="Status"                value={
              <span className={clsx('inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                result.pricing_status === 'high_margin' && 'bg-emerald-100 text-emerald-800',
                result.pricing_status === 'healthy'     && 'bg-sage-100 text-sage-800',
                result.pricing_status === 'tight'       && 'bg-red-100 text-red-800',
              )}>
                {result.pricing_status.replace('_', ' ')}
              </span>
            } />
          </dl>
        </div>
      </div>

      {hasExtras && (
        <div>
          <div className="text-xs uppercase tracking-wide text-sage-500 mb-1">One-off extras (not in monthly)</div>
          <ul className="text-sm space-y-1">
            {extras.windows    > 0 && <li className="flex justify-between"><span>Window cleaning</span><span>{nzd(extras.windows)}</span></li>}
            {extras.carpet     > 0 && <li className="flex justify-between"><span>Carpet cleaning</span><span>{nzd(extras.carpet)}</span></li>}
            {extras.hard_floor > 0 && <li className="flex justify-between"><span>Hard floor treatment</span><span>{nzd(extras.hard_floor)}</span></li>}
            {extras.deep_clean > 0 && <li className="flex justify-between"><span>Deep clean uplift</span><span>{nzd(extras.deep_clean)}</span></li>}
            <li className="flex justify-between font-medium pt-1 border-t border-sage-100 mt-1">
              <span>Extras total</span><span>{nzd(result.extras_total)}</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-sage-600">{label}</dt>
      <dd className={clsx(strong && 'font-semibold text-sage-800')}>{value}</dd>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/commercial-calculator/_components/ResultSummary.tsx
git commit -m "feat(commercial): add ResultSummary card with warnings + extras list"
```

---

## Task 9: `CommercialCalculatorForm` component

**Files:**
- Create: `src/app/portal/commercial-calculator/_components/CommercialCalculatorForm.tsx`

- [ ] **Step 1: Create the form component**

Path: `src/app/portal/commercial-calculator/_components/CommercialCalculatorForm.tsx`

```tsx
'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import {
  calculateCommercialPrice,
  normaliseFrequency,
  targetMargin,
  minimumCharge,
  type CommercialInputs,
  type PropertyType,
  type LocationType,
  type FrequencyType,
  type TrafficLevel,
  type FitoutLevel,
  type AccessDifficulty,
  type PricingMode,
  type PricingView,
} from '@/lib/commercialPricing'
import { saveCommercialCalculation } from '../_actions'
import { ResultSummary } from './ResultSummary'

function toInt(v: string): number {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : 0
}
function toNum(v: string): number {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

export function CommercialCalculatorForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Property
  const [propertyType, setPropertyType] = useState<PropertyType>('office')
  const [mixed, setMixed] = useState(false)
  const [officeM2, setOfficeM2] = useState('')
  const [warehouseM2, setWarehouseM2] = useState('')
  const [retailM2, setRetailM2] = useState('')
  const [medicalM2, setMedicalM2] = useState('')
  const [floors, setFloors] = useState('')
  const [locationType, setLocationType] = useState<LocationType>('suburban')

  // Fixtures
  const [bathrooms, setBathrooms] = useState('')
  const [kitchens, setKitchens] = useState('')
  const [desks, setDesks] = useState('')
  const [bins, setBins] = useState('')

  // Frequency
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('weekly')
  const [visitsPerPeriod, setVisitsPerPeriod] = useState('1')

  // Complexity
  const [trafficLevel, setTrafficLevel] = useState<TrafficLevel>('medium')
  const [fitoutLevel, setFitoutLevel] = useState<FitoutLevel>('standard')
  const [accessDifficulty, setAccessDifficulty] = useState<AccessDifficulty>('easy')

  // Extras
  const [windows, setWindows] = useState('')
  const [carpetM2, setCarpetM2] = useState('')
  const [hardFloorM2, setHardFloorM2] = useState('')
  const [deepClean, setDeepClean] = useState(false)

  // Pricing mode
  const [pricingMode, setPricingMode] = useState<PricingMode>('make_money')

  const primaryM2Setter: Record<PropertyType, (v: string) => void> = {
    office:    setOfficeM2,
    warehouse: setWarehouseM2,
    retail:    setRetailM2,
    medical:   setMedicalM2,
  }
  const primaryM2: Record<PropertyType, string> = {
    office:    officeM2,
    warehouse: warehouseM2,
    retail:    retailM2,
    medical:   medicalM2,
  }

  const inputs: CommercialInputs = {
    property_type: propertyType,
    office_m2:    toNum(officeM2),
    warehouse_m2: toNum(warehouseM2),
    retail_m2:    toNum(retailM2),
    medical_m2:   toNum(medicalM2),
    floors:       toInt(floors),
    location_type: locationType,
    bathrooms: toInt(bathrooms),
    kitchens:  toInt(kitchens),
    windows:   toInt(windows),
    desks:     toInt(desks),
    bins:      toInt(bins),
    frequency_type: frequencyType,
    visits_per_period: Math.max(1, toInt(visitsPerPeriod)),
    traffic_level: trafficLevel,
    fitout_level: fitoutLevel,
    access_difficulty: accessDifficulty,
    carpet_clean_m2: toNum(carpetM2),
    hard_floor_m2:   toNum(hardFloorM2),
    deep_clean: deepClean,
    pricing_mode: pricingMode,
  }

  const totalM2 =
    (inputs.office_m2 ?? 0) + (inputs.warehouse_m2 ?? 0) +
    (inputs.retail_m2 ?? 0) + (inputs.medical_m2 ?? 0)

  const canSubmit = totalM2 > 0 && inputs.visits_per_period >= 1

  const result = useMemo(() => calculateCommercialPrice(inputs), [
    inputs.property_type, inputs.office_m2, inputs.warehouse_m2, inputs.retail_m2, inputs.medical_m2,
    inputs.location_type, inputs.bathrooms, inputs.kitchens, inputs.windows, inputs.desks, inputs.bins,
    inputs.frequency_type, inputs.visits_per_period,
    inputs.traffic_level, inputs.fitout_level, inputs.access_difficulty,
    inputs.carpet_clean_m2, inputs.hard_floor_m2, inputs.deep_clean,
    inputs.pricing_mode,
  ])

  const { effective_visits_per_week } = normaliseFrequency(inputs.frequency_type, inputs.visits_per_period)
  const tMargin = targetMargin(effective_visits_per_week)
  const mCharge = minimumCharge(effective_visits_per_week)

  function handleUsePrice(view: PricingView) {
    setError(null)
    startTransition(async () => {
      const r = await saveCommercialCalculation(inputs, view)
      if ('error' in r) {
        setError(r.error)
        return
      }
      router.push(`/portal/quotes/new?calc_id=${r.id}`)
    })
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="max-w-3xl space-y-10">
      {/* Property */}
      <Section title="Property">
        <div className="flex flex-wrap gap-2 mb-4">
          {(['office', 'warehouse', 'retail', 'medical'] as const).map((t) => (
            <Pill key={t} active={propertyType === t} onClick={() => setPropertyType(t)}>{t}</Pill>
          ))}
        </div>
        <Field label={`${propertyType} m²`} type="number" value={primaryM2[propertyType]} onChange={primaryM2Setter[propertyType]} min="0" />
        <label className="flex items-center gap-2 text-sm text-sage-700 mt-3">
          <input type="checkbox" checked={mixed} onChange={(e) => setMixed(e.target.checked)} />
          Mixed site (show additional m² inputs)
        </label>
        {mixed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {propertyType !== 'office'    && <Field label="Office m²"    type="number" value={officeM2}    onChange={setOfficeM2} min="0" />}
            {propertyType !== 'warehouse' && <Field label="Warehouse m²" type="number" value={warehouseM2} onChange={setWarehouseM2} min="0" />}
            {propertyType !== 'retail'    && <Field label="Retail m²"    type="number" value={retailM2}    onChange={setRetailM2} min="0" />}
            {propertyType !== 'medical'   && <Field label="Medical m²"   type="number" value={medicalM2}   onChange={setMedicalM2} min="0" />}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <Field label="Floors (optional)" type="number" value={floors} onChange={setFloors} min="0" />
          <div>
            <span className="block text-sm font-semibold text-sage-800 mb-2">Location</span>
            <div className="flex gap-2">
              {(['suburban', 'cbd', 'remote'] as const).map((l) => (
                <Pill key={l} active={locationType === l} onClick={() => setLocationType(l)}>{l}</Pill>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Fixtures */}
      <Section title="Fixtures">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Bathrooms" type="number" value={bathrooms} onChange={setBathrooms} min="0" />
          <Field label="Kitchens"  type="number" value={kitchens}  onChange={setKitchens} min="0" />
          <Field label="Desks (optional)" type="number" value={desks} onChange={setDesks} min="0" />
          <Field label="Bins (optional)"  type="number" value={bins}  onChange={setBins} min="0" />
        </div>
      </Section>

      {/* Frequency */}
      <Section title="Frequency">
        <div className="flex flex-wrap gap-2 mb-3">
          {(['weekly', 'fortnightly', 'monthly'] as const).map((f) => (
            <Pill key={f} active={frequencyType === f} onClick={() => setFrequencyType(f)}>{f}</Pill>
          ))}
        </div>
        <Field label="Visits per period" type="number" value={visitsPerPeriod} onChange={setVisitsPerPeriod} min="1" />
      </Section>

      {/* Complexity */}
      <Section title="Complexity">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <GroupPicker label="Traffic"  value={trafficLevel}     onChange={setTrafficLevel}     options={['low', 'medium', 'high']} />
          <GroupPicker label="Fitout"   value={fitoutLevel}      onChange={setFitoutLevel}      options={['basic', 'standard', 'premium']} />
          <GroupPicker label="Access"   value={accessDifficulty} onChange={setAccessDifficulty} options={['easy', 'medium', 'hard']} />
        </div>
      </Section>

      {/* Extras */}
      <Section title="One-off extras — not part of recurring service">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Windows (count)"   type="number" value={windows}      onChange={setWindows}     min="0" />
          <Field label="Carpet clean m²"   type="number" value={carpetM2}     onChange={setCarpetM2}    min="0" />
          <Field label="Hard floor m²"     type="number" value={hardFloorM2}  onChange={setHardFloorM2} min="0" />
        </div>
        <label className="flex items-center gap-2 text-sm text-sage-700 mt-4">
          <input type="checkbox" checked={deepClean} onChange={(e) => setDeepClean(e.target.checked)} />
          Deep clean (one-off)
        </label>
      </Section>

      {/* Pricing mode */}
      <Section title="Pricing mode">
        <div className="flex flex-wrap gap-2">
          {(['win_work', 'make_money', 'premium'] as const).map((m) => (
            <Pill key={m} active={pricingMode === m} onClick={() => setPricingMode(m)}>{m.replace('_', ' ')}</Pill>
          ))}
        </div>
      </Section>

      {/* Summary */}
      <ResultSummary result={result} targetMarginPct={tMargin} minimumCharge={mCharge} />

      {error && <p className="text-red-700 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!canSubmit || isPending}
          onClick={() => handleUsePrice('per_clean')}
          className="bg-sage-600 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Use per-clean price → quote'}
        </button>
        <button
          type="button"
          disabled={!canSubmit || isPending}
          onClick={() => handleUsePrice('monthly')}
          className="bg-sage-600 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Use monthly contract value → quote'}
        </button>
      </div>
    </form>
  )
}

// ── Primitives ──────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-lg font-semibold text-sage-800 mb-4">{title}</legend>
      {children}
    </fieldset>
  )
}

function Field({
  label, type = 'text', value, onChange, min, step,
}: { label: string; type?: string; value: string; onChange: (v: string) => void; min?: string; step?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        step={step}
        className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
      />
    </label>
  )
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors',
        active ? 'bg-sage-600 text-white' : 'bg-sage-100 text-sage-700 hover:bg-sage-200',
      )}
    >
      {children}
    </button>
  )
}

function GroupPicker<T extends string>({
  label, value, onChange, options,
}: { label: string; value: T; onChange: (v: T) => void; options: readonly T[] }) {
  return (
    <div>
      <span className="block text-sm font-semibold text-sage-800 mb-2">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Pill key={o} active={value === o} onClick={() => onChange(o)}>{o}</Pill>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/commercial-calculator/_components/CommercialCalculatorForm.tsx
git commit -m "feat(commercial): add calculator form with live preview + save buttons"
```

---

## Task 10: Calculator page

**Files:**
- Create: `src/app/portal/commercial-calculator/page.tsx`

- [ ] **Step 1: Create the server page**

Path: `src/app/portal/commercial-calculator/page.tsx`

```tsx
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CommercialCalculatorForm } from './_components/CommercialCalculatorForm'

export default function CommercialCalculatorPage() {
  return (
    <div>
      <Link
        href="/portal"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to portal
      </Link>

      <h1 className="text-2xl font-bold text-sage-800 mb-8">Commercial calculator</h1>

      <CommercialCalculatorForm />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/commercial-calculator/page.tsx
git commit -m "feat(commercial): add /portal/commercial-calculator page"
```

---

## Task 11: Sidebar nav entry

**Files:**
- Modify: `src/app/portal/_components/PortalSidebar.tsx`

- [ ] **Step 1: Add the nav entry**

In `src/app/portal/_components/PortalSidebar.tsx`, change the lucide import (line 5) to include `Calculator`:

```ts
import { LayoutDashboard, FileText, Receipt, Briefcase, RefreshCw, Users, HardHat, BookOpen, DollarSign, FileInput, Wallet, Bell, Settings, Calculator } from 'lucide-react'
```

Then insert the new link entry in the `links` array directly after the Quotes entry (between the current line 10 and line 11):

```ts
{ href: '/portal/quotes', label: 'Quotes', icon: FileText },
{ href: '/portal/commercial-calculator', label: 'Commercial calc', icon: Calculator },
{ href: '/portal/invoices', label: 'Invoices', icon: Receipt },
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/_components/PortalSidebar.tsx
git commit -m "feat(commercial): add Commercial calc entry to portal sidebar"
```

---

## Task 12: Quote server action — accept `commercial_calc_id`

**Files:**
- Modify: `src/app/portal/quotes/new/_actions.ts`

- [ ] **Step 1: Add `commercial_calc_id` to `CreateQuoteInput`**

In `src/app/portal/quotes/new/_actions.ts`, locate the `CreateQuoteInput` interface (currently lines 24–73). Add a new optional field under the "Pricing engine fields" group:

```ts
  // Pricing engine fields (null when ineligible)
  pricing_mode?: PricingMode
  estimated_hours?: number
  pricing_breakdown?: PricingBreakdown
  calculated_price?: number | null

  // Commercial calculator integration (null when not calc-driven)
  commercial_calc_id?: string | null
```

- [ ] **Step 2: Persist `commercial_calc_id` on insert**

Locate the `.from('quotes').insert({…})` object (currently lines 128–171). Add this line alongside the other pricing-engine fields:

```ts
      pricing_mode: input.pricing_mode ?? null,
      estimated_hours: input.estimated_hours ?? null,
      pricing_breakdown: input.pricing_breakdown ?? null,
      commercial_calc_id: input.commercial_calc_id ?? null,
      discount: input.discount,
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/portal/quotes/new/_actions.ts
git commit -m "feat(quotes): accept optional commercial_calc_id on createQuote"
```

---

## Task 13: Quote page — read `calc_id`, fetch, thread prop

**Files:**
- Modify: `src/app/portal/quotes/new/page.tsx`

- [ ] **Step 1: Extend the page to accept `searchParams` and fetch the calc**

Replace the entire contents of `src/app/portal/quotes/new/page.tsx` with:

```tsx
import { createClient } from '@/lib/supabase-server'
import { NewQuoteForm } from './_components/NewQuoteForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { CommercialCalculationRow } from '@/lib/commercialPricingMapping'

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams?: { calc_id?: string }
}) {
  const supabase = createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, company_name, email, phone, service_address, billing_address, billing_same_as_service')
    .order('name')

  let calc: CommercialCalculationRow | null = null
  if (searchParams?.calc_id) {
    const { data, error } = await supabase
      .from('commercial_calculations')
      .select('id, inputs, total_per_clean, monthly_value, extras_breakdown, selected_pricing_view, pricing_mode, estimated_hours')
      .eq('id', searchParams.calc_id)
      .maybeSingle()
    if (error) {
      console.warn('[new quote] failed to load commercial calc', error)
    } else if (data) {
      calc = data as unknown as CommercialCalculationRow
    }
  }

  return (
    <div>
      <Link
        href="/portal/quotes"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to quotes
      </Link>

      <h1 className="text-2xl font-bold text-sage-800 mb-8">New Quote</h1>

      <NewQuoteForm clients={clients ?? []} calc={calc} />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: `NewQuoteForm` type error — it does not yet accept `calc`. This failure is **expected** at this step; Task 14 adds the prop. Proceed.

- [ ] **Step 3: Commit**

Do not commit yet — the build is broken pending Task 14. Leave the file staged for the next task to pick up.

```bash
git add src/app/portal/quotes/new/page.tsx
```

---

## Task 14: `NewQuoteForm` — accept `calc` prop, seed initial state

**Files:**
- Modify: `src/app/portal/quotes/new/_components/NewQuoteForm.tsx`

Before editing, read the file (around lines 55–100) to confirm the exact `useState` declarations you're targeting:
- `builder` (type `QuoteBuilderState` from `../../_components/QuoteBuilder`)
- `pricing` (type `PricingSummaryValue` from `../../_components/PricingSummary`)
- `basePrice` (string)
- `addons` (type `Addon[]`)

These are the four hooks whose initial values you'll override when `calc` is present.

- [ ] **Step 1: Extend `NewQuoteForm` signature and imports**

In `src/app/portal/quotes/new/_components/NewQuoteForm.tsx`:

A. Add imports at the top of the file (after existing imports):

```ts
import {
  buildCommercialDescription,
  buildQuoteItemsFromCalc,
  mapPricingMode,
  type CommercialCalculationRow,
} from '@/lib/commercialPricingMapping'
```

B. Change the component signature (currently `export function NewQuoteForm({ clients }: { clients: Client[] })`) to:

```tsx
export function NewQuoteForm({
  clients,
  calc,
}: {
  clients: Client[]
  calc?: CommercialCalculationRow | null
}) {
```

- [ ] **Step 2: Seed initial state from `calc` when present**

Still inside `NewQuoteForm`, immediately after the `useState` declarations and before the existing `useEffect` hooks, add a one-shot seed block:

```tsx
  // One-shot seed from a commercial calc (read-and-map only; no recalc).
  // Runs once on mount when `calc` is present.
  const [calcSeeded, setCalcSeeded] = useState(false)
  if (calc && !calcSeeded) {
    const view = calc.selected_pricing_view ?? 'per_clean'
    const corePrice = view === 'monthly' ? calc.monthly_value : calc.total_per_clean

    setBuilder((prev) => ({
      ...prev,
      service_category: 'commercial',
      service_type_code: 'maintenance',
      description_edited: true,
      generated_scope: buildCommercialDescription(calc.inputs, view),
    }))
    setPricing((prev) => ({ ...prev, pricing_mode: mapPricingMode(calc.pricing_mode) }))
    setBasePrice(String(corePrice))
    setAddons(
      buildQuoteItemsFromCalc(calc).map((item, i) => ({
        key: `calc-${i}`,
        label: item.label,
        price: String(item.price),
      })),
    )
    setCalcSeeded(true)
  }
```

Note: the synchronous `if (calc && !calcSeeded) { … setCalcSeeded(true) }` pattern triggers a second render where the new state is consumed. React permits `setState` calls during render as long as they are guarded by a condition that flips on the first run, which this pattern satisfies. If the existing form uses a `useEffect`-based initialiser elsewhere, prefer matching that pattern instead.

- [ ] **Step 3: Pass `commercial_calc_id` through on submit**

Find where `createQuote(...)` is called (search for `createQuote(`). Locate the object literal being passed. Add one line:

```ts
      calculated_price: engineResult?.calculated_price ?? null,
      commercial_calc_id: calc?.id ?? null,
      is_price_overridden: override.is_price_overridden,
```

(The exact neighbouring lines may differ — add the new field in the same block as `calculated_price` / `pricing_mode`.)

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors. The change from Task 13 now resolves because `NewQuoteForm` accepts `calc`.

- [ ] **Step 5: Run the existing test suite to confirm no regressions**

```bash
npm test
```

Expected: all existing tests still pass. The new tests from Tasks 2–6 also pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/portal/quotes/new/_components/NewQuoteForm.tsx
git commit -m "feat(quotes): seed new-quote form from commercial calc when calc_id is present"
```

---

## Task 15: End-to-end smoke test + spec alignment checklist

This task has no code — it's a manual smoke test to confirm the full flow works as specified. Execute each item and tick it off.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Calculator renders and computes live**

Navigate to `http://localhost:3000/portal/commercial-calculator`.

- Confirm the page renders with header "Commercial calculator" and a back link.
- Enter: office, 500 m², 2 bathrooms, 1 kitchen, weekly x 2, medium traffic, standard fitout, easy access, suburban, make_money.
- Expected live summary:
  - Price per clean ≈ **$498.00**
  - Monthly value ≈ **$4,313.16**
  - Estimated hours ≈ **5.95**
  - Status: **healthy**
  - No warnings.

- [ ] **Step 3: Extras do not leak into recurring metrics**

Add: 10 windows, 50 m² carpet, 30 m² hard floor, tick Deep clean.

- Price per clean **unchanged** (still ≈ $498.00) — confirms extras don't pollute recurring.
- Monthly value **unchanged** (still ≈ $4,313.16).
- Estimated hours **unchanged**.
- Extras list appears: Windows $80, Carpet $200, Hard floor $150, Deep clean uplift $200, total $630.

- [ ] **Step 4: Minimum-charge warning triggers on a tiny job**

Set office m² to 20, bathrooms 0, kitchens 0, visits 1, low traffic, basic fitout, win_work, and clear all extras.

- Blue warning: "Minimum charge of $160.00 applied."
- Price per clean = **$160.00**.

- [ ] **Step 5: Below-target-margin warning triggers on a large cheap job**

Set office m² to 2000, bathrooms 0, kitchens 0, visits 5, low traffic, basic fitout, easy access, suburban, win_work.

- Amber warning appears with a suggested price.
- `below_target_margin` is on; the displayed `price per clean` is **not** the suggested price (it's the calculated core).

- [ ] **Step 6: Redirect to quote with per-clean price**

Reset to the first scenario (Step 2). Click **Use per-clean price → quote**.

- URL changes to `/portal/quotes/new?calc_id=<uuid>`.
- The quote form loads with:
  - `base_price` input prefilled to **498.00**
  - Service category set to Commercial, service type "Maintenance Clean"
  - Description showing the generated scope text
  - One core add-on row labelled "Commercial cleaning — recurring service" priced at 498.00
  - No extras add-on rows (because the original scenario had no extras)
  - Pricing mode = Standard (mapped from make_money)

- [ ] **Step 7: Redirect to quote with monthly contract value + extras**

Go back to the calculator, set up the Step 3 scenario (with extras). Click **Use monthly contract value → quote**.

- Quote form loads with:
  - `base_price` input prefilled to the **monthly value** (~$4,313.16)
  - Core add-on row labelled "Commercial cleaning — recurring service" priced at the monthly value
  - Four separate one-off extra rows (windows, carpet, hard floor, deep clean)
  - Extras row prices match the calculator: $80 / $200 / $150 / $200

- [ ] **Step 8: Save the prefilled quote and verify FK**

Select a client, submit the quote. Then run in Supabase SQL editor:

```sql
SELECT id, base_price, pricing_mode, commercial_calc_id FROM public.quotes ORDER BY created_at DESC LIMIT 1;
```

Expected: the row has `commercial_calc_id` equal to the UUID used in the redirect URL, `base_price` equal to the price shown on the calculator, and `pricing_mode = 'standard'`.

- [ ] **Step 9: Verify legacy path unchanged**

Open a new tab to `/portal/quotes/new` (no `calc_id`).

- The form behaves exactly as before: empty builder, empty pricing, empty add-ons. No regressions.

- [ ] **Step 10: Run the full test suite and lint**

```bash
npm test
npx next lint
npx tsc --noEmit
```

Expected: all tests pass, no TypeScript errors, no new lint errors.

- [ ] **Step 11: Final spec alignment checklist**

Tick each item after confirming in the code:

- [ ] The quote page does NOT call `calculateCommercialPrice` anywhere.
- [ ] The server action `saveCommercialCalculation` DOES call `calculateCommercialPrice` (authoritative re-run).
- [ ] `extras_total` > 0 never causes `monthly_value` to change versus the same inputs with `extras_total = 0`.
- [ ] The deep_clean branch of `extras_breakdown` is exactly `area_base × 0.5`, not `area_base × 1.5`.
- [ ] `suggested_price` does not wire up to any button or data-persisted flag — it's shown in the warning bar only.
- [ ] `src/lib/quote-pricing.ts` has zero diff from `main`.
- [ ] `src/app/portal/quotes/_components/QuoteBuilder.tsx` has zero diff from `main`.
- [ ] `src/lib/quote-wording.ts` has zero diff from `main`.

If any of these fails, stop and revisit before merging.

- [ ] **Step 12: Merge-ready commit message / PR title**

Suggested PR title: `feat(commercial): plug-in commercial pricing calculator`

Suggested PR body:

```
Adds a standalone commercial pricing calculator at /portal/commercial-calculator
that saves to a new commercial_calculations table and prefills the existing
quote-creation form via ?calc_id=<id>.

Design: docs/superpowers/specs/2026-04-20-commercial-pricing-calculator-design.md
Plan:   docs/superpowers/plans/2026-04-20-commercial-pricing-calculator.md

Legacy commercial builder untouched. Existing quote pricing engine untouched.
```

---

## Spec-to-task coverage map

| Spec requirement | Task(s) |
|---|---|
| `commercial_calculations` table + RLS + FK + index | 1 |
| Migration file in `docs/db/` | 1 |
| Pricing engine types, constants, helpers | 2 |
| Full `calculateCommercialPrice` with all four passes | 3 |
| Deep clean priced as uplift delta | 3 |
| Extras don't leak into recurring metrics | 3 |
| `mapPricingMode` | 4 |
| `buildCommercialDescription` with frequency phrasing | 5 |
| `buildQuoteItemsFromCalc` with bundled core + one-off extras | 6 |
| Server action `saveCommercialCalculation` (authoritative re-run) | 7 |
| ResultSummary with warnings, extras list, internal-only styling | 8 |
| Six form sections + live preview + two save buttons | 9 |
| `/portal/commercial-calculator` page | 10 |
| Sidebar nav entry | 11 |
| `quotes.commercial_calc_id` persisted via `createQuote` | 12 |
| Quote page reads `calc_id` and fetches | 13 |
| `NewQuoteForm` seeds state from calc | 14 |
| End-to-end verification + guardrail checklist | 15 |

---

## Risk notes

1. **Supabase types.** The recon did not confirm whether a generated `Database` type file is in use. If `src/types/supabase.ts` exists and is kept in sync, regenerate after the migration in Task 1 (`npx supabase gen types …`). If not, TypeScript will infer `any` on the new table, which is acceptable for v1.
2. **React setState during render (Task 14, Step 2).** The pattern used here (`if (calc && !calcSeeded) { … setCalcSeeded(true) }`) works in React 18 but is unusual. If the existing `NewQuoteForm` uses `useEffect` for similar seeding, prefer that to match the local style — the behaviour is identical.
3. **Band-lookup boundary behaviour.** Effective weekly visits are continuous (fortnightly × 1 = 0.5, monthly × 1 = 0.231). All band lookups use `>=` thresholds, which the tests in Task 2 exercise. Do not tune the thresholds to "exact" decimals — the spec's `< 1` band catches every sub-weekly case.
