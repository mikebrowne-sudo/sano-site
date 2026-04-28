// Residential pricing settings — admin-editable knobs for the
// time-based engine.
//
// Reads from the `pricing_residential_settings` jsonb singleton
// (key='default'). Falls back to a code-defined default that
// preserves the EXACT prior behaviour of the residential pricing
// engine — no rate / multiplier / minutes value changes ship as
// part of this phase. Admins can edit values from the
// /portal/settings/pricing-engine "Residential" tab when ready.
//
// Pure type + async loader. No React / Next imports beyond
// SupabaseClient types so server + client callers can both consume.

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Types ──────────────────────────────────────────────────────────

/** Service-type code without the category prefix. The engine only
 *  uses these for residential / property_management / airbnb (the
 *  surfaces that the residential time-based engine prices). */
export interface ServiceMultiplierMap {
  [serviceTypeKey: string]: number   // e.g. "residential.deep_clean": 1.6
}

/** Multiplier per condition tag, e.g. build_up_present: 1.20. The
 *  multiplier of 1.0 means the tag has no time effect; 1.10 means
 *  +10% on the multiplied phase. high_use_areas is intentionally NOT
 *  in this map — it adds flat hours, not a multiplier. */
export interface ConditionMultiplierMap {
  [conditionTag: string]: number
}

/** Minutes-per-bedroom-count base hours. Keys are bedroom counts
 *  as strings ("1".."7"). Engine clamps inputs to this range. */
export interface BedroomBaseMinutesMap {
  [bedrooms: string]: number  // minutes
}

/** Minutes per add-on key. Add-ons absent from this map cost 0
 *  hours so legacy / unknown codes degrade gracefully. */
export interface AddonMinutesMap {
  [addonKey: string]: number
}

/** Selectable tier names mirroring the legacy PricingMode union. */
export type ResidentialPricingTier = 'win' | 'standard' | 'premium'

export interface ResidentialPricingSettings {
  /** @deprecated Use the per-tier rates below. Retained as an alias
   *  for `standard_hourly_rate` so legacy callers / breakdown
   *  consumers keep working. The loader keeps it in sync. */
  default_hourly_rate: number
  /** Hourly rates per tier. Win = competitive, Standard = balanced,
   *  Premium = higher-margin / detail-heavy work. */
  win_hourly_rate: number
  standard_hourly_rate: number
  premium_hourly_rate: number
  /** Tier used when no `mode` argument is passed to the engine.
   *  Defaults to 'standard'. */
  default_pricing_tier: ResidentialPricingTier
  /** Flat add to every quote. Existing constant SERVICE_FEE = 25. */
  service_fee: number

  /** Minimum billable hours floor. */
  minimum_job_hours: number
  /** Buffer applied AFTER frequency for standard service types. */
  buffer_standard: number
  /** Buffer applied AFTER frequency for heavy service types. */
  buffer_heavy: number
  /** Service-type codes that get the heavy buffer. */
  heavy_buffer_service_types: string[]

  /** Round final hours up to this step (e.g. 0.5 hour). */
  rounding_step_hours: number

  /** Hours per bedroom count, keyed by string number. */
  base_hours_by_bedroom: BedroomBaseMinutesMap
  /** Flat hours added for each bathroom beyond the first. */
  bathroom_extra_hours: number
  /** Flat hours added when high_use_areas is selected. */
  high_use_extra_hours: number

  /** Multiplier per service type, keyed "category.service_type_code". */
  service_multipliers: ServiceMultiplierMap
  /** Multiplier per condition tag. */
  condition_multipliers: ConditionMultiplierMap
  /** Cap applied to the COMBINED condition multiplier when more
   *  than one tag is selected. Single-tag quotes ignore the cap. */
  condition_multiplier_cap: number

  /** Hours added by each selected add-on. */
  addon_hours: AddonMinutesMap
}

// ── Code-defined fallback ─────────────────────────────────────────
// Values mirror the prior in-code constants exactly. Shipping the
// settings infra without changing pricing means seeding the table
// with these values (or leaving the table empty so the loader uses
// this fallback).

export const FALLBACK_RESIDENTIAL_PRICING_SETTINGS: ResidentialPricingSettings = {
  default_hourly_rate: 75,
  // Phase residential-pricing-tiers: explicit per-tier rates with
  // Standard as the default. Win = competitive cut, Premium = detail
  // / high-margin uplift. Admin can edit all three from settings.
  win_hourly_rate:      70,
  standard_hourly_rate: 75,
  premium_hourly_rate:  80,
  default_pricing_tier: 'standard',
  service_fee: 25,

  minimum_job_hours: 2.0,
  buffer_standard: 0.05,
  buffer_heavy: 0.08,
  heavy_buffer_service_types: [
    'deep_clean', 'move_in_out', 'end_of_tenancy', 'deep_reset',
    'post_construction',
  ],

  rounding_step_hours: 0.5,

  base_hours_by_bedroom: {
    '1': 2.0,
    '2': 2.75,
    '3': 3.5,
    '4': 5.0,
    '5': 6.0,
    '6': 7.5,
    '7': 9.0,
  },
  bathroom_extra_hours: 0.5,
  high_use_extra_hours: 0.5,

  service_multipliers: {
    'residential.standard_clean':          1.0,
    'residential.deep_clean':              1.6,
    'residential.move_in_out':             1.65,
    'residential.pre_sale':                1.2,
    'residential.post_construction':       1.5,
    'property_management.routine':         1.0,
    'property_management.end_of_tenancy':  1.65,
    'property_management.pre_inspection':  1.2,
    'property_management.handover':        1.2,
    // Residential-pricing-tweaks: airbnb turnover normalised from 0.9
    // → 1.0. Turnovers can be fast but presentation expectations
    // remain — should not auto-discount.
    'airbnb.turnover':                     1.0,
    'airbnb.deep_reset':                   1.25,
  },

  // Stored as multipliers (1.10 = +10%) for UI clarity. The engine
  // converts via (1.0 + ((m - 1.0) when capping)) — see the cap
  // formula in quote-pricing.ts.
  // Residential-pricing-tweaks: average_condition normalised from
  // 1.10 → 1.00. "Average" should be neutral, not an automatic uplift.
  condition_multipliers: {
    average_condition:  1.00,
    build_up_present:   1.20,
    furnished_property: 1.10,
    recently_renovated: 1.20,
    inspection_focus:   1.10,
  },
  condition_multiplier_cap: 1.45,

  addon_hours: {
    // Existing — preserved exactly.
    oven_clean:         1.0,
    fridge_clean:       0.5,
    interior_window:    1.0,
    wall_spot_cleaning: 0.75,
    carpet_cleaning:    0.5,
    spot_treatment:     0.5,
    mould_treatment:    1.5,

    // High-value (added with the residential service upgrade).
    upholstery_cleaning: 1.0,
    exterior_window:     0.75,
    pressure_washing:    1.5,
    rubbish_removal:     0.75,
    garage_full:         2.0,

    // Detail / time-based.
    inside_cupboards: 1.5,
    inside_wardrobes: 1.0,
    blinds_shutters:  1.0,
    full_wall_wash:   2.0,
    high_dusting:     0.75,
    balcony_deck:     0.75,

    // Condition-based.
    heavy_grease:                1.5,
    post_construction_residue:   2.0,
  },
}

// ── Loader ────────────────────────────────────────────────────────
// Reads the singleton row, merges it on top of the fallback. Any
// missing / malformed key keeps the fallback value, never throws.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public'>

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

function mergeNumberMap<K extends string>(
  base: Record<K, number>,
  raw: unknown,
): Record<K, number> {
  if (!raw || typeof raw !== 'object') return base
  const out: Record<string, number> = { ...base }
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (isFiniteNumber(v) && v >= 0) out[k] = v
  }
  return out as Record<K, number>
}

export async function loadResidentialPricingSettings(
  supabase: SB,
): Promise<ResidentialPricingSettings> {
  const { data } = await supabase
    .from('pricing_residential_settings')
    .select('value')
    .eq('key', 'default')
    .maybeSingle()

  const raw = (data as { value?: Partial<ResidentialPricingSettings> } | null)?.value
  if (!raw || typeof raw !== 'object') return FALLBACK_RESIDENTIAL_PRICING_SETTINGS

  const fb = FALLBACK_RESIDENTIAL_PRICING_SETTINGS
  // Resolve per-tier rates with backwards-compat for rows that only
  // hold default_hourly_rate. The standard tier inherits from
  // default_hourly_rate when its own value is missing; win/premium
  // fall back to ±$5 from standard so legacy seeds still produce
  // sensible tier rates.
  const stdRate =
    isFiniteNumber(raw.standard_hourly_rate) && raw.standard_hourly_rate > 0
      ? raw.standard_hourly_rate
      : (isFiniteNumber(raw.default_hourly_rate) && raw.default_hourly_rate > 0
          ? raw.default_hourly_rate : fb.standard_hourly_rate)
  const winRate =
    isFiniteNumber(raw.win_hourly_rate) && raw.win_hourly_rate > 0
      ? raw.win_hourly_rate : Math.max(1, stdRate - 5)
  const premRate =
    isFiniteNumber(raw.premium_hourly_rate) && raw.premium_hourly_rate > 0
      ? raw.premium_hourly_rate : stdRate + 5
  const tier: ResidentialPricingTier =
    raw.default_pricing_tier === 'win' || raw.default_pricing_tier === 'premium'
      ? raw.default_pricing_tier
      : 'standard'

  return {
    default_hourly_rate: stdRate,
    win_hourly_rate:      winRate,
    standard_hourly_rate: stdRate,
    premium_hourly_rate:  premRate,
    default_pricing_tier: tier,
    service_fee:
      isFiniteNumber(raw.service_fee) && raw.service_fee >= 0
        ? raw.service_fee : fb.service_fee,
    minimum_job_hours:
      isFiniteNumber(raw.minimum_job_hours) && raw.minimum_job_hours >= 0
        ? raw.minimum_job_hours : fb.minimum_job_hours,
    buffer_standard:
      isFiniteNumber(raw.buffer_standard) && raw.buffer_standard >= 0
        ? raw.buffer_standard : fb.buffer_standard,
    buffer_heavy:
      isFiniteNumber(raw.buffer_heavy) && raw.buffer_heavy >= 0
        ? raw.buffer_heavy : fb.buffer_heavy,
    heavy_buffer_service_types: Array.isArray(raw.heavy_buffer_service_types)
      ? raw.heavy_buffer_service_types.filter((s): s is string => typeof s === 'string')
      : fb.heavy_buffer_service_types,
    rounding_step_hours:
      isFiniteNumber(raw.rounding_step_hours) && raw.rounding_step_hours > 0
        ? raw.rounding_step_hours : fb.rounding_step_hours,
    base_hours_by_bedroom: mergeNumberMap(fb.base_hours_by_bedroom, raw.base_hours_by_bedroom),
    bathroom_extra_hours:
      isFiniteNumber(raw.bathroom_extra_hours) && raw.bathroom_extra_hours >= 0
        ? raw.bathroom_extra_hours : fb.bathroom_extra_hours,
    high_use_extra_hours:
      isFiniteNumber(raw.high_use_extra_hours) && raw.high_use_extra_hours >= 0
        ? raw.high_use_extra_hours : fb.high_use_extra_hours,
    service_multipliers: mergeNumberMap(fb.service_multipliers, raw.service_multipliers),
    condition_multipliers: mergeNumberMap(fb.condition_multipliers, raw.condition_multipliers),
    condition_multiplier_cap:
      isFiniteNumber(raw.condition_multiplier_cap) && raw.condition_multiplier_cap >= 1.0
        ? raw.condition_multiplier_cap : fb.condition_multiplier_cap,
    addon_hours: mergeNumberMap(fb.addon_hours, raw.addon_hours),
  }
}
