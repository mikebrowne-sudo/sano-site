# Quote Pricing Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a time-based, pricing-mode-driven quote pricing engine to the Sano portal that auto-calculates from the existing structured builder inputs and persists a full audit breakdown, without touching the wording engine or invoice logic.

**Architecture:** A pure TypeScript module (`src/lib/quote-pricing.ts`) produces hours, calculated price, and a structured breakdown. A new UI component (`PricingSummary.tsx`) reads the `QuoteBuilderState` and renders the summary + mode selector + Final-price override field. Three new nullable columns (`pricing_mode`, `estimated_hours`, `pricing_breakdown`) store the audit snapshot on `quotes`. Commercial and legacy quotes fall back to the existing manual `base_price` input.

**Tech Stack:** Next.js 14, TypeScript, Jest (jsdom + ts-jest), Supabase (Postgres + JSONB), Tailwind, clsx. All path aliases use `@/` → `src/`.

**Spec:** `docs/superpowers/specs/2026-04-18-quote-pricing-engine-design.md`

---

## Pre-flight

Before starting, confirm:

- [ ] Working in a branch / worktree off current HEAD.
- [ ] `npm install` is current (no pending installs — per user rule, never overlap installs).
- [ ] Supabase MCP access is available (for Task 1).
- [ ] Dev server can start: `npm run dev` boots without errors on the current branch.

---

## Task 1: Add pricing columns to `quotes` table

**Files:**
- Migration: apply via Supabase MCP (`mcp__claude_ai_Supabase__apply_migration`).

- [ ] **Step 1: Apply migration via Supabase MCP**

Call `mcp__claude_ai_Supabase__apply_migration` with:

- `name`: `add_pricing_engine_columns_to_quotes`
- `query`:

```sql
alter table quotes
  add column pricing_mode       text,
  add column estimated_hours    numeric(5,2),
  add column pricing_breakdown  jsonb;
```

All three nullable. No backfill — legacy quotes retain `null` for all three and fall back to the manual `base_price` pathway.

- [ ] **Step 2: Verify columns exist**

Call `mcp__claude_ai_Supabase__list_tables` filtered to the `quotes` table; confirm the three new columns appear with the expected types (`text`, `numeric`, `jsonb`).

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-04-18-quote-pricing-engine.md docs/superpowers/specs/2026-04-18-quote-pricing-engine-design.md
git commit -m "docs: quote pricing engine spec + plan"
```

*(The migration itself is applied directly to Supabase and is not tracked in the repo — that is how this project manages schema. The spec + plan documents are what we commit at this checkpoint.)*

---

## Task 2: Pure pricing engine module (TDD)

**Files:**
- Create: `src/lib/quote-pricing.ts`
- Create: `src/lib/__tests__/quote-pricing.test.ts`

**Test strategy:** The engine is pure and deterministic — every branch is testable via Jest on the pure function. We TDD: write all scenario tests first, then implement until they pass.

### 2.1 Scaffold the test file and verify Jest runs

- [ ] **Step 1: Create the test file with an empty scenario to confirm Jest config is working**

`src/lib/__tests__/quote-pricing.test.ts`:

```ts
import { calculateQuotePrice, isPricingEligible, HOURLY_RATE, SERVICE_FEE } from '../quote-pricing'

describe('quote-pricing — smoke', () => {
  it('exposes expected constants', () => {
    expect(HOURLY_RATE).toBe(65)
    expect(SERVICE_FEE).toBe(25)
  })
})
```

- [ ] **Step 2: Run it to verify it fails at import (module does not yet exist)**

```bash
npm test -- --testPathPattern=quote-pricing
```

Expected: FAIL with `Cannot find module '../quote-pricing'`.

### 2.2 Stub the module to unblock compilation

- [ ] **Step 3: Create `src/lib/quote-pricing.ts` with only exported constants and type stubs**

```ts
// Sano quote pricing engine — pure, deterministic, time-based.
// Lives alongside quote-wording.ts but has no dependency on it.
// Do not import React, Supabase, or formatting utilities here.

import type { ServiceCategory } from './quote-wording'

export type PricingMode = 'win' | 'standard' | 'premium'

export const HOURLY_RATE = 65
export const SERVICE_FEE = 25
export const MIN_JOB_HOURS = 2.25
export const BUFFER_STANDARD = 0.15
export const BUFFER_HEAVY = 0.20

export interface PricingInput {
  service_category: ServiceCategory | null
  service_type_code: string | null
  bedrooms: number | null
  bathrooms: number | null
  condition_tags: string[]
  addons_wording: string[]
}

export interface PricingAdjustmentNote {
  tag: string
  type: 'percent' | 'hours'
  value: number
}

export interface PricingBreakdown {
  base_hours: number
  bed_count_used: number
  bed_count_clamped: boolean
  bed_count_fallback: boolean
  service_type_multiplier: number
  condition_adjustments: PricingAdjustmentNote[]
  bathroom_hours: number
  high_use_hours: number
  addon_hours: number
  addon_items: { key: string; hours: number }[]
  hours_after_adjustments: number
  min_applied: boolean
  buffer_percent: number
  rounded_hours: number
  hourly_rate: number
  pricing_mode: PricingMode
  pricing_mode_multiplier: number
  service_fee: number
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

export function isPricingEligible(
  _category: ServiceCategory | null,
  _serviceTypeCode: string | null,
): boolean {
  return false
}

export function calculateQuotePrice(
  _input: PricingInput,
  _mode: PricingMode,
  _override?: number,
): PricingResult {
  return { eligible: false, estimated_hours: null, calculated_price: null, final_price: null, breakdown: null }
}
```

- [ ] **Step 4: Run the smoke test again and confirm it passes**

```bash
npm test -- --testPathPattern=quote-pricing
```

Expected: PASS (1 test).

### 2.3 Write the full scenario suite (failing)

- [ ] **Step 5: Replace `quote-pricing.test.ts` with the complete scenario suite**

```ts
import {
  calculateQuotePrice,
  isPricingEligible,
  HOURLY_RATE,
  SERVICE_FEE,
  MIN_JOB_HOURS,
} from '../quote-pricing'
import type { PricingInput } from '../quote-pricing'

const baseInput: PricingInput = {
  service_category: 'residential',
  service_type_code: 'standard_clean',
  bedrooms: 3,
  bathrooms: 2,
  condition_tags: ['well_maintained'],
  addons_wording: [],
}

describe('quote-pricing — constants', () => {
  it('exposes expected constants', () => {
    expect(HOURLY_RATE).toBe(65)
    expect(SERVICE_FEE).toBe(25)
    expect(MIN_JOB_HOURS).toBe(2.25)
  })
})

describe('isPricingEligible', () => {
  it('is true for the 10 eligible residential/PM/airbnb service types', () => {
    const eligible: Array<[string, string]> = [
      ['residential', 'standard_clean'],
      ['residential', 'deep_clean'],
      ['residential', 'move_in_out'],
      ['residential', 'pre_sale'],
      ['property_management', 'routine'],
      ['property_management', 'end_of_tenancy'],
      ['property_management', 'pre_inspection'],
      ['property_management', 'handover'],
      ['airbnb', 'turnover'],
      ['airbnb', 'deep_reset'],
    ]
    for (const [cat, code] of eligible) {
      expect(isPricingEligible(cat as never, code)).toBe(true)
    }
  })

  it('is false for any commercial type', () => {
    for (const code of ['maintenance', 'detailed', 'initial', 'one_off_deep']) {
      expect(isPricingEligible('commercial', code)).toBe(false)
    }
  })

  it('is false when category or service type is missing', () => {
    expect(isPricingEligible(null, 'standard_clean')).toBe(false)
    expect(isPricingEligible('residential', null)).toBe(false)
    expect(isPricingEligible(null, null)).toBe(false)
  })
})

describe('calculateQuotePrice — scenario 1: 3-bed / 2-bath Standard / well-maintained / Standard mode', () => {
  const result = calculateQuotePrice(baseInput, 'standard')

  it('is eligible', () => { expect(result.eligible).toBe(true) })
  it('rounded hours = 6.5', () => { expect(result.estimated_hours).toBe(6.5) })
  it('calculated price = $447.50', () => { expect(result.calculated_price).toBe(447.5) })
  it('final price equals calculated when no override', () => { expect(result.final_price).toBe(447.5) })
  it('override_flag is false', () => { expect(result.breakdown?.override_flag).toBe(false) })
  it('buffer is standard (15%)', () => { expect(result.breakdown?.buffer_percent).toBe(0.15) })
  it('bathroom_hours is 0.5', () => { expect(result.breakdown?.bathroom_hours).toBe(0.5) })
})

describe('calculateQuotePrice — scenario 2: Deep + build-up + oven + fridge + Premium', () => {
  const result = calculateQuotePrice({
    ...baseInput,
    service_type_code: 'deep_clean',
    condition_tags: ['build_up_present'],
    addons_wording: ['oven_clean', 'fridge_clean'],
  }, 'premium')

  it('rounded hours = 14.0', () => { expect(result.estimated_hours).toBe(14.0) })
  it('buffer is heavy (20%)', () => { expect(result.breakdown?.buffer_percent).toBe(0.20) })
  it('addon hours sum to 1.5', () => { expect(result.breakdown?.addon_hours).toBe(1.5) })
  it('calculated price = $1007.80', () => { expect(result.calculated_price).toBeCloseTo(1007.8, 2) })
})

describe('calculateQuotePrice — scenario 3: minimum-hours activation', () => {
  // 1-bed / 1-bath Airbnb Turnover / well-maintained → base 2.25 × 0.9 = 2.025 < MIN
  const result = calculateQuotePrice({
    service_category: 'airbnb',
    service_type_code: 'turnover',
    bedrooms: 1,
    bathrooms: 1,
    condition_tags: ['well_maintained'],
    addons_wording: [],
  }, 'standard')

  it('minimum was applied', () => { expect(result.breakdown?.min_applied).toBe(true) })
  it('rounded hours = 3.0', () => { expect(result.estimated_hours).toBe(3.0) })
  it('calculated price = $220.00', () => { expect(result.calculated_price).toBe(220) })
})

describe('calculateQuotePrice — scenario 4: 4-bed / 3-bath EOT / furnished / Win', () => {
  const result = calculateQuotePrice({
    service_category: 'property_management',
    service_type_code: 'end_of_tenancy',
    bedrooms: 4,
    bathrooms: 3,
    condition_tags: ['furnished_property'],
    addons_wording: [],
  }, 'win')

  it('rounded hours = 17.0', () => { expect(result.estimated_hours).toBe(17.0) })
  it('buffer is heavy (20%)', () => { expect(result.breakdown?.buffer_percent).toBe(0.20) })
  it('bathroom_hours is 1.0', () => { expect(result.breakdown?.bathroom_hours).toBe(1.0) })
  it('calculated price = $1041.60', () => { expect(result.calculated_price).toBeCloseTo(1041.6, 2) })
})

describe('calculateQuotePrice — scenario 5: commercial is ineligible', () => {
  const result = calculateQuotePrice({
    service_category: 'commercial',
    service_type_code: 'maintenance',
    bedrooms: null,
    bathrooms: null,
    condition_tags: [],
    addons_wording: [],
  }, 'standard')

  it('eligible is false', () => { expect(result.eligible).toBe(false) })
  it('all result numbers are null', () => {
    expect(result.estimated_hours).toBeNull()
    expect(result.calculated_price).toBeNull()
    expect(result.final_price).toBeNull()
    expect(result.breakdown).toBeNull()
  })
})

describe('calculateQuotePrice — scenario 6: 7-bed clamps to 5-bed', () => {
  const result = calculateQuotePrice({
    service_category: 'residential',
    service_type_code: 'standard_clean',
    bedrooms: 7,
    bathrooms: 2,
    condition_tags: ['well_maintained'],
    addons_wording: [],
  }, 'standard')

  it('bed_count_clamped is true', () => { expect(result.breakdown?.bed_count_clamped).toBe(true) })
  it('bed_count_used is 5', () => { expect(result.breakdown?.bed_count_used).toBe(5) })
  it('base_hours is 8.0', () => { expect(result.breakdown?.base_hours).toBe(8.0) })
  it('rounded hours = 10.0', () => { expect(result.estimated_hours).toBe(10.0) })
  it('calculated price = $675.00', () => { expect(result.calculated_price).toBe(675) })
})

describe('calculateQuotePrice — scenario 7: 0-bed falls back to 1-bed', () => {
  const result = calculateQuotePrice({
    service_category: 'residential',
    service_type_code: 'standard_clean',
    bedrooms: 0,
    bathrooms: 1,
    condition_tags: ['well_maintained'],
    addons_wording: [],
  }, 'standard')

  it('bed_count_fallback is true', () => { expect(result.breakdown?.bed_count_fallback).toBe(true) })
  it('bed_count_used is 1', () => { expect(result.breakdown?.bed_count_used).toBe(1) })
  it('rounded hours = 3.0', () => { expect(result.estimated_hours).toBe(3.0) })
  it('calculated price = $220.00', () => { expect(result.calculated_price).toBe(220) })
})

describe('calculateQuotePrice — scenario 7b: null bedrooms falls back to 1-bed', () => {
  const result = calculateQuotePrice({
    service_category: 'residential',
    service_type_code: 'standard_clean',
    bedrooms: null,
    bathrooms: null,
    condition_tags: [],
    addons_wording: [],
  }, 'standard')

  it('bed_count_fallback is true', () => { expect(result.breakdown?.bed_count_fallback).toBe(true) })
  it('bathroom_hours is 0 (null bathrooms treated as 1)', () => { expect(result.breakdown?.bathroom_hours).toBe(0) })
})

describe('calculateQuotePrice — override behaviour', () => {
  it('applies override and sets override_flag when override differs from calculated', () => {
    const result = calculateQuotePrice(baseInput, 'standard', 500)
    expect(result.final_price).toBe(500)
    expect(result.calculated_price).toBe(447.5)
    expect(result.breakdown?.override_flag).toBe(true)
  })

  it('treats an override equal to calculated as NOT overridden', () => {
    const result = calculateQuotePrice(baseInput, 'standard', 447.5)
    expect(result.final_price).toBe(447.5)
    expect(result.breakdown?.override_flag).toBe(false)
  })

  it('ignores override when ineligible', () => {
    const result = calculateQuotePrice({
      service_category: 'commercial',
      service_type_code: 'maintenance',
      bedrooms: null, bathrooms: null, condition_tags: [], addons_wording: [],
    }, 'standard', 500)
    expect(result.final_price).toBeNull()
  })
})

describe('calculateQuotePrice — pricing mode multipliers', () => {
  it('Win reduces price by 8% (before fee)', () => {
    const win = calculateQuotePrice(baseInput, 'win').calculated_price!
    const std = calculateQuotePrice(baseInput, 'standard').calculated_price!
    // (std - SERVICE_FEE) * 0.92 + SERVICE_FEE = win
    expect(win).toBeCloseTo((std - SERVICE_FEE) * 0.92 + SERVICE_FEE, 2)
  })

  it('Premium raises price by 8% (before fee)', () => {
    const prem = calculateQuotePrice(baseInput, 'premium').calculated_price!
    const std = calculateQuotePrice(baseInput, 'standard').calculated_price!
    expect(prem).toBeCloseTo((std - SERVICE_FEE) * 1.08 + SERVICE_FEE, 2)
  })
})

describe('calculateQuotePrice — multiplicative condition stacking', () => {
  // Deep (1.6) × build_up (1.25) × furnished (1.10) on 3-bed / 2-bath
  const result = calculateQuotePrice({
    ...baseInput,
    service_type_code: 'deep_clean',
    condition_tags: ['build_up_present', 'furnished_property'],
    addons_wording: [],
  }, 'standard')
  // 4.75 × 1.6 × 1.25 × 1.10 = 10.45
  // + bathroom 0.5 = 10.95
  // × 1.20 buffer = 13.14
  // ceil 0.5 = 13.5
  // × 65 × 1.00 = 877.50 + 25 = 902.50

  it('stacks conditions multiplicatively', () => {
    expect(result.estimated_hours).toBe(13.5)
    expect(result.calculated_price).toBe(902.5)
  })

  it('breakdown records each condition adjustment', () => {
    const tags = result.breakdown?.condition_adjustments.map(a => a.tag)
    expect(tags).toEqual(expect.arrayContaining(['build_up_present', 'furnished_property']))
  })
})

describe('calculateQuotePrice — high_use is flat hours, not percent', () => {
  const withHighUse = calculateQuotePrice({
    ...baseInput,
    condition_tags: ['well_maintained', 'high_use_areas'],
  }, 'standard').breakdown!

  const withoutHighUse = calculateQuotePrice(baseInput, 'standard').breakdown!

  it('adds exactly 0.5 to high_use_hours', () => {
    expect(withHighUse.high_use_hours).toBe(0.5)
    expect(withoutHighUse.high_use_hours).toBe(0)
  })
})

describe('calculateQuotePrice — breakdown stores both calculated_price and final_price', () => {
  it('when not overridden, calculated_price === final_price', () => {
    const bd = calculateQuotePrice(baseInput, 'standard').breakdown!
    expect(bd.calculated_price).toBe(bd.final_price)
  })
  it('when overridden, both are present and distinct', () => {
    const bd = calculateQuotePrice(baseInput, 'standard', 999).breakdown!
    expect(bd.calculated_price).toBe(447.5)
    expect(bd.final_price).toBe(999)
  })
})
```

- [ ] **Step 6: Run the suite; expect the scenario tests to fail (eligibility and math not implemented)**

```bash
npm test -- --testPathPattern=quote-pricing
```

Expected: 2 PASS (smoke + maybe `isPricingEligible` "all false" case), most FAIL.

### 2.4 Implement the engine

- [ ] **Step 7: Replace `src/lib/quote-pricing.ts` with the full implementation**

```ts
// Sano quote pricing engine — pure, deterministic, time-based.
// Lives alongside quote-wording.ts but has no dependency on it beyond types.
// Do not import React, Supabase, or formatting utilities here.

import type { ServiceCategory } from './quote-wording'

export type PricingMode = 'win' | 'standard' | 'premium'

export const HOURLY_RATE = 65
export const SERVICE_FEE = 25
export const MIN_JOB_HOURS = 2.25
export const BUFFER_STANDARD = 0.15
export const BUFFER_HEAVY = 0.20

const BED_BASE_HOURS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 2.25, 2: 3.25, 3: 4.75, 4: 6.5, 5: 8.0,
}

const SERVICE_TYPE_MULTIPLIERS: Record<string, number> = {
  'residential.standard_clean':          1.0,
  'residential.deep_clean':              1.6,
  'residential.move_in_out':             1.8,
  'residential.pre_sale':                1.3,
  'property_management.routine':         1.0,
  'property_management.end_of_tenancy':  1.8,
  'property_management.pre_inspection':  1.3,
  'property_management.handover':        1.3,
  'airbnb.turnover':                     0.9,
  'airbnb.deep_reset':                   1.4,
}

const HEAVY_BUFFER_SERVICE_TYPES = new Set<string>([
  'deep_clean', 'move_in_out', 'end_of_tenancy', 'deep_reset',
])

// Percentage adjustments keyed by condition tag. high_use_areas handled separately
// as a flat-hour addition (step 4), not a percentage.
const CONDITION_PERCENT_ADJUSTMENTS: Record<string, number> = {
  average_condition:  0.10,
  build_up_present:   0.25,
  furnished_property: 0.10,
  recently_renovated: 0.30,
  inspection_focus:   0.10,
}

const ADDON_HOURS: Record<string, number> = {
  oven_clean:         1.0,
  fridge_clean:       0.5,
  interior_window:    1.5,
  wall_spot_cleaning: 1.0,
  carpet_cleaning:    0.5,
  spot_treatment:     0.5,
  mould_treatment:    1.5,
}

const MODE_MULTIPLIERS: Record<PricingMode, number> = {
  win: 0.92,
  standard: 1.00,
  premium: 1.08,
}

export interface PricingInput {
  service_category: ServiceCategory | null
  service_type_code: string | null
  bedrooms: number | null
  bathrooms: number | null
  condition_tags: string[]
  addons_wording: string[]
}

export interface PricingAdjustmentNote {
  tag: string
  type: 'percent' | 'hours'
  value: number
}

export interface PricingBreakdown {
  base_hours: number
  bed_count_used: number
  bed_count_clamped: boolean
  bed_count_fallback: boolean
  service_type_multiplier: number
  condition_adjustments: PricingAdjustmentNote[]
  bathroom_hours: number
  high_use_hours: number
  addon_hours: number
  addon_items: { key: string; hours: number }[]
  hours_after_adjustments: number
  min_applied: boolean
  buffer_percent: number
  rounded_hours: number
  hourly_rate: number
  pricing_mode: PricingMode
  pricing_mode_multiplier: number
  service_fee: number
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

function ceilToHalf(hours: number): number {
  return Math.ceil(hours * 2) / 2
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function resolveBedCount(bedrooms: number | null): { used: 1 | 2 | 3 | 4 | 5; clamped: boolean; fallback: boolean } {
  if (bedrooms == null || bedrooms <= 0) return { used: 1, clamped: false, fallback: true }
  if (bedrooms > 5) return { used: 5, clamped: true, fallback: false }
  return { used: Math.floor(bedrooms) as 1 | 2 | 3 | 4 | 5, clamped: false, fallback: false }
}

export function isPricingEligible(
  category: ServiceCategory | null,
  serviceTypeCode: string | null,
): boolean {
  if (!category || !serviceTypeCode) return false
  return `${category}.${serviceTypeCode}` in SERVICE_TYPE_MULTIPLIERS
}

export function calculateQuotePrice(
  input: PricingInput,
  mode: PricingMode,
  override?: number,
): PricingResult {
  if (!isPricingEligible(input.service_category, input.service_type_code)) {
    return { eligible: false, estimated_hours: null, calculated_price: null, final_price: null, breakdown: null }
  }

  const category = input.service_category!
  const code = input.service_type_code!
  const key = `${category}.${code}`

  // Step 1 — base hours from bed count (fallback/clamp)
  const bed = resolveBedCount(input.bedrooms)
  const baseHours = BED_BASE_HOURS[bed.used]

  // Step 2 — service type multiplier
  const serviceMultiplier = SERVICE_TYPE_MULTIPLIERS[key]

  // Step 3 — condition % adjustments (multiplicative stacking)
  const adjustments: PricingAdjustmentNote[] = []
  let conditionMultiplier = 1.0
  for (const tag of input.condition_tags) {
    if (tag in CONDITION_PERCENT_ADJUSTMENTS) {
      const pct = CONDITION_PERCENT_ADJUSTMENTS[tag]
      conditionMultiplier *= (1 + pct)
      adjustments.push({ tag, type: 'percent', value: pct })
    }
  }

  const hoursAfterMultipliers = baseHours * serviceMultiplier * conditionMultiplier

  // Step 4 — flat-hour additions (applied AFTER multipliers)
  const bathCount = (input.bathrooms == null || input.bathrooms <= 0) ? 1 : Math.floor(input.bathrooms)
  const bathroomHours = Math.max(0, (bathCount - 1) * 0.5)

  let highUseHours = 0
  if (input.condition_tags.includes('high_use_areas')) {
    highUseHours = 0.5
    adjustments.push({ tag: 'high_use_areas', type: 'hours', value: 0.5 })
  }

  const addonItems: { key: string; hours: number }[] = []
  let addonHours = 0
  for (const addonKey of input.addons_wording) {
    if (addonKey in ADDON_HOURS) {
      const h = ADDON_HOURS[addonKey]
      addonHours += h
      addonItems.push({ key: addonKey, hours: h })
    }
  }

  const hoursAfterAdjustments =
    hoursAfterMultipliers + bathroomHours + highUseHours + addonHours

  // Step 5 — minimum
  const minApplied = hoursAfterAdjustments < MIN_JOB_HOURS
  const hoursAfterMin = Math.max(hoursAfterAdjustments, MIN_JOB_HOURS)

  // Step 6 — buffer
  const bufferPercent = HEAVY_BUFFER_SERVICE_TYPES.has(code) ? BUFFER_HEAVY : BUFFER_STANDARD
  const hoursWithBuffer = hoursAfterMin * (1 + bufferPercent)

  // Step 7 — round up to 0.5
  const roundedHours = ceilToHalf(hoursWithBuffer)

  // Steps 8–10 — $/hr × mode × + service fee
  const modeMultiplier = MODE_MULTIPLIERS[mode]
  const priceBeforeFee = roundedHours * HOURLY_RATE * modeMultiplier
  const calculatedPrice = round2(priceBeforeFee + SERVICE_FEE)

  // Override handling
  const hasOverride = typeof override === 'number' && Number.isFinite(override) && round2(override) !== calculatedPrice
  const finalPrice = hasOverride ? round2(override) : calculatedPrice

  const breakdown: PricingBreakdown = {
    base_hours: baseHours,
    bed_count_used: bed.used,
    bed_count_clamped: bed.clamped,
    bed_count_fallback: bed.fallback,
    service_type_multiplier: serviceMultiplier,
    condition_adjustments: adjustments,
    bathroom_hours: bathroomHours,
    high_use_hours: highUseHours,
    addon_hours: addonHours,
    addon_items: addonItems,
    hours_after_adjustments: round2(hoursAfterAdjustments),
    min_applied: minApplied,
    buffer_percent: bufferPercent,
    rounded_hours: roundedHours,
    hourly_rate: HOURLY_RATE,
    pricing_mode: mode,
    pricing_mode_multiplier: modeMultiplier,
    service_fee: SERVICE_FEE,
    calculated_price: calculatedPrice,
    final_price: finalPrice,
    override_flag: hasOverride,
  }

  return { eligible: true, estimated_hours: roundedHours, calculated_price: calculatedPrice, final_price: finalPrice, breakdown }
}
```

- [ ] **Step 8: Run the full suite and confirm all tests pass**

```bash
npm test -- --testPathPattern=quote-pricing
```

Expected: ALL tests pass. If a numeric test fails, first re-check the spec's formula in section 3 — the implementation must match the spec, not the other way around. If the spec's expected numbers need correcting, update the spec first, then the test.

- [ ] **Step 9: Typecheck and lint**

```bash
npx tsc --noEmit
npm run lint -- --file src/lib/quote-pricing.ts
```

Expected: no errors related to `quote-pricing.ts`.

- [ ] **Step 10: Commit**

```bash
git add src/lib/quote-pricing.ts src/lib/__tests__/quote-pricing.test.ts
git commit -m "feat: pure quote pricing engine with scenario test suite"
```

---

## Task 3: Append mould_treatment to ADDON_OPTIONS

**Files:**
- Modify: `src/lib/quote-wording.ts` (single-line addition)

- [ ] **Step 1: Append entry to `ADDON_OPTIONS`**

Edit `src/lib/quote-wording.ts`. Locate `ADDON_OPTIONS` (around line 163) and append this entry as the last item before the closing `]`:

```ts
  { value: 'mould_treatment',         label: 'Mould treatment',         wording: 'mould treatment' },
```

The array currently ends with `{ value: 'pressure_washing', ... }`. Add `mould_treatment` after it. Do not modify any other line in this file.

- [ ] **Step 2: Verify the wording pipeline still works**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/quote-wording.ts
git commit -m "feat: add mould_treatment to quote wording ADDON_OPTIONS"
```

---

## Task 4: `PricingSummary` UI component

**Files:**
- Create: `src/app/portal/quotes/_components/PricingSummary.tsx`

**Design note:** The component owns minimal persistent state — only `{ pricing_mode, override_price: string | null, override_flag }` — and derives `calculated_price`, `estimated_hours`, and `breakdown` from the engine via `useMemo` for display. The parent forms **also** call the engine at submit time to get the authoritative numbers; duplicating a pure function call is trivial and avoids any state-sync/infinite-loop issues.

- [ ] **Step 1: Create the component file**

```tsx
'use client'

import { useMemo } from 'react'
import clsx from 'clsx'
import { RotateCcw, ChevronDown } from 'lucide-react'
import {
  calculateQuotePrice,
  isPricingEligible,
  type PricingMode,
  type PricingBreakdown,
} from '@/lib/quote-pricing'
import type { QuoteBuilderState } from './QuoteBuilder'

export interface PricingSummaryValue {
  pricing_mode: PricingMode
  override_price: string | null   // null when no override (input shows calculated)
  override_flag: boolean
}

export function emptyPricingSummaryValue(): PricingSummaryValue {
  return { pricing_mode: 'standard', override_price: null, override_flag: false }
}

function formatNZD(n: number): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

function toNum(v: string): number {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

const MODE_LABELS: { value: PricingMode; label: string }[] = [
  { value: 'win',      label: 'Win the job' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium',  label: 'Premium' },
]

export function PricingSummary({
  builder,
  value,
  onChange,
  savedBreakdown,
  readOnly = false,
  expandedByDefault = false,
}: {
  builder: QuoteBuilderState
  value: PricingSummaryValue
  onChange: (next: PricingSummaryValue) => void
  savedBreakdown?: PricingBreakdown | null
  readOnly?: boolean
  expandedByDefault?: boolean
}) {
  const eligible = isPricingEligible(
    builder.service_category || null,
    builder.service_type_code || null,
  )

  // Derived from builder + owned state. Pure; safe to recompute on every render.
  const live = useMemo(() => {
    if (!eligible) return null
    const overrideNumber = value.override_flag && value.override_price != null
      ? toNum(value.override_price)
      : undefined
    return calculateQuotePrice(
      {
        service_category: builder.service_category || null,
        service_type_code: builder.service_type_code || null,
        bedrooms: builder.bedrooms ? parseInt(builder.bedrooms, 10) : null,
        bathrooms: builder.bathrooms ? parseInt(builder.bathrooms, 10) : null,
        condition_tags: builder.condition_tags,
        addons_wording: builder.addons_wording,
      },
      value.pricing_mode,
      overrideNumber,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    eligible,
    builder.service_category,
    builder.service_type_code,
    builder.bedrooms,
    builder.bathrooms,
    builder.condition_tags.join(','),
    builder.addons_wording.join(','),
    value.pricing_mode,
    value.override_flag,
    value.override_price,
  ])

  // The input displays the override value if one is set, otherwise the live calculated value.
  // No effects, no synced state — the source of truth is `value` (owned state) + `live` (derived).
  const inputValue =
    value.override_flag && value.override_price != null
      ? value.override_price
      : (live?.calculated_price != null ? String(live.calculated_price) : '')

  function setMode(next: PricingMode) {
    if (readOnly) return
    onChange({ ...value, pricing_mode: next })
  }

  function setPriceRaw(next: string) {
    if (readOnly) return
    const typed = toNum(next)
    const calc = live?.calculated_price ?? null
    // An edit counts as an override only when it's eligible AND differs from calculated.
    const isOverride = calc != null && typed !== calc
    onChange({
      ...value,
      override_flag: isOverride,
      override_price: isOverride ? next : null,
    })
  }

  function revertToCalculated() {
    if (readOnly) return
    onChange({ ...value, override_flag: false, override_price: null })
  }

  if (!eligible) {
    return (
      <div className="text-sm text-sage-500 italic bg-sage-50 border border-sage-100 rounded-lg p-4">
        Select an eligible service to use guided pricing. Commercial and legacy services continue to use the manual Base price field below.
      </div>
    )
  }

  const bed = live?.breakdown?.bed_count_used
  const fallback = live?.breakdown?.bed_count_fallback
  const clamped = live?.breakdown?.bed_count_clamped

  return (
    <div className="space-y-5 bg-sage-50/50 border border-sage-100 rounded-xl p-5">
      {fallback && (
        <p className="text-xs text-sage-500 italic">Using 1-bedroom base until property size is selected.</p>
      )}
      {clamped && (
        <p className="text-xs text-amber-700 italic">Pricing currently caps at 5 bedrooms. Please review manually.</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="block text-xs font-medium text-sage-500 uppercase tracking-wide mb-1">Estimated time</span>
          <span className="text-lg font-semibold text-sage-800">{live?.estimated_hours ?? '—'} hrs</span>
        </div>
        <div>
          <span className="block text-xs font-medium text-sage-500 uppercase tracking-wide mb-1">Calculated price</span>
          <span className="text-lg font-semibold text-sage-800">{live?.calculated_price != null ? formatNZD(live.calculated_price) : '—'}</span>
        </div>
      </div>

      <div>
        <span className="block text-sm font-semibold text-sage-800 mb-2">Pricing mode</span>
        <div className="flex flex-wrap gap-2">
          {MODE_LABELS.map(m => (
            <button
              key={m.value}
              type="button"
              disabled={readOnly}
              onClick={() => setMode(m.value)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                value.pricing_mode === m.value
                  ? 'bg-sage-500 text-white border-sage-500'
                  : 'bg-white text-sage-600 border-sage-200 hover:bg-sage-50',
                readOnly && 'opacity-60 cursor-not-allowed',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <BreakdownPanel breakdown={live?.breakdown ?? null} defaultOpen={expandedByDefault} />

      <div>
        <label className="block text-sm font-semibold text-sage-800 mb-1.5">Final price</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={inputValue}
          onChange={(e) => setPriceRaw(e.target.value)}
          disabled={readOnly}
          className={clsx(
            'w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm',
            readOnly && 'bg-sage-50 text-sage-500 cursor-not-allowed',
          )}
        />
        {value.override_flag && live?.calculated_price != null && (
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-amber-700">Overridden from {formatNZD(live.calculated_price)} calculated</span>
            <button
              type="button"
              onClick={revertToCalculated}
              disabled={readOnly}
              className="inline-flex items-center gap-1 text-sage-600 hover:text-sage-800 font-medium"
            >
              <RotateCcw size={12} /> Revert to calculated
            </button>
          </div>
        )}
        {savedBreakdown && !value.override_flag && (
          <p className="mt-2 text-[11px] text-sage-400 italic">Last saved price: {formatNZD(savedBreakdown.final_price)} ({savedBreakdown.pricing_mode}).</p>
        )}
      </div>
    </div>
  )
}

function BreakdownPanel({ breakdown, defaultOpen }: { breakdown: PricingBreakdown | null; defaultOpen?: boolean }) {
  if (!breakdown) return null

  const lines: { label: string; value: string }[] = []
  lines.push({ label: `${breakdown.bed_count_used}-bed base`, value: `${breakdown.base_hours} hrs` })
  if (breakdown.service_type_multiplier !== 1) {
    lines.push({ label: 'Service type', value: `×${breakdown.service_type_multiplier}` })
  }
  for (const adj of breakdown.condition_adjustments) {
    if (adj.type === 'percent') {
      lines.push({ label: prettyTag(adj.tag), value: `×${(1 + adj.value).toFixed(2)}` })
    } else {
      lines.push({ label: prettyTag(adj.tag), value: `+${adj.value} hrs` })
    }
  }
  if (breakdown.bathroom_hours > 0) {
    lines.push({ label: 'Bathrooms', value: `+${breakdown.bathroom_hours} hrs` })
  }
  for (const item of breakdown.addon_items) {
    lines.push({ label: prettyTag(item.key), value: `+${item.hours} hrs` })
  }
  if (breakdown.min_applied) {
    lines.push({ label: 'Minimum job time', value: `${2.25} hrs` })
  }
  lines.push({ label: `Buffer (${Math.round(breakdown.buffer_percent * 100)}%)`, value: `×${(1 + breakdown.buffer_percent).toFixed(2)}` })
  lines.push({ label: 'Rounded', value: `${breakdown.rounded_hours} hrs` })
  lines.push({ label: `$${breakdown.hourly_rate} × ${breakdown.rounded_hours} hrs`, value: new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(breakdown.hourly_rate * breakdown.rounded_hours) })
  if (breakdown.pricing_mode_multiplier !== 1) {
    const label = breakdown.pricing_mode === 'win' ? 'Win' : breakdown.pricing_mode === 'premium' ? 'Premium' : 'Standard'
    lines.push({ label: `${label} ×${breakdown.pricing_mode_multiplier}`, value: '' })
  }
  lines.push({ label: 'Service fee', value: `+${new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(breakdown.service_fee)}` })
  lines.push({ label: 'Calculated', value: new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(breakdown.calculated_price) })

  return (
    <details open={defaultOpen} className="group">
      <summary className="text-xs font-medium text-sage-600 cursor-pointer inline-flex items-center gap-1">
        <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
        Breakdown
      </summary>
      <div className="mt-2 space-y-1 text-xs text-sage-600 pl-4 border-l border-sage-200">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center justify-between">
            <span>{l.label}</span>
            <span className="font-medium text-sage-700">{l.value}</span>
          </div>
        ))}
      </div>
    </details>
  )
}

function prettyTag(key: string): string {
  const map: Record<string, string> = {
    standard_clean: 'Standard clean',
    deep_clean: 'Deep clean',
    move_in_out: 'Move-in / move-out',
    pre_sale: 'Pre-sale',
    routine: 'Routine',
    end_of_tenancy: 'End of tenancy',
    pre_inspection: 'Pre-inspection',
    handover: 'Handover',
    turnover: 'Turnover',
    deep_reset: 'Deep reset',
    average_condition: 'Average condition',
    build_up_present: 'Build-up',
    furnished_property: 'Furnished',
    recently_renovated: 'Post-renovation',
    inspection_focus: 'Inspection focus',
    high_use_areas: 'High-use areas',
    oven_clean: 'Oven',
    fridge_clean: 'Fridge',
    interior_window: 'Interior windows',
    wall_spot_cleaning: 'Wall spot cleaning',
    carpet_cleaning: 'Carpet cleaning',
    spot_treatment: 'Spot treatment',
    mould_treatment: 'Mould treatment',
  }
  return map[key] ?? key
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/portal/quotes/_components/PricingSummary.tsx
git commit -m "feat: PricingSummary component with mode selector and override UX"
```

---

## Task 5: Integrate `PricingSummary` into the New Quote flow

**Files:**
- Modify: `src/app/portal/quotes/new/_components/NewQuoteForm.tsx`
- Modify: `src/app/portal/quotes/new/_actions.ts`

### 5.1 Form state + UI

- [ ] **Step 1: Import `PricingSummary`, engine, and initialise state**

At the top of `NewQuoteForm.tsx`, add imports:

```tsx
import { PricingSummary, emptyPricingSummaryValue, type PricingSummaryValue } from '../../_components/PricingSummary'
import { calculateQuotePrice, isPricingEligible } from '@/lib/quote-pricing'
```

In the component body, alongside `const [builder, setBuilder] = useState<QuoteBuilderState>(emptyBuilderState())`, add:

```tsx
const [pricing, setPricing] = useState<PricingSummaryValue>(emptyPricingSummaryValue())
```

- [ ] **Step 2: Derive eligibility and engine result in the parent**

Under the existing state declarations, add:

```tsx
const eligible = isPricingEligible(builder.service_category || null, builder.service_type_code || null)

const engineResult = useMemo(() => {
  if (!eligible) return null
  const overrideNumber = pricing.override_flag && pricing.override_price != null
    ? toNum(pricing.override_price)
    : undefined
  return calculateQuotePrice(
    {
      service_category: builder.service_category || null,
      service_type_code: builder.service_type_code || null,
      bedrooms: builder.bedrooms ? parseInt(builder.bedrooms, 10) : null,
      bathrooms: builder.bathrooms ? parseInt(builder.bathrooms, 10) : null,
      condition_tags: builder.condition_tags,
      addons_wording: builder.addons_wording,
    },
    pricing.pricing_mode,
    overrideNumber,
  )
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  eligible,
  builder.service_category,
  builder.service_type_code,
  builder.bedrooms,
  builder.bathrooms,
  builder.condition_tags.join(','),
  builder.addons_wording.join(','),
  pricing.pricing_mode,
  pricing.override_flag,
  pricing.override_price,
])
```

Add `useMemo` to the `react` import at the top of the file if it's not already imported.

- [ ] **Step 3: Replace the manual Base price input with the pricing pathway**

In the existing **Pricing** section (currently around lines 301–329), replace the manual `Base price ($)` input with a conditional that renders `<PricingSummary>` when eligible, and keeps the manual `basePrice` input only for ineligible cases.

Locate the current Pricing `<Section>`:

```tsx
{/* ── Section 4: Pricing ──────────────────────── */}
<Section title="Pricing">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <Field
      label="Base price ($)"
      type="number"
      step="0.01"
      min="0"
      value={basePrice}
      onChange={setBasePrice}
      required
      error={validationErrors.basePrice}
    />
    <Field label="Discount ($)" type="number" step="0.01" min="0" value={discount} onChange={setDiscount} />
  </div>
  ...
```

Replace the two-column grid with:

```tsx
{/* ── Section 4: Pricing ──────────────────────── */}
<Section title="Pricing">
  {eligible ? (
    <PricingSummary builder={builder} value={pricing} onChange={setPricing} />
  ) : (
    <Field
      label="Base price ($)"
      type="number"
      step="0.01"
      min="0"
      value={basePrice}
      onChange={setBasePrice}
      required
      error={validationErrors.basePrice}
    />
  )}
  <div className="mt-4 max-w-sm">
    <Field label="Discount ($)" type="number" step="0.01" min="0" value={discount} onChange={setDiscount} />
  </div>
  ...
```

- [ ] **Step 4: Compute the effective base value used by totals + submit**

Near the existing `const base = toNum(basePrice)` line (around line 133), replace the constant:

```tsx
const base = eligible && engineResult?.final_price != null
  ? engineResult.final_price
  : toNum(basePrice)
```

`addonsTotal`, `disc`, and `total` calculations remain as-is.

- [ ] **Step 5: Update validation**

In the existing `validate()` function, replace the base-price validation:

```tsx
if (!basePrice.trim() || toNum(basePrice) <= 0) {
  errs.basePrice = 'Base price is required.'
}
```

with:

```tsx
if (eligible) {
  if (engineResult?.final_price == null || engineResult.final_price <= 0) {
    errs.basePrice = 'Final price is required. Select a service type and confirm pricing.'
  }
} else if (!basePrice.trim() || toNum(basePrice) <= 0) {
  errs.basePrice = 'Base price is required.'
}
```

- [ ] **Step 6: Pass pricing fields through to `createQuote`**

In the `handleSubmit`'s `createQuote(...)` call, add (alongside the existing `base_price: base` line):

```tsx
pricing_mode: eligible ? pricing.pricing_mode : undefined,
estimated_hours: eligible ? engineResult?.estimated_hours ?? undefined : undefined,
pricing_breakdown: eligible ? engineResult?.breakdown ?? undefined : undefined,
```

### 5.2 Server action

- [ ] **Step 7: Extend the `CreateQuoteInput` interface and the insert payload in `_actions.ts`**

At the top of `src/app/portal/quotes/new/_actions.ts`, import the breakdown type:

```ts
import type { PricingBreakdown, PricingMode } from '@/lib/quote-pricing'
```

Add to `CreateQuoteInput`:

```ts
  // Pricing engine fields (null when ineligible)
  pricing_mode?: PricingMode
  estimated_hours?: number
  pricing_breakdown?: PricingBreakdown
```

In the `supabase.from('quotes').insert({ ... })` payload, add (alongside `base_price: input.base_price`):

```ts
  pricing_mode: input.pricing_mode ?? null,
  estimated_hours: input.estimated_hours ?? null,
  pricing_breakdown: input.pricing_breakdown ?? null,
```

- [ ] **Step 8: Typecheck + lint**

```bash
npx tsc --noEmit
npm run lint -- --file src/app/portal/quotes/new/_components/NewQuoteForm.tsx --file src/app/portal/quotes/new/_actions.ts
```

Expected: no new errors.

- [ ] **Step 9: Commit**

```bash
git add src/app/portal/quotes/new/_components/NewQuoteForm.tsx src/app/portal/quotes/new/_actions.ts
git commit -m "feat: wire PricingSummary into New Quote form + action"
```

---

## Task 6: Integrate `PricingSummary` into the Edit Quote flow

**Files:**
- Modify: `src/app/portal/quotes/[id]/page.tsx`
- Modify: `src/app/portal/quotes/[id]/_components/EditQuoteForm.tsx`
- Modify: `src/app/portal/quotes/[id]/_actions.ts`

### 6.1 Select new columns on page load

- [ ] **Step 1: Add the three new columns to the `quotes` select**

In `src/app/portal/quotes/[id]/page.tsx`, in the `supabase.from('quotes').select(...)` block (around lines 19–54), append these column names to the select string:

```
pricing_mode,
estimated_hours,
pricing_breakdown,
```

### 6.2 Edit form hydration + UI

- [ ] **Step 2: Extend the `Quote` interface**

In `EditQuoteForm.tsx`, add to the `Quote` interface (around lines 40–73):

```ts
  pricing_mode: string | null
  estimated_hours: number | null
  pricing_breakdown: unknown | null
```

- [ ] **Step 3: Import pricing module + initialise pricing state with hydration**

Add imports at the top of `EditQuoteForm.tsx`:

```ts
import { useMemo, useState, useTransition } from 'react'   // useMemo added to existing import
import { PricingSummary, emptyPricingSummaryValue, type PricingSummaryValue } from '../../_components/PricingSummary'
import { calculateQuotePrice, isPricingEligible, type PricingBreakdown, type PricingMode } from '@/lib/quote-pricing'
```

Alongside existing `useState` calls, add:

```ts
const savedBreakdown = (quote.pricing_breakdown as PricingBreakdown | null) ?? null

const [pricing, setPricing] = useState<PricingSummaryValue>(() => {
  // If the saved row was overridden, hydrate the override_price from base_price so the input shows the saved override.
  // Otherwise start unoverridden so the input will follow the live calculated price.
  if (savedBreakdown?.override_flag) {
    return {
      pricing_mode: (quote.pricing_mode as PricingMode | null) ?? 'standard',
      override_price: String(quote.base_price || ''),
      override_flag: true,
    }
  }
  return {
    ...emptyPricingSummaryValue(),
    pricing_mode: (quote.pricing_mode as PricingMode | null) ?? 'standard',
  }
})

const isLocked = quote.status === 'sent' || quote.status === 'accepted'
```

- [ ] **Step 4: Replace the manual Base price input in the Pricing section**

Locate the Pricing section in `EditQuoteForm.tsx` (find the `<Field label="Base price ($)" ... />` usage). Replace with the same conditional pattern as the New Quote flow:

```tsx
{isPricingEligible(builder.service_category || null, builder.service_type_code || null) ? (
  <PricingSummary
    builder={builder}
    value={pricing}
    onChange={setPricing}
    savedBreakdown={savedBreakdown}
    readOnly={isLocked}
  />
) : (
  <Field
    label="Base price ($)"
    type="number"
    step="0.01"
    min="0"
    value={basePrice}
    onChange={setBasePrice}
  />
)}
```

When `isLocked` is true, the component renders read-only (mode buttons disabled, input disabled, breakdown visible for reference). Status transitions handled elsewhere (`MarkAsAcceptedButton`, send email action) update `status` + `accepted_at` only — they do not invoke `updateQuote` and therefore do not recalc pricing, satisfying the spec's "status changes alone must not recalculate" rule.

- [ ] **Step 5: Derive engine result + effective base + update submit**

In the component body, derive eligibility + engine result the same way as `NewQuoteForm`:

```tsx
const eligible = isPricingEligible(builder.service_category || null, builder.service_type_code || null)

const engineResult = useMemo(() => {
  if (eligible === false || isLocked) return null
  const overrideNumber = pricing.override_flag && pricing.override_price != null
    ? toNum(pricing.override_price)
    : undefined
  return calculateQuotePrice(
    {
      service_category: builder.service_category || null,
      service_type_code: builder.service_type_code || null,
      bedrooms: builder.bedrooms ? parseInt(builder.bedrooms, 10) : null,
      bathrooms: builder.bathrooms ? parseInt(builder.bathrooms, 10) : null,
      condition_tags: builder.condition_tags,
      addons_wording: builder.addons_wording,
    },
    pricing.pricing_mode,
    overrideNumber,
  )
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  eligible, isLocked,
  builder.service_category, builder.service_type_code,
  builder.bedrooms, builder.bathrooms,
  builder.condition_tags.join(','), builder.addons_wording.join(','),
  pricing.pricing_mode, pricing.override_flag, pricing.override_price,
])
```

Replace the existing `const base = toNum(basePrice)` with:

```tsx
const base = eligible
  ? (engineResult?.final_price ?? quote.base_price ?? 0)   // locked quote → engineResult is null → fall back to saved
  : toNum(basePrice)
```

In the `updateQuote(...)` call, add alongside `base_price: base`:

```tsx
pricing_mode: isLocked
  ? (quote.pricing_mode as PricingMode | null) ?? undefined
  : (eligible ? pricing.pricing_mode : undefined),
estimated_hours: isLocked
  ? quote.estimated_hours ?? undefined
  : (eligible ? engineResult?.estimated_hours ?? undefined : undefined),
pricing_breakdown: isLocked
  ? savedBreakdown ?? undefined
  : (eligible ? engineResult?.breakdown ?? undefined : undefined),
```

Rationale: when the quote is locked (sent/accepted), the UI showed the saved values read-only — resubmitting the form (for a non-pricing change like a note or address tweak) should write them back unchanged. When unlocked and eligible, write fresh engine results. When unlocked and ineligible, pass `undefined` so the server action clears the columns (Commercial or service-type-deselected case).

### 6.3 Server action

- [ ] **Step 6: Extend `UpdateQuoteInput` and the update payload**

In `src/app/portal/quotes/[id]/_actions.ts`, add the import:

```ts
import type { PricingBreakdown, PricingMode } from '@/lib/quote-pricing'
```

Append to `UpdateQuoteInput`:

```ts
  pricing_mode?: PricingMode
  estimated_hours?: number
  pricing_breakdown?: PricingBreakdown
```

In the `supabase.from('quotes').update({ ... })` payload, add alongside `base_price: input.base_price`:

```ts
  pricing_mode: input.pricing_mode ?? null,
  estimated_hours: input.estimated_hours ?? null,
  pricing_breakdown: input.pricing_breakdown ?? null,
```

`sendQuoteEmail` and `markQuoteAccepted` are **unchanged** — they update only `status` / `sent_at` / `date_issued` / `valid_until` / `accepted_at` and never touch pricing fields. This is the code-level guarantee behind the spec's "status changes alone must not recalculate" rule.

- [ ] **Step 7: Typecheck + lint**

```bash
npx tsc --noEmit
npm run lint -- --file src/app/portal/quotes/[id]/_components/EditQuoteForm.tsx --file src/app/portal/quotes/[id]/_actions.ts --file src/app/portal/quotes/[id]/page.tsx
```

Expected: no new errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/portal/quotes/[id]/_components/EditQuoteForm.tsx src/app/portal/quotes/[id]/_actions.ts src/app/portal/quotes/[id]/page.tsx
git commit -m "feat: wire PricingSummary into Edit Quote flow with lock on sent/accepted"
```

---

## Task 7: Browser verification (authoritative)

Manual pass in the running dev server against the deployed portal behaviour. This is the final verification step per the Sano "current system status = deployed + verified" rule — nothing in this plan is considered live until these steps pass on Netlify and the user has confirmed.

**Pre-flight:**

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open `http://localhost:3000/portal/quotes/new`.

### 7.1 New Quote happy path

- [ ] **Step 2: Scenario 1 (3-bed / 2-bath Standard / well-maintained / Standard mode)**

Pick Residential → Standard Clean. Set Bedrooms=3, Bathrooms=2, keep `well_maintained`, no add-ons, mode = Standard.

Expected in Pricing Summary:
- Estimated time: **6.5 hrs**
- Calculated price: **$447.50**
- Final price: **$447.50**, no override banner.

- [ ] **Step 3: Scenario 2 (Deep + build-up + oven + fridge + Premium)**

Switch service type to Deep Clean. Toggle `build_up_present`. Under Additional services, toggle `oven_clean` + `fridge_clean`. Switch mode to Premium.

Expected:
- Estimated time: **14.0 hrs**
- Buffer line shows **20%**
- Calculated price: **$1,007.80**

- [ ] **Step 4: Scenario 4 (PM EOT / 4-bed / 3-bath / furnished / Win)**

Switch category to Property Management → End of Tenancy. Bedrooms=4, Bathrooms=3, toggle `furnished_property`, mode = Win.

Expected:
- Estimated time: **17.0 hrs**
- Calculated price: **$1,041.60**

- [ ] **Step 5: Scenario 6 (7-bed clamp)**

Residential → Standard Clean, Bedrooms=7. Confirm: muted cap note visible; calculation uses 5-bed base; price = **$675.00**.

- [ ] **Step 6: Scenario 7 (0-bed fallback)**

Set Bedrooms=0. Confirm fallback note visible; price = **$220.00**.

### 7.2 Ineligible flow

- [ ] **Step 7: Commercial stays on the manual Base price input**

Switch category to Commercial → Maintenance. Confirm `PricingSummary` is replaced by the plain **Base price ($)** input (current behaviour). Enter a number, save, reopen, confirm it persists.

### 7.3 Override + edit

- [ ] **Step 8: Override on new quote, save, reopen, revert**

Back to Residential / Standard / 3-bed / 2-bath. Type `500` into Final price. Confirm "Overridden from $447.50 calculated" appears. Save. Navigate to the saved quote.

Reopen the Edit form. Confirm:
- Final price field shows **500**.
- Overridden line references the current live calculated price (not the old saved one — change Bedrooms to 4 and confirm the overridden-from number updates to the new calc).
- `Revert to calculated` clears the override and sets Final price to the live calculated value; `override_flag` is cleared.

### 7.4 Live recalc on draft edit

- [ ] **Step 9: Change inputs without overriding and confirm recalc**

On a fresh Residential / Standard quote, save. Reopen. Change Bedrooms from 3 to 4. Confirm:
- Estimated time + calculated price update live.
- Final price follows calculated (no override flag set).
- Previously saved breakdown is visible as `Last saved price: ...` until the next save.

### 7.5 Legacy quote compatibility

- [ ] **Step 10: Open a pre-existing legacy quote (pricing fields null)**

Pick any quote that existed before this feature was deployed. Confirm:
- Form still renders.
- Pricing section shows the plain **Base price** input if the service type is ineligible (or legacy).
- For an eligible legacy quote, `PricingSummary` appears; `savedBreakdown` is null; Final price hydrates from the existing `base_price`; `override_flag` starts false; the engine runs from current inputs.

### 7.6 Client-facing rendering

- [ ] **Step 11: Send a priced quote and inspect the client-facing views**

Send a Residential / Standard / priced quote via the Send panel. Confirm in the email preview, print view (`/portal/quotes/{id}/print`), and share view (`/share/quote/{token}`):
- Only the **final total** is shown.
- No calculated price, no estimated hours, no service fee line, no pricing mode, no override note anywhere.

### 7.7 Accept flow does not recalculate

- [ ] **Step 12: Accept a priced quote**

On a priced, sent quote, click **Mark as accepted**. Confirm:
- Status transitions to **accepted**.
- `base_price` remains unchanged (compare before/after).
- Edit form now renders with the pricing section in read-only mode (mode buttons disabled, Final price disabled, breakdown still visible).
- No pricing recalculation fires.

### 7.8 Sent lock

- [ ] **Step 13: Confirm sent quotes lock the pricing UI**

Send a quote but do not accept. Reopen from `/portal/quotes/{id}`. Confirm:
- Pricing section is read-only.
- Saved breakdown visible for reference.
- Explicitly attempting to edit inputs that would normally recalculate does nothing (disabled) until / unless the user changes a field that triggers an explicit save.

### 7.9 Final check

- [ ] **Step 14: Full pass + no console errors**

Tail the browser devtools console throughout Steps 2–13. Expected: no errors, no React warnings about state updates during render, no hydration mismatches.

- [ ] **Step 15: Typecheck + lint + Jest one last time**

```bash
npx tsc --noEmit
npm run lint
npm test -- --testPathPattern=quote-pricing
```

Expected: all green.

- [ ] **Step 16: Commit browser verification notes (if any arose from steps 2–14, e.g. formula corrections)**

Only if code changes were needed during verification. Otherwise nothing to commit here — this is a verification pass, not an implementation pass.

---

## Out of scope (do not do here)

- Commercial base-time model.
- Hourly rate UI override (keep hardcoded $65).
- Bulk re-pricing of historical quotes.
- Changes to `quote-wording.ts` logic/templates beyond the `mould_treatment` append.
- Changes to invoice, print, PDF, email rendering (they naturally pick up the new `base_price`).
- Changes to `labour-calc.ts` (unrelated internal job margin).

---

## Success criteria

- All Jest tests in `src/lib/__tests__/quote-pricing.test.ts` pass.
- `npx tsc --noEmit` and `npm run lint` report no new errors.
- All 14 browser verification steps pass.
- Legacy quotes continue to open and save without error.
- A `sent` or `accepted` quote's `base_price` does not change from a status transition alone.
- `$25` service fee is not itemised in any client-facing output.
- `mould_treatment` appears in the Additional services chip row and in the generated scope wording when selected.
