// Sano quote pricing engine — pure, deterministic, time-based.
// Lives alongside quote-wording.ts but has no dependency on it beyond types.
// Do not import React, Supabase, or formatting utilities here.

import type { ServiceCategory } from './quote-wording'

export type PricingMode = 'win' | 'standard' | 'premium'

export const HOURLY_RATE_WIN = 65
export const HOURLY_RATE_STANDARD = 75
export const HOURLY_RATE_PREMIUM = 82
export const SERVICE_FEE = 25
export const MIN_JOB_HOURS = 2.0
export const BUFFER_STANDARD = 0.05
export const BUFFER_HEAVY = 0.08

export const HOURLY_RATES: Record<PricingMode, number> = {
  win: HOURLY_RATE_WIN,
  standard: HOURLY_RATE_STANDARD,
  premium: HOURLY_RATE_PREMIUM,
}

const BED_BASE_HOURS: Record<1 | 2 | 3 | 4 | 5 | 6, number> = {
  1: 2.0,
  2: 2.75,
  3: 3.5,
  4: 5.0,
  5: 6.0,
  6: 7.5,
}

const SERVICE_TYPE_MULTIPLIERS: Record<string, number> = {
  'residential.standard_clean':          1.0,
  'residential.deep_clean':              1.6,
  'residential.move_in_out':             1.65,
  'residential.pre_sale':                1.2,
  'property_management.routine':         1.0,
  'property_management.end_of_tenancy':  1.65,
  'property_management.pre_inspection':  1.2,
  'property_management.handover':        1.2,
  'airbnb.turnover':                     0.9,
  'airbnb.deep_reset':                   1.25,
}

const HEAVY_BUFFER_SERVICE_TYPES = new Set<string>([
  'deep_clean', 'move_in_out', 'end_of_tenancy', 'deep_reset',
])

// Percentage adjustments keyed by condition tag. high_use_areas is handled separately
// as a flat-hour loading (step 3), not a percentage.
const CONDITION_PERCENT_ADJUSTMENTS: Record<string, number> = {
  average_condition:  0.10,
  build_up_present:   0.20,
  furnished_property: 0.10,
  recently_renovated: 0.20,
  inspection_focus:   0.10,
}

const ADDON_HOURS: Record<string, number> = {
  oven_clean:         1.0,
  fridge_clean:       0.5,
  interior_window:    1.0,
  wall_spot_cleaning: 0.75,
  carpet_cleaning:    0.5,
  spot_treatment:     0.5,
  mould_treatment:    1.5,
}

function resolveFrequencyMultiplier(
  frequency: string | null | undefined,
  xPerWeek: number | null | undefined,
): { key: string; multiplier: number } {
  if (!frequency) return { key: 'one_off', multiplier: 1.0 }
  switch (frequency) {
    case 'one_off':      return { key: 'one_off',      multiplier: 1.0 }
    case 'monthly':      return { key: 'monthly',      multiplier: 1.0 }
    case 'weekly':       return { key: 'weekly',       multiplier: 0.75 }
    case 'fortnightly':  return { key: 'fortnightly',  multiplier: 0.85 }
    case 'x_per_week': {
      const n = typeof xPerWeek === 'number' && Number.isFinite(xPerWeek) ? Math.floor(xPerWeek) : 0
      if (n >= 3) return { key: 'x_per_week_3_plus', multiplier: 0.50 }
      if (n === 2) return { key: 'x_per_week_2',     multiplier: 0.60 }
      return { key: 'x_per_week_1', multiplier: 0.75 }   // 0/1/unset → treat as weekly
    }
    default: return { key: frequency, multiplier: 1.0 }
  }
}

export interface PricingInput {
  service_category: ServiceCategory | null
  service_type_code: string | null
  bedrooms: number | null
  bathrooms: number | null
  condition_tags: string[]
  addons_wording: string[]
  frequency?: string | null
  x_per_week?: number | null
}

export interface PricingAdjustmentNote {
  tag: string
  type: 'percent' | 'hours'
  value: number
}

// Breakdown is a SUPERSET — retains all fields PricingSummary reads for UI continuity
// while adding the new spec-native fields. Legacy saved breakdowns use a subset; the UI
// tolerates missing fields via optional chaining.
export interface PricingBreakdown {
  // Base / inputs
  base_hours: number
  bed_count_used: number
  bed_count_clamped: boolean
  bed_count_fallback: boolean

  // Multipliers
  service_type_multiplier: number       // UI-legacy name
  service_multiplier: number            // new spec alias (same value)
  condition_adjustments: PricingAdjustmentNote[]
  condition_multiplier: number          // scalar product of (1 + pct) across all % tags

  // Flat-hour loadings
  bathroom_hours: number
  high_use_hours: number
  addon_hours: number
  addon_items: { key: string; hours: number }[]

  // Frequency
  frequency_key: string | null
  frequency_multiplier: number

  // Min / buffer / rounding
  hours_after_adjustments: number       // raw × multipliers + flat loadings (pre-frequency)
  pre_buffer_hours: number              // after frequency + min
  min_applied: boolean
  buffer_percent: number                // 0.05 or 0.08
  rounded_hours: number                 // UI-legacy name
  final_hours: number                   // new spec alias (same value)

  // Rate / fee
  hourly_rate: number                   // selected rate (65/75/82)
  hourly_rate_used: number              // new spec alias (same value)
  pricing_mode: PricingMode
  pricing_mode_multiplier: number       // always 1.0 post-revision; kept for UI field access on legacy quotes
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

function ceilToHalf(hours: number): number {
  return Math.ceil(hours * 2) / 2
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function resolveBedCount(
  bedrooms: number | null,
): { used: 1 | 2 | 3 | 4 | 5 | 6; clamped: boolean; fallback: boolean } {
  if (bedrooms == null || bedrooms <= 0) return { used: 1, clamped: false, fallback: true }
  if (bedrooms > 6) return { used: 6, clamped: true, fallback: false }
  return { used: Math.floor(bedrooms) as 1 | 2 | 3 | 4 | 5 | 6, clamped: false, fallback: false }
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

  // Step 1 — base hours (with fallback/clamp) × service multiplier × condition multiplier
  const bed = resolveBedCount(input.bedrooms)
  const baseHours = BED_BASE_HOURS[bed.used]
  const serviceMultiplier = SERVICE_TYPE_MULTIPLIERS[key]

  const adjustments: PricingAdjustmentNote[] = []
  let conditionMultiplier = 1.0
  for (const tag of input.condition_tags) {
    if (tag in CONDITION_PERCENT_ADJUSTMENTS) {
      const pct = CONDITION_PERCENT_ADJUSTMENTS[tag]
      conditionMultiplier *= (1 + pct)
      adjustments.push({ tag, type: 'percent', value: pct })
    }
  }

  const rawHours = baseHours * serviceMultiplier * conditionMultiplier

  // Step 2 — flat-hour loadings (bathroom, high-use, add-ons). Not scaled by multipliers.
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

  const hoursAfterAdjustments = rawHours + bathroomHours + highUseHours + addonHours

  // Step 3 — frequency × hours, THEN enforce minimum floor (floor applies AFTER frequency,
  // so a weekly discount on a small job does not push billable below MIN_JOB_HOURS).
  const { key: frequencyKey, multiplier: frequencyMultiplier } =
    resolveFrequencyMultiplier(input.frequency, input.x_per_week)

  const hoursAfterFrequency = hoursAfterAdjustments * frequencyMultiplier
  const minApplied = hoursAfterFrequency < MIN_JOB_HOURS
  const preBufferHours = Math.max(hoursAfterFrequency, MIN_JOB_HOURS)

  // Step 4 — buffer
  const bufferPercent = HEAVY_BUFFER_SERVICE_TYPES.has(code) ? BUFFER_HEAVY : BUFFER_STANDARD
  const bufferedHours = preBufferHours * (1 + bufferPercent)

  // Step 5 — round up to 0.5 hr
  const roundedHours = ceilToHalf(bufferedHours)

  // Step 6 — rate × hours + service fee (pricing_mode selects rate directly; no post-multiplier)
  const hourlyRate = HOURLY_RATES[mode]
  const priceBeforeFee = roundedHours * hourlyRate
  const calculatedPrice = round2(priceBeforeFee + SERVICE_FEE)

  // Override
  const hasOverride =
    typeof override === 'number' &&
    Number.isFinite(override) &&
    round2(override) !== calculatedPrice
  const finalPrice = hasOverride ? round2(override) : calculatedPrice

  const breakdown: PricingBreakdown = {
    base_hours: baseHours,
    bed_count_used: bed.used,
    bed_count_clamped: bed.clamped,
    bed_count_fallback: bed.fallback,

    service_type_multiplier: serviceMultiplier,
    service_multiplier: serviceMultiplier,
    condition_adjustments: adjustments,
    condition_multiplier: conditionMultiplier,

    bathroom_hours: bathroomHours,
    high_use_hours: highUseHours,
    addon_hours: addonHours,
    addon_items: addonItems,

    frequency_key: frequencyKey,
    frequency_multiplier: frequencyMultiplier,

    hours_after_adjustments: round2(hoursAfterAdjustments),
    pre_buffer_hours: round2(preBufferHours),
    min_applied: minApplied,
    buffer_percent: bufferPercent,
    rounded_hours: roundedHours,
    final_hours: roundedHours,

    hourly_rate: hourlyRate,
    hourly_rate_used: hourlyRate,
    pricing_mode: mode,
    pricing_mode_multiplier: 1.0,
    service_fee: SERVICE_FEE,

    calculated_price: calculatedPrice,
    final_price: finalPrice,
    override_flag: hasOverride,
  }

  return {
    eligible: true,
    estimated_hours: roundedHours,
    calculated_price: calculatedPrice,
    final_price: finalPrice,
    breakdown,
  }
}
