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
