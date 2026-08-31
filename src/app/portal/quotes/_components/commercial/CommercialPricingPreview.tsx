'use client'

// Commercial pricing preview — read-only computed summary that renders
// from the current commercial details + scope form state. Computes via
// the pure computeCommercialPreview() function in src/lib/commercialQuote.ts.
//
// Provides a convenience "Apply to base price" button so the operator
// can copy the estimated sell price into the quote's base_price without
// any forced overwrite.

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  computeCommercialPreview,
  MARGIN_TIERS,
  DEFAULT_LABOUR_COST_BASIS,
  type CommercialPreviewScopeRow,
  type ScopeFrequency,
} from '@/lib/commercialQuote'
import type { PricingSettings } from '@/lib/pricingSettings'
import type { CommercialDetailsFormState } from './CommercialDetailsSection'
import type { CommercialScopeFormRow } from './CommercialScopeBuilder'

function nzd(n: number): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

function hrs(n: number): string {
  return `${n.toFixed(1)} hrs`
}

function pctRange(min: number, max: number): string {
  return `${Math.round(min * 100)}–${Math.round(max * 100)}%`
}

export function CommercialPricingPreview({
  details,
  scope,
  onApplyToBasePrice,
  disabled = false,
  pricingSettings,
}: {
  details: CommercialDetailsFormState
  scope: readonly CommercialScopeFormRow[]
  onApplyToBasePrice?: (price: number) => void
  disabled?: boolean
  /** Phase 3B.1: DB-backed pricing knobs. When omitted the engine
   *  falls back to the in-code constants — behaviour matches pre-3B. */
  pricingSettings?: PricingSettings
}) {
  // What a contractor hour actually costs, ex GST. Local to this preview and
  // deliberately NOT persisted: it is a quoting aid for the operator, not part
  // of the quote the client receives, and keeping it out of the schema avoids
  // a migration for what is a sanity check. Type it in, see the real floor,
  // decide the price.
  const [contractorCost, setContractorCost] = useState('')

  const preview = useMemo(() => {
    const scopeRows: CommercialPreviewScopeRow[] = scope.map((r) => ({
      included: r.included,
      frequency: (r.frequency || null) as ScopeFrequency | null,
      quantity_value: parseNumber(r.quantity_value),
      unit_minutes: parseNumber(r.unit_minutes),
      production_rate: parseNumber(r.production_rate),
      input_mode: r.input_mode,
    }))
    return computeCommercialPreview(
      {
        sector_category: details.sector_category || null,
        traffic_level: details.traffic_level || null,
        selected_margin_tier: details.selected_margin_tier || null,
        labour_cost_basis: parseNumber(details.labour_cost_basis),
        service_days: details.service_days.length > 0 ? details.service_days : null,
        contractor_hourly_cost: parseNumber(contractorCost),
      },
      scopeRows,
      pricingSettings,
    )
  }, [
    details.sector_category,
    details.traffic_level,
    details.selected_margin_tier,
    details.labour_cost_basis,
    details.service_days,
    contractorCost,
    scope,
    pricingSettings,
  ])

  const hasSellPrice = preview.estimated_monthly_sell_price > 0
  const tier = preview.margin_tier
  const tierSpec = tier ? MARGIN_TIERS[tier] : null

  return (
    <section className="rounded-lg border border-sage-100 bg-white p-4">
      <div className="flex items-baseline gap-3 mb-4">
        <h3 className="text-sm font-semibold text-sage-800 uppercase tracking-wide">
          Pricing preview
        </h3>
        <span className="text-xs text-sage-500">
          Computed from commercial details + scope. Operator decides final price.
        </span>
      </div>

      {preview.warnings.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {preview.warnings.map((w, i) => (
            <div key={i} className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-3 py-1.5">
              {w}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Hours column */}
        <div>
          <div className="text-xs uppercase tracking-wide text-sage-500 mb-1">Hours</div>
          <dl className="space-y-1.5 text-sm">
            <Row label="Per visit"       value={hrs(preview.estimated_service_hours)} />
            <Row label="Weekly"          value={hrs(preview.estimated_weekly_hours)} />
            <Row label="Monthly"         value={hrs(preview.estimated_monthly_hours)} strong />
            <Row label="Visits per week" value={String(preview.visits_per_week)} muted />
          </dl>
          <div className="mt-2 text-[11px] text-sage-500">
            Multipliers: sector ×{preview.sector_multiplier.toFixed(2)}, traffic ×{preview.traffic_multiplier.toFixed(2)}
          </div>
        </div>

        {/* Cost + sell column */}
        <div className="rounded-lg bg-sage-50 border border-sage-100 p-3">
          <div className="text-xs uppercase tracking-wide text-sage-500 mb-1">Labour + sell</div>
          <dl className="space-y-1.5 text-sm">
            <Row label="Labour cost basis" value={`${nzd(preview.labour_cost_basis)} / hr${preview.labour_cost_basis === DEFAULT_LABOUR_COST_BASIS && !details.labour_cost_basis ? ' (default)' : ''}`} muted />
            <Row label="Monthly labour cost" value={nzd(preview.estimated_monthly_cost)} />
            <Row
              label="Margin tier"
              value={
                tierSpec ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span>{tierSpec.label}</span>
                    <span className="text-[10px] text-sage-500">
                      {pctRange(tierSpec.min, tierSpec.max)} · using {Math.round(tierSpec.default * 100)}% midpoint
                    </span>
                  </span>
                ) : (
                  <span className="text-sage-500">—</span>
                )
              }
            />
            <Row
              label="Est. monthly sell price"
              value={hasSellPrice ? nzd(preview.estimated_monthly_sell_price) : '—'}
              strong
            />
            <Row
              label="Est. weekly sell price"
              value={hasSellPrice ? nzd(preview.estimated_weekly_sell_price) : '—'}
              muted
            />
            <Row
              label="Est. per-visit sell price"
              value={hasSellPrice ? nzd(preview.estimated_per_visit_sell_price) : '—'}
              muted
            />
          </dl>
        </div>
      </div>

      {/* True margin over real contractor cost.
          The sell price above is built from the loaded labour basis, which
          includes on-costs, supervision, equipment and overhead. That is the
          right basis for pricing but it hides the actual floor. On a lean
          tender the question that decides go/no-go is "what is left after I
          pay the person doing the work", so it is computed here rather than
          on a calculator. */}
      <div className="mt-5 pt-4 border-t border-sage-100">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="block text-xs uppercase tracking-wide text-sage-500 mb-1">
              Contractor cost ($/hr, ex GST)
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={contractorCost}
              onChange={(e) => setContractorCost(e.target.value)}
              disabled={disabled}
              placeholder="e.g. 28.00"
              className="w-40 rounded-md border border-sage-200 px-3 py-2 text-sm focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500 disabled:bg-sage-50"
            />
          </label>
          <p className="text-[11px] text-sage-500 max-w-xs leading-relaxed">
            What you actually pay per hour, GST excluded. Used only to show the
            margin below — not saved to the quote.
          </p>
        </div>

        {preview.true_margin_pct != null && hasSellPrice && (
          <dl
            className={clsx(
              'mt-4 rounded-lg border p-3 space-y-1.5 text-sm',
              preview.true_margin_pct < 0.30
                ? 'bg-amber-50 border-amber-200'
                : 'bg-sage-50 border-sage-100',
            )}
          >
            <Row label="Weekly sell price"   value={nzd(preview.estimated_weekly_sell_price)} muted />
            <Row label="Weekly contractor cost" value={nzd(preview.contractor_weekly_cost ?? 0)} muted />
            <Row
              label="True weekly margin"
              value={`${nzd(preview.true_weekly_margin ?? 0)} (${Math.round(preview.true_margin_pct * 100)}%)`}
              strong
            />
          </dl>
        )}
      </div>

      {onApplyToBasePrice && hasSellPrice && !disabled && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => onApplyToBasePrice(Math.round(preview.estimated_monthly_sell_price * 100) / 100)}
            className="inline-flex items-center gap-2 text-sm font-medium bg-sage-600 text-white hover:bg-sage-700 rounded-lg px-3 py-1.5 transition-colors"
          >
            Apply to base price
            <span className="text-xs text-sage-100 font-normal">
              ({nzd(preview.estimated_monthly_sell_price)})
            </span>
          </button>
        </div>
      )}
    </section>
  )
}

function Row({
  label, value, strong, muted,
}: {
  label: string
  value: React.ReactNode
  strong?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className={clsx(muted ? 'text-sage-500' : 'text-sage-600')}>{label}</dt>
      <dd className={clsx(strong && 'font-semibold text-sage-800')}>{value}</dd>
    </div>
  )
}

function parseNumber(s: string | null | undefined): number | null {
  if (s == null || String(s).trim() === '') return null
  const n = parseFloat(String(s))
  return Number.isFinite(n) ? n : null
}
