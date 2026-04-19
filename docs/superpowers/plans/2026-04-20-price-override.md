# Manual Price Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing implicit "type a different number into PricingSummary" override path with a single explicit, fully-audited manual override flow on the quote form, and snapshot the override metadata onto invoices at conversion time.

**Architecture:** A new `OverridePanel` component owns the toggle + revealed inputs. `PricingSummary` is refactored to display-only. Both `NewQuoteForm` and `EditQuoteForm` add new override state, compute `final_price` at form level (`is_price_overridden ? override_price : engineResult.final_price`), and pass override fields through to server actions. `convertToInvoice` copies the seven override columns onto invoices as a snapshot. Invoice detail page renders an audit block when override is present.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Supabase (Postgres), Tailwind CSS, Jest + React Testing Library.

**Spec:** [docs/superpowers/specs/2026-04-20-price-override-design.md](../specs/2026-04-20-price-override-design.md)

**Working directory for all commands:** `F:/Sano/01-Site`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `docs/db/2026-04-20-add-price-override.sql` | Create | DDL for adding 7 columns to `quotes` and `invoices`. Mike runs manually in Supabase dashboard. |
| `src/app/portal/quotes/_components/OverridePanel.tsx` | Create | Encapsulates the override toggle, custom price input, reason textarea, confirmation checkbox, warning text. Reusable by both forms. |
| `src/app/portal/quotes/_components/__tests__/OverridePanel.test.tsx` | Create | Component behaviour tests for OverridePanel. |
| `src/app/portal/quotes/_components/override-validation.ts` | Create | Pure validation function — `validateOverride(state) → ValidationErrors`. Easily testable, reused by both forms and both server actions. |
| `src/app/portal/quotes/_components/__tests__/override-validation.test.ts` | Create | Unit tests for the validator. |
| `src/app/portal/quotes/_components/PricingSummary.tsx` | Modify | Strip the editable Final price input + Revert-to-calculated button + override-related logic. Component becomes display-only. Simplify `PricingSummaryValue` to `{ pricing_mode }`. |
| `src/app/portal/quotes/new/_components/NewQuoteForm.tsx` | Modify | Add override state, OverridePanel, final-price banner. Disable discount when override on. Compute `final_price` at form level. |
| `src/app/portal/quotes/[id]/_components/EditQuoteForm.tsx` | Modify | Same as above, plus hydrate override state from the new saved columns. |
| `src/app/portal/quotes/new/_actions.ts` | Modify | Accept and persist 7 override columns. Repeat server-side validation. |
| `src/app/portal/quotes/[id]/_actions.ts` | Modify | Same as above, for `updateQuote`. |
| `src/app/portal/quotes/[id]/_actions-invoice.ts` | Modify | Select 7 override columns from quote; insert them onto invoice. |
| `src/app/portal/invoices/[id]/page.tsx` | Modify | Render audit block when `is_price_overridden = true`. |

---

## Task 1: Schema migration SQL file

**Files:**
- Create: `docs/db/2026-04-20-add-price-override.sql`

This task only creates the SQL file. Mike runs it manually in the Supabase dashboard during Task 10 (final deployment). Tests for schema are deferred to manual verification in Task 10.

- [ ] **Step 1: Create the SQL file**

Write to `docs/db/2026-04-20-add-price-override.sql`:

```sql
-- Manual price override fields
-- Adds 7 columns each to quotes and invoices.
-- Invoices receive the values as an audit snapshot during convertToInvoice.
-- Run via Supabase dashboard SQL editor.

-- ── quotes table ─────────────────────────────────────────────
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS is_price_overridden     boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_price          decimal(10,2),
  ADD COLUMN IF NOT EXISTS override_reason         text,
  ADD COLUMN IF NOT EXISTS override_confirmed      boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_confirmed_by   uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS override_confirmed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS calculated_price        decimal(10,2);

-- ── invoices table ──────────────────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS is_price_overridden     boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_price          decimal(10,2),
  ADD COLUMN IF NOT EXISTS override_reason         text,
  ADD COLUMN IF NOT EXISTS override_confirmed      boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_confirmed_by   uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS override_confirmed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS calculated_price        decimal(10,2);

-- Index for queries that filter overridden rows for audit reporting.
CREATE INDEX IF NOT EXISTS idx_quotes_is_price_overridden
  ON public.quotes (is_price_overridden) WHERE is_price_overridden;

CREATE INDEX IF NOT EXISTS idx_invoices_is_price_overridden
  ON public.invoices (is_price_overridden) WHERE is_price_overridden;
```

- [ ] **Step 2: Commit the SQL file**

```bash
git add docs/db/2026-04-20-add-price-override.sql
git commit -m "feat(db): add manual price override columns to quotes and invoices"
```

---

## Task 2: Pure validation function and tests

**Files:**
- Create: `src/app/portal/quotes/_components/override-validation.ts`
- Create: `src/app/portal/quotes/_components/__tests__/override-validation.test.ts`

A pure validator avoids duplicating logic across two forms and two server actions. TDD here is straightforward.

- [ ] **Step 1: Write failing tests**

Create `src/app/portal/quotes/_components/__tests__/override-validation.test.ts`:

```typescript
import { validateOverride, type OverrideInput } from '../override-validation'

describe('validateOverride', () => {
  function base(): OverrideInput {
    return {
      is_price_overridden: false,
      override_price: '',
      override_reason: '',
      override_confirmed: false,
    }
  }

  it('returns no errors when override is off, regardless of other fields', () => {
    const errs = validateOverride({ ...base(), override_price: '0', override_reason: '' })
    expect(errs).toEqual({})
  })

  it('requires override_price > 0 when override is on', () => {
    const errs = validateOverride({ ...base(), is_price_overridden: true, override_price: '0', override_reason: 'x', override_confirmed: true })
    expect(errs.override_price).toBeDefined()
  })

  it('rejects negative override_price', () => {
    const errs = validateOverride({ ...base(), is_price_overridden: true, override_price: '-5', override_reason: 'x', override_confirmed: true })
    expect(errs.override_price).toBeDefined()
  })

  it('rejects empty or whitespace-only reason', () => {
    const errs = validateOverride({ ...base(), is_price_overridden: true, override_price: '100', override_reason: '   ', override_confirmed: true })
    expect(errs.override_reason).toBeDefined()
  })

  it('requires confirmation', () => {
    const errs = validateOverride({ ...base(), is_price_overridden: true, override_price: '100', override_reason: 'Customer negotiated', override_confirmed: false })
    expect(errs.override_confirmed).toBeDefined()
  })

  it('returns no errors when all required fields are valid', () => {
    const errs = validateOverride({
      is_price_overridden: true,
      override_price: '250',
      override_reason: 'Customer negotiated',
      override_confirmed: true,
    })
    expect(errs).toEqual({})
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd F:/Sano/01-Site && npx jest src/app/portal/quotes/_components/__tests__/override-validation.test.ts
```

Expected: All tests fail with module not found error.

- [ ] **Step 3: Implement the validator**

Create `src/app/portal/quotes/_components/override-validation.ts`:

```typescript
export interface OverrideInput {
  is_price_overridden: boolean
  override_price: string  // raw input string from form
  override_reason: string
  override_confirmed: boolean
}

export interface OverrideValidationErrors {
  override_price?: string
  override_reason?: string
  override_confirmed?: string
}

export function validateOverride(input: OverrideInput): OverrideValidationErrors {
  if (!input.is_price_overridden) return {}

  const errors: OverrideValidationErrors = {}

  const price = parseFloat(input.override_price)
  if (!Number.isFinite(price) || price <= 0) {
    errors.override_price = 'Custom price must be greater than 0.'
  }

  if (!input.override_reason.trim()) {
    errors.override_reason = 'Reason is required.'
  }

  if (!input.override_confirmed) {
    errors.override_confirmed = 'Confirmation is required to apply an override.'
  }

  return errors
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd F:/Sano/01-Site && npx jest src/app/portal/quotes/_components/__tests__/override-validation.test.ts
```

Expected: All 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/portal/quotes/_components/override-validation.ts src/app/portal/quotes/_components/__tests__/override-validation.test.ts
git commit -m "feat(quotes): add pure validator for manual price override"
```

---

## Task 3: OverridePanel component

**Files:**
- Create: `src/app/portal/quotes/_components/OverridePanel.tsx`
- Create: `src/app/portal/quotes/_components/__tests__/OverridePanel.test.tsx`

OverridePanel owns the toggle + revealed fields. It receives state and callbacks from the parent form (forms own the state so they can compute `final_price` from it).

- [ ] **Step 1: Write failing component tests**

Create `src/app/portal/quotes/_components/__tests__/OverridePanel.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { OverridePanel, type OverridePanelValue } from '../OverridePanel'

function defaultValue(overrides: Partial<OverridePanelValue> = {}): OverridePanelValue {
  return {
    is_price_overridden: false,
    override_price: '',
    override_reason: '',
    override_confirmed: false,
    ...overrides,
  }
}

describe('OverridePanel', () => {
  it('renders the toggle, hidden panel by default', () => {
    render(<OverridePanel value={defaultValue()} onChange={() => {}} errors={{}} />)
    expect(screen.getByLabelText(/override price manually/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/custom price/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/reason for override/i)).not.toBeInTheDocument()
  })

  it('reveals custom price, reason, confirmation when toggle is on', () => {
    render(<OverridePanel value={defaultValue({ is_price_overridden: true })} onChange={() => {}} errors={{}} />)
    expect(screen.getByLabelText(/custom price/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/reason for override/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/i confirm this overrides/i)).toBeInTheDocument()
    expect(screen.getByText(/this price bypasses the pricing engine/i)).toBeInTheDocument()
  })

  it('calls onChange with is_price_overridden flipped when toggle clicked', () => {
    const handle = jest.fn()
    render(<OverridePanel value={defaultValue()} onChange={handle} errors={{}} />)
    fireEvent.click(screen.getByLabelText(/override price manually/i))
    expect(handle).toHaveBeenCalledWith(expect.objectContaining({ is_price_overridden: true }))
  })

  it('does not clear other fields when toggle is turned off', () => {
    const handle = jest.fn()
    const filled = defaultValue({ is_price_overridden: true, override_price: '250', override_reason: 'Negotiated', override_confirmed: true })
    render(<OverridePanel value={filled} onChange={handle} errors={{}} />)
    fireEvent.click(screen.getByLabelText(/override price manually/i))
    expect(handle).toHaveBeenCalledWith({
      is_price_overridden: false,
      override_price: '250',
      override_reason: 'Negotiated',
      override_confirmed: true,
    })
  })

  it('shows inline errors when provided', () => {
    render(
      <OverridePanel
        value={defaultValue({ is_price_overridden: true })}
        onChange={() => {}}
        errors={{
          override_price: 'Custom price must be greater than 0.',
          override_reason: 'Reason is required.',
          override_confirmed: 'Confirmation is required to apply an override.',
        }}
      />
    )
    expect(screen.getByText(/custom price must be greater than 0/i)).toBeInTheDocument()
    expect(screen.getByText(/reason is required/i)).toBeInTheDocument()
    expect(screen.getByText(/confirmation is required/i)).toBeInTheDocument()
  })

  it('disables all controls when readOnly', () => {
    render(<OverridePanel value={defaultValue({ is_price_overridden: true })} onChange={() => {}} errors={{}} readOnly />)
    expect(screen.getByLabelText(/override price manually/i)).toBeDisabled()
    expect(screen.getByLabelText(/custom price/i)).toBeDisabled()
    expect(screen.getByLabelText(/reason for override/i)).toBeDisabled()
    expect(screen.getByLabelText(/i confirm this overrides/i)).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd F:/Sano/01-Site && npx jest src/app/portal/quotes/_components/__tests__/OverridePanel.test.tsx
```

Expected: All tests fail with module not found.

- [ ] **Step 3: Implement the component**

Create `src/app/portal/quotes/_components/OverridePanel.tsx`:

```tsx
'use client'

import clsx from 'clsx'
import type { OverrideValidationErrors } from './override-validation'

export interface OverridePanelValue {
  is_price_overridden: boolean
  override_price: string
  override_reason: string
  override_confirmed: boolean
}

interface Props {
  value: OverridePanelValue
  onChange: (next: OverridePanelValue) => void
  errors: OverrideValidationErrors
  readOnly?: boolean
}

export function OverridePanel({ value, onChange, errors, readOnly = false }: Props) {
  function update<K extends keyof OverridePanelValue>(key: K, next: OverridePanelValue[K]) {
    if (readOnly) return
    onChange({ ...value, [key]: next })
  }

  return (
    <div className="mt-4">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          aria-label="Override price manually"
          checked={value.is_price_overridden}
          onChange={(e) => update('is_price_overridden', e.target.checked)}
          disabled={readOnly}
          className="h-4 w-4 rounded border-sage-300 text-sage-500 focus:ring-sage-500"
        />
        <span className="text-sm font-medium text-sage-800">Override price manually</span>
      </label>

      {value.is_price_overridden && (
        <div className="mt-4 space-y-4 bg-amber-50/40 border border-amber-200 rounded-xl p-5">
          <p className="text-xs text-amber-700 italic">
            This price bypasses the pricing engine and may affect margins.
          </p>

          <div>
            <label htmlFor="override-price" className="block text-sm font-semibold text-sage-800 mb-1.5">
              Custom Price ($) <span className="text-red-500">*</span>
            </label>
            <input
              id="override-price"
              type="number"
              step="0.01"
              min="0"
              value={value.override_price}
              onChange={(e) => update('override_price', e.target.value)}
              disabled={readOnly}
              className={clsx(
                'w-full max-w-sm rounded-lg border px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent',
                errors.override_price ? 'border-red-400' : 'border-sage-200',
                readOnly && 'bg-sage-50 text-sage-500 cursor-not-allowed',
              )}
            />
            {errors.override_price && (
              <span className="text-red-500 text-xs mt-1 block">{errors.override_price}</span>
            )}
          </div>

          <div>
            <label htmlFor="override-reason" className="block text-sm font-semibold text-sage-800 mb-1.5">
              Reason for override <span className="text-red-500">*</span>
            </label>
            <textarea
              id="override-reason"
              rows={3}
              value={value.override_reason}
              onChange={(e) => update('override_reason', e.target.value)}
              disabled={readOnly}
              className={clsx(
                'w-full rounded-lg border px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent',
                errors.override_reason ? 'border-red-400' : 'border-sage-200',
                readOnly && 'bg-sage-50 text-sage-500 cursor-not-allowed',
              )}
            />
            {errors.override_reason && (
              <span className="text-red-500 text-xs mt-1 block">{errors.override_reason}</span>
            )}
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                aria-label="I confirm this overrides the calculated price"
                checked={value.override_confirmed}
                onChange={(e) => update('override_confirmed', e.target.checked)}
                disabled={readOnly}
                className="h-4 w-4 rounded border-sage-300 text-sage-500 focus:ring-sage-500"
              />
              <span className="text-sm text-sage-800">I confirm this overrides the calculated price</span>
            </label>
            {errors.override_confirmed && (
              <span className="text-red-500 text-xs mt-1 block">{errors.override_confirmed}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd F:/Sano/01-Site && npx jest src/app/portal/quotes/_components/__tests__/OverridePanel.test.tsx
```

Expected: All 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/portal/quotes/_components/OverridePanel.tsx src/app/portal/quotes/_components/__tests__/OverridePanel.test.tsx
git commit -m "feat(quotes): add OverridePanel component for manual price override"
```

---

## Task 4: Refactor PricingSummary to display-only

**Files:**
- Modify: `src/app/portal/quotes/_components/PricingSummary.tsx`

This task removes the implicit override path: the editable Final price input, the Revert-to-calculated button, and the override-related fields on `PricingSummaryValue`. Type changes will cause compile errors in `NewQuoteForm` and `EditQuoteForm` — those are fixed in Tasks 5 and 6.

There are no existing tests for PricingSummary, so TDD does not apply here. The change is a structural simplification. Existing behaviour for displaying calculated price, hours, mode buttons, and breakdown is preserved.

- [ ] **Step 1: Replace the component file**

Overwrite `src/app/portal/quotes/_components/PricingSummary.tsx` with:

```tsx
'use client'

import { useMemo } from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import {
  calculateQuotePrice,
  isPricingEligible,
  type PricingMode,
  type PricingBreakdown,
} from '@/lib/quote-pricing'
import type { QuoteBuilderState } from './QuoteBuilder'

export interface PricingSummaryValue {
  pricing_mode: PricingMode
}

export function emptyPricingSummaryValue(): PricingSummaryValue {
  return { pricing_mode: 'standard' }
}

function formatNZD(n: number): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
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

  const live = useMemo(() => {
    if (!eligible) return null
    return calculateQuotePrice(
      {
        service_category: builder.service_category || null,
        service_type_code: builder.service_type_code || null,
        bedrooms: builder.bedrooms ? parseInt(builder.bedrooms, 10) : null,
        bathrooms: builder.bathrooms ? parseInt(builder.bathrooms, 10) : null,
        condition_tags: builder.condition_tags,
        addons_wording: builder.addons_wording,
        frequency: builder.frequency || null,
        x_per_week: builder.x_per_week ? parseInt(builder.x_per_week, 10) : null,
      },
      value.pricing_mode,
    )
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [
    eligible,
    builder.service_category,
    builder.service_type_code,
    builder.bedrooms,
    builder.bathrooms,
    builder.condition_tags.join(','),
    builder.addons_wording.join(','),
    builder.frequency,
    builder.x_per_week,
    value.pricing_mode,
  ])
  /* eslint-enable react-hooks/exhaustive-deps */

  function setMode(next: PricingMode) {
    if (readOnly) return
    onChange({ pricing_mode: next })
  }

  if (!eligible) {
    return (
      <div className="text-sm text-sage-500 italic bg-sage-50 border border-sage-100 rounded-lg p-4">
        Select an eligible service to use guided pricing. Commercial and legacy services continue to use the manual Base price field below.
      </div>
    )
  }

  const fallback = live?.breakdown?.bed_count_fallback
  const clamped = live?.breakdown?.bed_count_clamped

  return (
    <div className={clsx('space-y-5 bg-sage-50/50 border border-sage-100 rounded-xl p-5', readOnly && 'opacity-70')}>
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

      {savedBreakdown && (
        <p className="text-[11px] text-sage-400 italic">Last saved price: {formatNZD(savedBreakdown.final_price)} ({savedBreakdown.pricing_mode}).</p>
      )}
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

- [ ] **Step 2: Verify existing engine tests still pass (engine itself is untouched)**

```bash
cd F:/Sano/01-Site && npx jest src/lib/__tests__/quote-pricing.test.ts
```

Expected: All existing engine tests pass — engine wasn't modified.

- [ ] **Step 3: Verify TypeScript compile errors are isolated to NewQuoteForm and EditQuoteForm**

```bash
cd F:/Sano/01-Site && npx tsc --noEmit 2>&1 | head -40
```

Expected: Errors will appear in `NewQuoteForm.tsx` and `EditQuoteForm.tsx` referring to `override_flag` / `override_price` no longer existing on `PricingSummaryValue`. These are fixed in Tasks 5 and 6. Do NOT commit yet.

- [ ] **Step 4: Stash changes (don't commit broken state)**

```bash
cd F:/Sano/01-Site && git stash push -m "wip: pricing-summary-display-only" -- src/app/portal/quotes/_components/PricingSummary.tsx
```

Task 5 will restore this stash and complete the changes together. The stash keeps the refactor isolated until the dependent forms are updated.

---

## Task 5: Wire OverridePanel into NewQuoteForm

**Files:**
- Modify: `src/app/portal/quotes/new/_components/NewQuoteForm.tsx`
- Create: `src/app/portal/quotes/new/_components/__tests__/final-price.test.ts`
- Create: `src/app/portal/quotes/new/_components/final-price.ts`

The form-level final price computation gets extracted to a pure function for testability. This task also pops the stash from Task 4 to merge the PricingSummary refactor with the form changes in a single coherent commit.

- [ ] **Step 1: Pop the PricingSummary stash from Task 4**

```bash
cd F:/Sano/01-Site && git stash pop
```

- [ ] **Step 2: Write failing tests for `computeFinalPrice`**

Create `src/app/portal/quotes/new/_components/__tests__/final-price.test.ts`:

```typescript
import { computeFinalPrice } from '../final-price'

describe('computeFinalPrice', () => {
  it('returns engine final_price when override is off', () => {
    const result = computeFinalPrice({
      is_price_overridden: false,
      override_price: '',
      engineFinalPrice: 320,
      manualBasePrice: 0,
    })
    expect(result).toBe(320)
  })

  it('returns override_price when override is on (ignores engine and discount)', () => {
    const result = computeFinalPrice({
      is_price_overridden: true,
      override_price: '275',
      engineFinalPrice: 320,
      manualBasePrice: 0,
    })
    expect(result).toBe(275)
  })

  it('returns manualBasePrice when engine is null and override is off', () => {
    const result = computeFinalPrice({
      is_price_overridden: false,
      override_price: '',
      engineFinalPrice: null,
      manualBasePrice: 450,
    })
    expect(result).toBe(450)
  })

  it('returns 0 when override on but override_price is invalid', () => {
    const result = computeFinalPrice({
      is_price_overridden: true,
      override_price: '',
      engineFinalPrice: 320,
      manualBasePrice: 0,
    })
    expect(result).toBe(0)
  })

  it('discount preservation: returns engine price unchanged when override toggled off after being on', () => {
    // Simulates the lifecycle: discount is applied separately by the form;
    // computeFinalPrice's job is just to pick override vs engine. The discount
    // arithmetic happens after and is unaffected by toggle history.
    const off = computeFinalPrice({ is_price_overridden: false, override_price: '275', engineFinalPrice: 320, manualBasePrice: 0 })
    expect(off).toBe(320)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd F:/Sano/01-Site && npx jest src/app/portal/quotes/new/_components/__tests__/final-price.test.ts
```

Expected: Module not found.

- [ ] **Step 4: Implement `computeFinalPrice`**

Create `src/app/portal/quotes/new/_components/final-price.ts`:

```typescript
interface ComputeInput {
  is_price_overridden: boolean
  override_price: string
  engineFinalPrice: number | null
  manualBasePrice: number
}

export function computeFinalPrice({ is_price_overridden, override_price, engineFinalPrice, manualBasePrice }: ComputeInput): number {
  if (is_price_overridden) {
    const n = parseFloat(override_price)
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  if (engineFinalPrice != null) return engineFinalPrice
  return manualBasePrice
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd F:/Sano/01-Site && npx jest src/app/portal/quotes/new/_components/__tests__/final-price.test.ts
```

Expected: All 5 tests pass.

- [ ] **Step 6: Modify NewQuoteForm — add override state, OverridePanel, banner, server payload**

Open `src/app/portal/quotes/new/_components/NewQuoteForm.tsx`. Make these changes:

**(a)** Add imports near the top of the file (alongside the existing `PricingSummary` import):

```tsx
import { OverridePanel, type OverridePanelValue } from '../../_components/OverridePanel'
import { validateOverride, type OverrideValidationErrors } from '../../_components/override-validation'
import { computeFinalPrice } from './final-price'
```

**(b)** Add new state next to the existing `pricing` state declaration:

```tsx
const [override, setOverride] = useState<OverridePanelValue>({
  is_price_overridden: false,
  override_price: '',
  override_reason: '',
  override_confirmed: false,
})
const [overrideErrors, setOverrideErrors] = useState<OverrideValidationErrors>({})
```

**(c)** Locate the `useMemo` that calls `calculateQuotePrice` (uses the `pricing` state). After it, add the form-level final price computation:

```tsx
const finalPrice = computeFinalPrice({
  is_price_overridden: override.is_price_overridden,
  override_price: override.override_price,
  engineFinalPrice: engineResult?.final_price ?? null,
  manualBasePrice: parseFloat(basePrice) || 0,
})
```

(If the form does not currently have a single `engineResult` variable derived from `calculateQuotePrice`, hoist that computation into the form so `engineResult` is available. Looking at the existing PricingSummary, the engine call lives inside the component — Step 6e moves it to the form via the props change.)

**(d)** Replace the Pricing section (currently around lines 354-386). Replace the entire `<Section title="Pricing">` block with:

```tsx
<Section title="Pricing">
  {/* Final-price banner — always visible */}
  <div className="mb-4 bg-white rounded-xl border border-sage-100 p-4 flex items-center justify-between">
    <div>
      <span className="block text-xs font-medium text-sage-500 uppercase tracking-wide">Final price</span>
      {override.is_price_overridden && (
        <span className="text-[11px] text-amber-700 font-medium">Manual override applied</span>
      )}
    </div>
    <span className="text-2xl font-bold text-sage-800">
      {new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(finalPrice)}
    </span>
  </div>

  {eligible ? (
    <PricingSummary
      builder={builder}
      value={pricing}
      onChange={setPricing}
      readOnly={override.is_price_overridden}
    />
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
    <Field
      label="Discount ($)"
      type="number"
      step="0.01"
      min="0"
      value={discount}
      onChange={setDiscount}
      disabled={override.is_price_overridden}
    />
    {override.is_price_overridden && (
      <p className="mt-1 text-xs text-sage-500 italic">Discount doesn't apply to overridden prices.</p>
    )}
  </div>

  <OverridePanel value={override} onChange={setOverride} errors={overrideErrors} />

  <label className="flex items-center gap-3 mt-4 cursor-pointer">
    <Toggle checked={gstIncluded} onChange={setGstIncluded} />
    <span className="text-sm font-medium text-sage-800">GST included</span>
  </label>

  <div className="mt-4">
    <span className="block text-sm font-semibold text-sage-800 mb-1.5">Payment type</span>
    <div className="flex gap-3">
      <button type="button" onClick={() => setPaymentType('cash_sale')} className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors', paymentType === 'cash_sale' ? 'bg-sage-500 text-white' : 'bg-sage-100 text-sage-600 hover:bg-sage-200')}>Cash Sale</button>
      <button type="button" onClick={() => setPaymentType('on_account')} className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors', paymentType === 'on_account' ? 'bg-sage-500 text-white' : 'bg-sage-100 text-sage-600 hover:bg-sage-200')}>On Account</button>
    </div>
  </div>
</Section>
```

The `Field` component must accept a `disabled` prop. If it does not currently, extend it:

```tsx
// In wherever Field is defined (search the codebase): add disabled?: boolean to the props
// and forward it onto the underlying <input>. Style: when disabled, add opacity-60 cursor-not-allowed.
```

**(e)** In the form's submit handler, add override validation to the existing validation block. Locate the imperative validation (around line 186-208) and add:

```tsx
const overrideValidation = validateOverride(override)
if (Object.keys(overrideValidation).length > 0) {
  setOverrideErrors(overrideValidation)
  return  // prevent submit
}
setOverrideErrors({})
```

**(f)** In the same submit handler, locate where `createQuote` is called. Update the payload to include the new fields. Replace the existing `base_price` field with:

```tsx
base_price: finalPrice,
calculated_price: engineResult?.calculated_price ?? null,
is_price_overridden: override.is_price_overridden,
override_price: override.is_price_overridden ? parseFloat(override.override_price) : null,
override_reason: override.is_price_overridden ? override.override_reason.trim() : null,
override_confirmed: override.is_price_overridden,
```

(Note: `override_confirmed_by` and `override_confirmed_at` are set by the server action, not the client.)

**(g)** Handle the ineligible-service case — when `eligible === false`, the design says the override toggle is "pre-checked and locked-on". Add this effect below the state declarations:

```tsx
useEffect(() => {
  if (!eligible && !override.is_price_overridden) {
    setOverride((prev) => ({ ...prev, is_price_overridden: true }))
  }
}, [eligible, override.is_price_overridden])
```

When ineligible, also pass `readOnly` to OverridePanel's toggle position — easiest is to wrap the toggle disabling logic. Update the OverridePanel render to:

```tsx
<OverridePanel
  value={override}
  onChange={(next) => {
    // For ineligible services, force is_price_overridden to stay true
    if (!eligible) next.is_price_overridden = true
    setOverride(next)
  }}
  errors={overrideErrors}
/>
```

- [ ] **Step 7: Run TypeScript compile + tests**

```bash
cd F:/Sano/01-Site && npx tsc --noEmit 2>&1 | head -40 && npx jest src/app/portal/quotes/new/_components/__tests__/final-price.test.ts src/app/portal/quotes/_components/__tests__/
```

Expected: TypeScript clean (apart from `EditQuoteForm.tsx` which is fixed in Task 6); all OverridePanel and final-price tests pass.

- [ ] **Step 8: Manual smoke test — start dev server**

```bash
cd F:/Sano/01-Site && npm run dev
```

Open the app at `http://localhost:3000/portal/quotes/new`, fill in a quote with an eligible service, verify:
- Final price banner shows engine price
- Toggle override on → reveals panel, banner shows "Manual override applied", discount greys out
- Type a custom price → banner updates
- Toggle override off → discount re-enables, banner shows engine price (override fields preserved in form state but not applied)
- Submit with override on but no reason → inline errors block submit

Stop the dev server with Ctrl-C.

- [ ] **Step 9: Commit**

```bash
git add src/app/portal/quotes/_components/PricingSummary.tsx src/app/portal/quotes/new/_components/NewQuoteForm.tsx src/app/portal/quotes/new/_components/final-price.ts src/app/portal/quotes/new/_components/__tests__/final-price.test.ts
git commit -m "feat(quotes): wire OverridePanel into NewQuoteForm; PricingSummary becomes display-only"
```

---

## Task 6: Wire OverridePanel into EditQuoteForm with hydration

**Files:**
- Modify: `src/app/portal/quotes/[id]/_components/EditQuoteForm.tsx`

EditQuoteForm currently hydrates `pricing.override_price` from `quote.base_price` when the saved row was overridden (lines 160-173). The new design hydrates from the new override columns instead. Lock behaviour inherits the existing `isLocked` flag (already used to set `readOnly` on PricingSummary, line 398).

- [ ] **Step 1: Modify EditQuoteForm**

Open `src/app/portal/quotes/[id]/_components/EditQuoteForm.tsx`. Apply the same pattern as Task 5 with edit-specific hydration:

**(a)** Add imports (alongside the existing PricingSummary import):

```tsx
import { OverridePanel, type OverridePanelValue } from '../../_components/OverridePanel'
import { validateOverride, type OverrideValidationErrors } from '../../_components/override-validation'
import { computeFinalPrice } from '../../new/_components/final-price'
```

**(b)** Add the saved-row interface fields. Locate the `quote:` parameter type and ensure it includes:

```tsx
is_price_overridden?: boolean
override_price?: number | null
override_reason?: string | null
override_confirmed?: boolean | null
override_confirmed_by?: string | null
override_confirmed_at?: string | null
calculated_price?: number | null
```

**(c)** Hydrate override state from the saved row (replace the special-case override hydration around lines 160-173):

```tsx
const [override, setOverride] = useState<OverridePanelValue>({
  is_price_overridden: quote.is_price_overridden ?? false,
  override_price: quote.override_price != null ? String(quote.override_price) : '',
  override_reason: quote.override_reason ?? '',
  override_confirmed: quote.override_confirmed ?? false,
})
const [overrideErrors, setOverrideErrors] = useState<OverrideValidationErrors>({})
```

Simplify the existing `pricing` state initialisation (which previously hydrated override_price from base_price) to just:

```tsx
const [pricing, setPricing] = useState<PricingSummaryValue>({
  pricing_mode: (quote.pricing_mode as PricingMode | null) ?? 'standard',
})
```

**(d)** Add the form-level final price computation after `engineResult` is computed:

```tsx
const finalPrice = computeFinalPrice({
  is_price_overridden: override.is_price_overridden,
  override_price: override.override_price,
  engineFinalPrice: engineResult?.final_price ?? quote.base_price ?? null,
  manualBasePrice: parseFloat(basePrice) || 0,
})
```

(Note: when locked, `engineResult` may be null because PricingSummary was passed `readOnly`. In that case fall back to `quote.base_price` so the banner still shows the saved price.)

**(e)** Replace the Pricing section (lines 390-433). Use the same JSX as Task 5 Step 6(d), but:

- Pass `readOnly={isLocked}` to `PricingSummary` and `OverridePanel`
- Pass `disabled={isLocked || override.is_price_overridden}` to the Discount Field

**(f)** In the submit handler, add the override validation block (same as Task 5 Step 6(e)):

```tsx
const overrideValidation = validateOverride(override)
if (Object.keys(overrideValidation).length > 0) {
  setOverrideErrors(overrideValidation)
  return
}
setOverrideErrors({})
```

**(g)** Update the `updateQuote` payload (around line 285 in the current file). Replace `base_price: base` and add the new fields:

```tsx
base_price: finalPrice,
calculated_price: engineResult?.calculated_price ?? quote.calculated_price ?? null,
is_price_overridden: override.is_price_overridden,
override_price: override.is_price_overridden ? parseFloat(override.override_price) : null,
override_reason: override.is_price_overridden ? override.override_reason.trim() : null,
override_confirmed: override.is_price_overridden,
```

When `isLocked`, send the persisted override fields back unchanged so a locked quote's payload doesn't try to mutate them:

```tsx
// Above the .insert/update payload:
const overridePayload = isLocked
  ? {
      is_price_overridden: quote.is_price_overridden ?? false,
      override_price: quote.override_price ?? null,
      override_reason: quote.override_reason ?? null,
      override_confirmed: quote.override_confirmed ?? false,
      calculated_price: quote.calculated_price ?? null,
    }
  : {
      is_price_overridden: override.is_price_overridden,
      override_price: override.is_price_overridden ? parseFloat(override.override_price) : null,
      override_reason: override.is_price_overridden ? override.override_reason.trim() : null,
      override_confirmed: override.is_price_overridden,
      calculated_price: engineResult?.calculated_price ?? quote.calculated_price ?? null,
    }
```

Then spread `...overridePayload` into the call to `updateQuote`.

**(h)** Ensure the page-level loader (`src/app/portal/quotes/[id]/page.tsx` — not modified here, but worth noting) selects the new columns. If the existing select uses `*`, no change needed. Otherwise add the seven new columns to the select string. Verify by grepping:

```bash
cd F:/Sano/01-Site && grep -n "from('quotes')" src/app/portal/quotes/[id]/page.tsx
```

If that select lists columns explicitly, add: `is_price_overridden, override_price, override_reason, override_confirmed, override_confirmed_by, override_confirmed_at, calculated_price`.

- [ ] **Step 2: TypeScript compile**

```bash
cd F:/Sano/01-Site && npx tsc --noEmit
```

Expected: Clean compile.

- [ ] **Step 3: Run all existing tests**

```bash
cd F:/Sano/01-Site && npx jest
```

Expected: All tests pass.

- [ ] **Step 4: Manual smoke test — edit a quote**

Start dev server, navigate to an existing quote's edit page, verify:
- Final-price banner shows the saved price
- If the saved row was overridden (use a quote you override in Task 5 smoke test or via DB), override panel hydrates with saved values
- Toggling override off and saving persists `is_price_overridden = false` (other fields retained per design)
- Sending the quote (status → sent) locks the override panel (everything disabled)

- [ ] **Step 5: Commit**

```bash
git add src/app/portal/quotes/[id]/_components/EditQuoteForm.tsx
git commit -m "feat(quotes): wire OverridePanel into EditQuoteForm with hydration"
```

---

## Task 7: Update createQuote server action with override fields and validation

**Files:**
- Modify: `src/app/portal/quotes/new/_actions.ts`
- Create: `src/app/portal/quotes/new/__tests__/_actions-validation.test.ts`

Server-side validation closes the trust gap (the existing actions trust the client). We extract the validation into a pure function that wraps `validateOverride` with the action's input shape, then test it.

- [ ] **Step 1: Write failing tests**

Create `src/app/portal/quotes/new/__tests__/_actions-validation.test.ts`:

```typescript
import { validateCreateQuoteOverride, type CreateQuoteOverridePayload } from '../_actions-validation'

function base(): CreateQuoteOverridePayload {
  return {
    is_price_overridden: false,
    override_price: null,
    override_reason: null,
    override_confirmed: false,
  }
}

describe('validateCreateQuoteOverride', () => {
  it('passes when override is off', () => {
    expect(validateCreateQuoteOverride(base())).toBeNull()
  })

  it('rejects override on with null price', () => {
    expect(validateCreateQuoteOverride({ ...base(), is_price_overridden: true, override_reason: 'x', override_confirmed: true }))
      .toMatch(/price/i)
  })

  it('rejects override on with non-positive price', () => {
    expect(validateCreateQuoteOverride({ ...base(), is_price_overridden: true, override_price: 0, override_reason: 'x', override_confirmed: true }))
      .toMatch(/price/i)
  })

  it('rejects override on with empty reason', () => {
    expect(validateCreateQuoteOverride({ ...base(), is_price_overridden: true, override_price: 100, override_reason: '   ', override_confirmed: true }))
      .toMatch(/reason/i)
  })

  it('rejects override on without confirmation', () => {
    expect(validateCreateQuoteOverride({ ...base(), is_price_overridden: true, override_price: 100, override_reason: 'x', override_confirmed: false }))
      .toMatch(/confirm/i)
  })

  it('passes when all override fields are valid', () => {
    expect(validateCreateQuoteOverride({ is_price_overridden: true, override_price: 250, override_reason: 'Customer negotiated', override_confirmed: true })).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd F:/Sano/01-Site && npx jest src/app/portal/quotes/new/__tests__/_actions-validation.test.ts
```

Expected: Module not found.

- [ ] **Step 3: Create the validation module**

Create `src/app/portal/quotes/new/_actions-validation.ts`:

```typescript
export interface CreateQuoteOverridePayload {
  is_price_overridden: boolean
  override_price: number | null
  override_reason: string | null
  override_confirmed: boolean
}

/**
 * Returns an error string, or null if valid.
 * Server-side mirror of client-side validateOverride. Defence in depth —
 * accountability data shouldn't be trustable from the client alone.
 */
export function validateCreateQuoteOverride(p: CreateQuoteOverridePayload): string | null {
  if (!p.is_price_overridden) return null

  if (p.override_price == null || !Number.isFinite(p.override_price) || p.override_price <= 0) {
    return 'Override price must be greater than 0.'
  }
  if (!p.override_reason || !p.override_reason.trim()) {
    return 'Override reason is required.'
  }
  if (!p.override_confirmed) {
    return 'Override confirmation is required.'
  }
  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd F:/Sano/01-Site && npx jest src/app/portal/quotes/new/__tests__/_actions-validation.test.ts
```

Expected: All 6 tests pass.

- [ ] **Step 5: Modify createQuote action to accept and persist new fields**

Open `src/app/portal/quotes/new/_actions.ts`. Apply these changes:

**(a)** Add to imports at the top:

```typescript
import { validateCreateQuoteOverride } from './_actions-validation'
```

**(b)** Extend the `CreateQuoteInput` interface — add at the end of the existing interface (before the closing `}`):

```typescript
  // Manual price override
  is_price_overridden?: boolean
  override_price?: number | null
  override_reason?: string | null
  override_confirmed?: boolean
  calculated_price?: number | null
```

**(c)** Inside `createQuote`, immediately after the `const supabase = createClient()` line, add:

```typescript
const overrideErr = validateCreateQuoteOverride({
  is_price_overridden: input.is_price_overridden ?? false,
  override_price: input.override_price ?? null,
  override_reason: input.override_reason ?? null,
  override_confirmed: input.override_confirmed ?? false,
})
if (overrideErr) return { error: overrideErr }
```

**(d)** Get the current user (for audit fields):

```typescript
const { data: { user } } = await supabase.auth.getUser()
const overrideConfirmedBy = input.is_price_overridden && user ? user.id : null
const overrideConfirmedAt = input.is_price_overridden ? new Date().toISOString() : null
```

**(e)** Add the seven override columns to the `.insert(...)` payload (inside the `.insert({ ... })` call alongside existing fields):

```typescript
is_price_overridden: input.is_price_overridden ?? false,
override_price: input.override_price ?? null,
override_reason: input.override_reason ?? null,
override_confirmed: input.override_confirmed ?? false,
override_confirmed_by: overrideConfirmedBy,
override_confirmed_at: overrideConfirmedAt,
calculated_price: input.calculated_price ?? null,
```

- [ ] **Step 6: Run all tests**

```bash
cd F:/Sano/01-Site && npx jest
```

Expected: All tests pass; no regressions.

- [ ] **Step 7: TypeScript compile**

```bash
cd F:/Sano/01-Site && npx tsc --noEmit
```

Expected: Clean.

- [ ] **Step 8: Commit**

```bash
git add src/app/portal/quotes/new/_actions.ts src/app/portal/quotes/new/_actions-validation.ts src/app/portal/quotes/new/__tests__/_actions-validation.test.ts
git commit -m "feat(quotes): persist and server-validate override fields in createQuote"
```

---

## Task 8: Update updateQuote server action with override fields and validation

**Files:**
- Modify: `src/app/portal/quotes/[id]/_actions.ts`

The validation module from Task 7 is reused. Apply the same pattern.

- [ ] **Step 1: Modify updateQuote**

Open `src/app/portal/quotes/[id]/_actions.ts`. Apply these changes:

**(a)** Add to imports:

```typescript
import { validateCreateQuoteOverride } from '../new/_actions-validation'
```

**(b)** Extend `UpdateQuoteInput` interface (add at the end before the closing `}`):

```typescript
  // Manual price override
  is_price_overridden?: boolean
  override_price?: number | null
  override_reason?: string | null
  override_confirmed?: boolean
  calculated_price?: number | null
```

**(c)** Inside `updateQuote`, after `const supabase = createClient()`, add:

```typescript
const overrideErr = validateCreateQuoteOverride({
  is_price_overridden: input.is_price_overridden ?? false,
  override_price: input.override_price ?? null,
  override_reason: input.override_reason ?? null,
  override_confirmed: input.override_confirmed ?? false,
})
if (overrideErr) return { error: overrideErr }

// Load existing override audit fields so we can preserve them when the
// override is unchanged (or update them when it transitions on).
const { data: existing } = await supabase
  .from('quotes')
  .select('is_price_overridden, override_confirmed_by, override_confirmed_at')
  .eq('id', input.id)
  .single()

const wasOverridden = existing?.is_price_overridden ?? false
const isOverridden = input.is_price_overridden ?? false
const { data: { user } } = await supabase.auth.getUser()

let overrideConfirmedBy: string | null = existing?.override_confirmed_by ?? null
let overrideConfirmedAt: string | null = existing?.override_confirmed_at ?? null

if (isOverridden && !wasOverridden) {
  // Newly overridden — set audit stamps.
  overrideConfirmedBy = user?.id ?? null
  overrideConfirmedAt = new Date().toISOString()
} else if (!isOverridden) {
  // Override turned off — preserve audit stamps as-is per design (no reset-on-save).
  // Stamps retain their last value; consumers must check is_price_overridden.
}
```

**(d)** Add the seven override columns to the `.update({ ... })` payload:

```typescript
is_price_overridden: input.is_price_overridden ?? false,
override_price: input.override_price ?? null,
override_reason: input.override_reason ?? null,
override_confirmed: input.override_confirmed ?? false,
override_confirmed_by: overrideConfirmedBy,
override_confirmed_at: overrideConfirmedAt,
calculated_price: input.calculated_price ?? null,
```

- [ ] **Step 2: Run all tests**

```bash
cd F:/Sano/01-Site && npx jest
```

Expected: All tests pass.

- [ ] **Step 3: TypeScript compile**

```bash
cd F:/Sano/01-Site && npx tsc --noEmit
```

Expected: Clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/portal/quotes/[id]/_actions.ts
git commit -m "feat(quotes): persist and server-validate override fields in updateQuote"
```

---

## Task 9: Snapshot override fields onto invoice in convertToInvoice

**Files:**
- Modify: `src/app/portal/quotes/[id]/_actions-invoice.ts`

The select must pull the seven override columns from the quote; the insert must write them to the invoice as a snapshot.

- [ ] **Step 1: Modify convertToInvoice**

Open `src/app/portal/quotes/[id]/_actions-invoice.ts`. Make these changes:

**(a)** Extend the SELECT (around line 12-17). Add the seven override columns:

```typescript
const { data: quote, error: qErr } = await supabase
  .from('quotes')
  .select(`
    client_id, property_category, type_of_clean, service_type,
    frequency, scope_size, service_address, notes,
    base_price, discount, gst_included, payment_type,
    scheduled_clean_date, date_issued,
    is_price_overridden, override_price, override_reason, override_confirmed,
    override_confirmed_by, override_confirmed_at, calculated_price
  `)
  .eq('id', quoteId)
  .single()
```

**(b)** Extend the INSERT payload (around line 50-67). Add the seven columns to the invoice insert:

```typescript
const { data: invoice, error: iErr } = await supabase
  .from('invoices')
  .insert({
    quote_id: quoteId,
    client_id: quote.client_id,
    property_category: quote.property_category,
    type_of_clean: quote.type_of_clean,
    service_type: quote.service_type,
    frequency: quote.frequency,
    scope_size: quote.scope_size,
    service_address: quote.service_address,
    notes: quote.notes,
    base_price: quote.base_price,
    discount: quote.discount,
    gst_included: quote.gst_included,
    payment_type: quote.payment_type,
    scheduled_clean_date: quote.scheduled_clean_date,
    date_issued: dateIssued,
    due_date: dueDate,
    // Audit snapshot of pricing override at time of conversion
    is_price_overridden: quote.is_price_overridden ?? false,
    override_price: quote.override_price ?? null,
    override_reason: quote.override_reason ?? null,
    override_confirmed: quote.override_confirmed ?? false,
    override_confirmed_by: quote.override_confirmed_by ?? null,
    override_confirmed_at: quote.override_confirmed_at ?? null,
    calculated_price: quote.calculated_price ?? null,
  })
  .select('id')
  .single()
```

- [ ] **Step 2: Run all tests**

```bash
cd F:/Sano/01-Site && npx jest
```

Expected: All tests pass.

- [ ] **Step 3: TypeScript compile**

```bash
cd F:/Sano/01-Site && npx tsc --noEmit
```

Expected: Clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/portal/quotes/[id]/_actions-invoice.ts
git commit -m "feat(invoices): snapshot price override fields from quote at conversion"
```

---

## Task 10: Render override audit block on invoice detail page

**Files:**
- Modify: `src/app/portal/invoices/[id]/page.tsx`

When `is_price_overridden === true` on the invoice, render an audit block beneath the existing pricing section showing original calculated price, final invoiced price, reason, and confirmation metadata.

- [ ] **Step 1: Verify the page selects the override columns**

```bash
cd F:/Sano/01-Site && grep -n "from('invoices')" src/app/portal/invoices/[id]/page.tsx
```

If the select lists columns explicitly (rather than `*`), extend it to include: `is_price_overridden, override_price, override_reason, override_confirmed, override_confirmed_by, override_confirmed_at, calculated_price`.

For the user display name (the `override_confirmed_by` UUID), the page may need a join to a profile/user table. If no such table exists, display the UUID (truncated to first 8 chars) as a fallback. Search the codebase for how user names are displayed elsewhere:

```bash
grep -rn "auth.users\|profiles" src/app/portal --include="*.tsx" | head -10
```

If an existing pattern is found (e.g. join to a `profiles` table), follow it. Otherwise display the raw UUID with a TODO comment to revisit when a profile table is introduced.

**(b)** Modify the file: locate the Pricing `<Section>` (around lines 184-210). Immediately after that section's closing `</Section>` and before the Notes section, add:

```tsx
{invoice.is_price_overridden && (
  <Section title="Manual override applied">
    <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 space-y-2">
      <p className="text-sm text-amber-800 font-medium">
        This invoice was created with a manual price override.
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {invoice.calculated_price != null && (
          <div>
            <dt className="text-sage-500">Original calculated price</dt>
            <dd className="text-sage-800">{fmt(invoice.calculated_price)}</dd>
          </div>
        )}
        <div>
          <dt className="text-sage-500">Final invoiced price</dt>
          <dd className="text-sage-800 font-semibold">{fmt(invoice.override_price ?? invoice.base_price ?? 0)}</dd>
        </div>
        {invoice.override_reason && (
          <div className="sm:col-span-2">
            <dt className="text-sage-500">Reason</dt>
            <dd className="text-sage-800 whitespace-pre-wrap">{invoice.override_reason}</dd>
          </div>
        )}
        {invoice.override_confirmed_at && (
          <div className="sm:col-span-2">
            <dt className="text-sage-500">Confirmed</dt>
            <dd className="text-sage-800">
              {invoice.override_confirmed_by ? `By user ${invoice.override_confirmed_by.slice(0, 8)}…` : 'By unknown user'}
              {' on '}
              {new Date(invoice.override_confirmed_at).toLocaleString('en-NZ')}
            </dd>
          </div>
        )}
      </dl>
    </div>
  </Section>
)}
```

- [ ] **Step 2: TypeScript compile**

```bash
cd F:/Sano/01-Site && npx tsc --noEmit
```

Expected: Clean.

- [ ] **Step 3: Manual verification**

Start dev server and view an overridden invoice (created via Task 5 smoke test followed by `convertToInvoice`). Verify the audit block renders correctly with all four pieces of data.

- [ ] **Step 4: Commit**

```bash
git add src/app/portal/invoices/[id]/page.tsx
git commit -m "feat(invoices): render manual override audit block on detail page"
```

---

## Task 11: Schema deployment + end-to-end manual test

**Files:** None modified — manual coordination.

This task gates the feature for production use. Schema must be live before the new code can persist override fields without errors.

- [ ] **Step 1: Mike runs the SQL in the Supabase dashboard**

**Pre-run check:** open the Supabase table editor and check whether `quotes` or `invoices` already contains any of the seven new columns (`is_price_overridden`, `override_price`, `override_reason`, `override_confirmed`, `override_confirmed_by`, `override_confirmed_at`, `calculated_price`). The SQL uses `IF NOT EXISTS`, which silently succeeds if columns are already present — so a botched previous run could leave wrong column types in place and the script would still report success.

If any of the seven already exist, **inspect their type and default first** rather than dropping blindly. Compare against the spec:

| Column | Expected type | Default | Nullable |
|---|---|---|---|
| `is_price_overridden` | `boolean` | `false` | NOT NULL |
| `override_price` | `decimal(10,2)` (shown as `numeric(10,2)`) | NULL | YES |
| `override_reason` | `text` | NULL | YES |
| `override_confirmed` | `boolean` | `false` | NOT NULL |
| `override_confirmed_by` | `uuid` (FK → `auth.users`) | NULL | YES |
| `override_confirmed_at` | `timestamptz` | NULL | YES |
| `calculated_price` | `decimal(10,2)` | NULL | YES |

If the existing column matches → leave it; the script's `IF NOT EXISTS` will skip it correctly. If it doesn't match → `DROP COLUMN` it first, then run the script.

Then open the Supabase project's SQL editor, paste the contents of [docs/db/2026-04-20-add-price-override.sql](../../db/2026-04-20-add-price-override.sql), and execute. Verify:

```sql
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_name IN ('quotes', 'invoices')
   AND column_name IN (
     'is_price_overridden', 'override_price', 'override_reason',
     'override_confirmed', 'override_confirmed_by', 'override_confirmed_at',
     'calculated_price'
   )
 ORDER BY table_name, column_name;
```

Expected: 14 rows returned (7 columns × 2 tables), all matching the SQL file's definitions.

- [ ] **Step 2: End-to-end test — create overridden quote**

Start the dev server. As an authenticated portal user:

1. Navigate to `/portal/quotes/new`
2. Fill in client + service details for an eligible service (e.g. residential standard clean, 3-bed, 2-bath)
3. Confirm calculated price displays in the banner (e.g. $X)
4. Tick "Override price manually"
5. Enter a custom price (e.g. $X − $50)
6. Enter a reason (e.g. "Repeat customer discount")
7. Tick the confirmation checkbox
8. Submit

Expected: Quote saves; redirects to detail page; saved record has `is_price_overridden = true`, `override_price = $X − $50`, `override_reason = "Repeat customer discount"`, `override_confirmed = true`, `override_confirmed_by = your user id`, `override_confirmed_at` ≈ now, `calculated_price = $X`, `base_price = $X − $50`.

Verify in DB:

```sql
SELECT id, base_price, calculated_price, is_price_overridden, override_price, override_reason, override_confirmed, override_confirmed_by, override_confirmed_at
  FROM quotes
 ORDER BY created_at DESC
 LIMIT 1;
```

- [ ] **Step 3: End-to-end test — convert to invoice and verify snapshot**

From the same quote detail page, click "Convert to Invoice". On the invoice detail page, verify the audit block displays. In the DB:

```sql
SELECT id, base_price, calculated_price, is_price_overridden, override_price, override_reason, override_confirmed, override_confirmed_by, override_confirmed_at
  FROM invoices
 ORDER BY created_at DESC
 LIMIT 1;
```

Expected: All seven override columns match the source quote.

- [ ] **Step 4: End-to-end test — discount preservation cycle**

Open a new quote form. Enter a discount of $50. Toggle override on, type custom price $200. Toggle override off. Verify:
- Discount field is re-enabled
- Discount field still shows "$50"
- Final price banner reverts to engine price minus $50 discount (or to engine price + manual base price if ineligible)

This is the behavioural test from the design spec, manually executed.

- [ ] **Step 5: End-to-end test — locked quote**

Edit the quote from Step 2. "Send" it (so status becomes `sent`). Re-open in edit mode. Verify:
- PricingSummary is visibly muted/read-only
- Override toggle is disabled
- Custom price, reason, confirmation are all disabled
- Discount is disabled
- Save still works (no-op for locked fields)

- [ ] **Step 6: Final commit + push**

```bash
cd F:/Sano/01-Site && git log --oneline -10
```

Verify the commit history shows the full feature trail. If everything is green:

```bash
git push origin main
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Task |
|---|---|
| Single override path (decision 1) | Task 4 (PricingSummary refactor) |
| Discount bypassed when override on (decision 2) | Tasks 5, 6 (Discount disabled) + Task 11 Step 4 (test) |
| Lock inherits existing pricing lock (decision 3) | Task 6 Step 1(e) |
| Invoice receives audit snapshot (decision 4) | Task 9 |
| Final price banner at top (decision 5) | Tasks 5, 6 (banner JSX) |
| PricingSummary visible but muted (decision 6) | Task 4 (`opacity-70` when readOnly) |
| Override universal incl. ineligible (decision 7) | Task 5 Step 6(g) (effect to force on) |
| Audit fields by/at (decision 8) | Tasks 1, 7, 8, 9 |
| Toggle off doesn't clear inputs (decision 9) | Task 3 (no clearing in OverridePanel) |
| Schema 7 columns × 2 tables | Task 1 |
| Validation imperative client-side | Tasks 2, 3 |
| Server-side validation | Tasks 7, 8 |
| OverridePanel tests | Task 3 |
| Form-level final_price tests | Task 5 |
| Discount preservation test | Task 11 Step 4 (manual e2e) |
| Conversion snapshot test | Task 9 manual; Task 11 Step 3 |
| Lock inheritance test | Task 11 Step 5 |
| Invoice audit display | Task 10 |

**Placeholder check:** No "TBD", "TODO", "fill in" markers. Each step has actual code or commands.

**Type consistency check:**
- `OverridePanelValue` defined in Task 3, consumed by name in Tasks 5 and 6 ✓
- `OverrideValidationErrors` defined in Task 2, consumed in Tasks 3, 5, 6 ✓
- `validateOverride` defined in Task 2, called in Tasks 5 and 6 submit handlers ✓
- `validateCreateQuoteOverride` defined in Task 7, reused in Task 8 ✓
- `computeFinalPrice` defined in Task 5, reused in Task 6 ✓
- The seven schema columns named identically in Tasks 1, 7, 8, 9, 10 ✓

**Known minor risk:** The `isLocked` flag is referenced in Task 6 as an existing variable in EditQuoteForm — confirmed by grep on line 286 (`isLocked` in `pricing_mode: isLocked ?` ternary). The plan assumes the engineer can reuse that flag rather than re-deriving the lock condition. This is a safe assumption since the existing PricingSummary already uses it.
