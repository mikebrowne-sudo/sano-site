// Pricing Settings — Phase 3A
//
// Admin-editable pricing knobs, sourced from the four Phase-3A tables:
//   - pricing_global_settings
//   - pricing_margin_tiers
//   - pricing_sector_multipliers
//   - pricing_traffic_multipliers
//
// This module is the single seam through which computeCommercialPreview
// (and, later, the admin settings UI) reads those knobs. The design
// rule is: never throw, never require the DB. If any read fails or any
// key is missing, fall back to the in-code constants in commercialQuote.ts
// — which means the pricing engine keeps working even when:
//   - the Phase-3A migration hasn't run yet (pre-migration),
//   - the tables are empty (operator deleted rows),
//   - the Supabase client doesn't have read access,
//   - any single row has a malformed value.
//
// The fallback also means Phase-3A can ship with zero behaviour change
// to existing quote previews: seed rows match the constants exactly.
//
// Pure type + async loader. No Supabase / Next.js / React imports beyond
// the Supabase types so server and client callers can both use this
// file if they ever need to.

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  MARGIN_TIERS,
  SECTOR_MULTIPLIER,
  TRAFFIC_MULTIPLIER,
  WEEKS_PER_MONTH,
  DEFAULT_LABOUR_COST_BASIS,
  isMarginTier,
  isSectorCategory,
  type MarginTier,
  type MarginTierSpec,
  type SectorCategory,
  type TrafficLevel,
} from './commercialQuote'

// ── Shape ───────────────────────────────────────────────────────────
// Mirrors the hardcoded constants in commercialQuote.ts so
// computeCommercialPreview can drop this object in without shape
// conversion.

export interface PricingSettings {
  marginTiers:            Record<MarginTier, MarginTierSpec>
  sectorMultipliers:      Record<SectorCategory, number>
  trafficMultipliers:     Record<TrafficLevel, number>
  weeksPerMonth:          number
  labourCostBasisDefault: number
}

// ── Fallback ────────────────────────────────────────────────────────
// Single source of truth for the "no DB" case. Imported from
// commercialQuote.ts so pricingSettings + the pricing engine never
// drift out of sync.

export const FALLBACK_PRICING_SETTINGS: PricingSettings = {
  marginTiers:            MARGIN_TIERS,
  sectorMultipliers:      SECTOR_MULTIPLIER,
  trafficMultipliers:     TRAFFIC_MULTIPLIER,
  weeksPerMonth:          WEEKS_PER_MONTH,
  labourCostBasisDefault: DEFAULT_LABOUR_COST_BASIS,
}

// ── Row shapes ──────────────────────────────────────────────────────

interface GlobalSettingRow {
  key: string
  value_numeric: number | null
}
interface MarginTierRow {
  tier: string
  label: string | null
  min_pct: number | null
  max_pct: number | null
  default_pct: number | null
}
interface SectorMultiplierRow {
  sector_category: string
  multiplier: number | null
}
interface TrafficMultiplierRow {
  traffic_level: string
  multiplier: number | null
}

function isTrafficLevel(v: unknown): v is TrafficLevel {
  return v === 'low' || v === 'medium' || v === 'high'
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

// ── Loader ──────────────────────────────────────────────────────────
// Parallel read of all four pricing tables. Returns a fully-typed
// PricingSettings object. Any missing / malformed row falls back to
// the corresponding value in FALLBACK_PRICING_SETTINGS — never throws.
//
// Usage:
//   const settings = await loadPricingSettings(supabase)
//   const preview  = computeCommercialPreview(details, scope, settings)

export async function loadPricingSettings(
  supabase: SupabaseClient,
): Promise<PricingSettings> {
  const [globalRes, tiersRes, sectorRes, trafficRes] = await Promise.all([
    supabase.from('pricing_global_settings').select('key, value_numeric'),
    supabase.from('pricing_margin_tiers').select('tier, label, min_pct, max_pct, default_pct'),
    supabase.from('pricing_sector_multipliers').select('sector_category, multiplier'),
    supabase.from('pricing_traffic_multipliers').select('traffic_level, multiplier'),
  ])

  // Any full-table failure → entire fallback. This covers:
  //   - pre-migration DB (tables don't exist yet)
  //   - RLS rejects the read
  //   - network / auth error
  if (globalRes.error || tiersRes.error || sectorRes.error || trafficRes.error) {
    return FALLBACK_PRICING_SETTINGS
  }

  // Start from the fallback, overlay DB values. Missing keys stay
  // at fallback. Cloning the maps means we never mutate the frozen
  // commercialQuote.ts constants.
  const next: PricingSettings = {
    marginTiers:            { ...FALLBACK_PRICING_SETTINGS.marginTiers },
    sectorMultipliers:      { ...FALLBACK_PRICING_SETTINGS.sectorMultipliers },
    trafficMultipliers:     { ...FALLBACK_PRICING_SETTINGS.trafficMultipliers },
    weeksPerMonth:          FALLBACK_PRICING_SETTINGS.weeksPerMonth,
    labourCostBasisDefault: FALLBACK_PRICING_SETTINGS.labourCostBasisDefault,
  }

  // Globals
  for (const row of (globalRes.data ?? []) as GlobalSettingRow[]) {
    const v = row.value_numeric
    if (!isFiniteNumber(v)) continue
    if (row.key === 'weeks_per_month')                next.weeksPerMonth          = v
    else if (row.key === 'labour_cost_basis_default') next.labourCostBasisDefault = v
  }

  // Margin tiers — require all three numeric fields to be valid,
  // otherwise keep the fallback for that tier.
  for (const row of (tiersRes.data ?? []) as MarginTierRow[]) {
    if (!isMarginTier(row.tier)) continue
    const min = Number(row.min_pct)
    const max = Number(row.max_pct)
    const def = Number(row.default_pct)
    if (!isFiniteNumber(min) || !isFiniteNumber(max) || !isFiniteNumber(def)) continue
    if (min <= 0 || max >= 1 || min > def || def > max) continue
    next.marginTiers[row.tier] = {
      label:   row.label ?? next.marginTiers[row.tier].label,
      min,
      max,
      default: def,
    }
  }

  // Sector multipliers
  for (const row of (sectorRes.data ?? []) as SectorMultiplierRow[]) {
    if (!isSectorCategory(row.sector_category)) continue
    const m = Number(row.multiplier)
    if (isFiniteNumber(m) && m > 0) next.sectorMultipliers[row.sector_category] = m
  }

  // Traffic multipliers
  for (const row of (trafficRes.data ?? []) as TrafficMultiplierRow[]) {
    if (!isTrafficLevel(row.traffic_level)) continue
    const m = Number(row.multiplier)
    if (isFiniteNumber(m) && m > 0) next.trafficMultipliers[row.traffic_level] = m
  }

  return next
}
