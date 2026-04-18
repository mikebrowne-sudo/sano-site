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
