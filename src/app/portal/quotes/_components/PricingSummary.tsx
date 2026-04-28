'use client'

import { useMemo } from 'react'
import clsx from 'clsx'
import { ChevronDown, AlertCircle } from 'lucide-react'
import {
  calculateQuotePrice,
  isPricingEligible,
  type PricingMode,
  type PricingBreakdown,
} from '@/lib/quote-pricing'
import type { ResidentialPricingSettings } from '@/lib/residentialPricingSettings'
import type { QuoteBuilderState } from './QuoteBuilder'

export interface PricingSummaryValue {
  pricing_mode: PricingMode
}

/** Final-price view from the parent (price + hours + active flag).
 *  Lets PricingSummary render a Calculated/Final pair without owning
 *  override state. */
export interface PricingFinalView {
  isOverride: boolean
  finalPrice: number | null
  finalHours: number | null
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
  finalView,
  settings,
}: {
  builder: QuoteBuilderState
  value: PricingSummaryValue
  onChange: (next: PricingSummaryValue) => void
  savedBreakdown?: PricingBreakdown | null
  readOnly?: boolean
  expandedByDefault?: boolean
  /** Final-price view from the parent — shown alongside Calculated. */
  finalView?: PricingFinalView | null
  /** Residential pricing settings (jsonb singleton). When provided,
   *  the live calculation uses these values; otherwise the engine's
   *  code-defined defaults are used. */
  settings?: ResidentialPricingSettings
}) {
  const eligible = isPricingEligible(
    builder.service_category || null,
    builder.service_type_code || null,
    settings,
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
      undefined,
      settings,
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

      {/* Phase residential-pricing-engine: Calculated · Final pair.
          Calculated = engine output before override.
          Final      = override value when an admin override is active,
                       otherwise equal to Calculated. */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="block text-xs font-medium text-sage-500 uppercase tracking-wide mb-1">Calculated</span>
            <span className="text-lg font-semibold text-sage-800">
              {live?.estimated_hours ?? '—'} hrs · {live?.calculated_price != null ? formatNZD(live.calculated_price) : '—'}
            </span>
          </div>
          <div>
            <span className="block text-xs font-medium text-sage-500 uppercase tracking-wide mb-1">Final</span>
            <span className={clsx(
              'text-lg font-semibold',
              finalView?.isOverride ? 'text-amber-800' : 'text-sage-800',
            )}>
              {(finalView?.finalHours ?? live?.estimated_hours) ?? '—'} hrs · {' '}
              {(finalView?.finalPrice ?? live?.calculated_price) != null
                ? formatNZD((finalView?.finalPrice ?? live?.calculated_price) as number)
                : '—'}
            </span>
          </div>
        </div>
        {finalView?.isOverride && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
            <AlertCircle size={12} />
            Adjusted from calculated estimate
          </div>
        )}
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
