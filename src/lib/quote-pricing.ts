// Sano quote pricing engine — pure, deterministic, time-based.
// Lives alongside quote-wording.ts but has no dependency on it beyond types.
// Do not import React, Supabase, or formatting utilities here.
//
// Phase residential-pricing-engine:
//   - Math now reads from `ResidentialPricingSettings` (loaded from
//     pricing_residential_settings jsonb singleton). Callers can pass
//     a `settings` object to drive every knob; when omitted, the
//     engine uses the code-defined fallback (identical values to the
//     prior in-code constants). No pricing change for legacy callers.
//   - Multi-tag condition combination is now CAPPED via the formula
//     min(cap, m1 + 0.5 × (m2 - 1.0)) (m1 = highest multiplier).
//     Single-tag and zero-tag quotes are unchanged.
//   - The legacy module-level constants (HOURLY_RATES, MIN_JOB_HOURS,
//     etc.) are preserved as exports so old call-sites keep building.
//     They mirror the fallback settings.

import type { ServiceCategory } from './quote-wording'
import {
  FALLBACK_RESIDENTIAL_PRICING_SETTINGS,
  type ResidentialPricingSettings,
} from './residentialPricingSettings'

export type PricingMode = 'win' | 'standard' | 'premium'

// ── Legacy exports — preserved for any caller still importing
// constants directly. Values mirror the fallback settings so this
// module stays the single source of truth at runtime. ─────────────

export const HOURLY_RATE_WIN = 65
export const HOURLY_RATE_STANDARD = 75
export const HOURLY_RATE_PREMIUM = 82
export const SERVICE_FEE = FALLBACK_RESIDENTIAL_PRICING_SETTINGS.service_fee
export const MIN_JOB_HOURS = FALLBACK_RESIDENTIAL_PRICING_SETTINGS.minimum_job_hours
export const BUFFER_STANDARD = FALLBACK_RESIDENTIAL_PRICING_SETTINGS.buffer_standard
export const BUFFER_HEAVY = FALLBACK_RESIDENTIAL_PRICING_SETTINGS.buffer_heavy

export const HOURLY_RATES: Record<PricingMode, number> = {
  win: HOURLY_RATE_WIN,
  standard: HOURLY_RATE_STANDARD,
  premium: HOURLY_RATE_PREMIUM,
}

// ── Types ─────────────────────────────────────────────────────────

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
      return { key: 'x_per_week_1', multiplier: 0.75 }
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

// Breakdown is a SUPERSET — preserves every field PricingSummary already
// reads from legacy quote rows AND adds the new spec-native fields. Old
// saved breakdowns parse fine via optional chaining.
export interface PricingBreakdown {
  base_hours: number
  bed_count_used: number
  bed_count_clamped: boolean
  bed_count_fallback: boolean

  service_type_multiplier: number
  service_multiplier: number
  condition_adjustments: PricingAdjustmentNote[]
  /** Combined condition multiplier after the cap formula has been
   *  applied. For single-tag quotes this equals the tag's own
   *  multiplier; for multi-tag, it follows the capped combine rule. */
  condition_multiplier: number
  /** True when condition_multiplier_cap clipped the combined value. */
  condition_cap_applied: boolean

  bathroom_hours: number
  high_use_hours: number
  addon_hours: number
  addon_items: { key: string; hours: number }[]

  frequency_key: string | null
  frequency_multiplier: number

  hours_after_adjustments: number
  pre_buffer_hours: number
  min_applied: boolean
  buffer_percent: number
  rounded_hours: number
  final_hours: number

  hourly_rate: number
  hourly_rate_used: number
  pricing_mode: PricingMode
  pricing_mode_multiplier: number
  service_fee: number

  calculated_price: number
  final_price: number
  override_flag: boolean

  /** Hash of the settings object used to compute this breakdown.
   *  Lets callers detect when a stored breakdown was produced under
   *  different admin-set values vs the current settings. */
  settings_signature: string
}

export interface PricingResult {
  eligible: boolean
  estimated_hours: number | null
  calculated_price: number | null
  final_price: number | null
  breakdown: PricingBreakdown | null
}

// ── Helpers ───────────────────────────────────────────────────────

function ceilToStep(hours: number, step: number): number {
  if (!step || step <= 0) return Math.ceil(hours * 2) / 2
  return Math.ceil(hours / step) * step
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function resolveBedCount(
  bedrooms: number | null,
  baseMap: Record<string, number>,
): { used: number; clamped: boolean; fallback: boolean; baseHours: number } {
  // Build a sorted list of supported bedroom counts (numeric keys).
  const supportedKeys = Object.keys(baseMap).map((k) => Number(k)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
  if (supportedKeys.length === 0) {
    return { used: 1, clamped: false, fallback: true, baseHours: 0 }
  }
  const min = supportedKeys[0]
  const max = supportedKeys[supportedKeys.length - 1]
  if (bedrooms == null || bedrooms <= 0) {
    return { used: min, clamped: false, fallback: true, baseHours: baseMap[String(min)] }
  }
  if (bedrooms > max) {
    return { used: max, clamped: true, fallback: false, baseHours: baseMap[String(max)] }
  }
  const exact = Math.floor(bedrooms)
  const used = supportedKeys.includes(exact) ? exact : min
  return { used, clamped: false, fallback: false, baseHours: baseMap[String(used)] }
}

/** Combined condition multiplier per the capped formula:
 *
 *    1 tag  → m1
 *    n tags → min(cap, m1 + 0.5 × Σ(m_i − 1.0)  for i ≥ 2)
 *
 *  Tags with no entry in `condition_multipliers` (or whose value is
 *  ≤ 1.0) contribute 0 to the additional sum. high_use_areas is
 *  intentionally NOT in the multiplier map — it's a flat-hour add. */
function combineConditionMultipliers(
  tags: string[],
  multipliers: Record<string, number>,
  cap: number,
): { combined: number; capped: boolean; perTag: PricingAdjustmentNote[] } {
  const perTag: PricingAdjustmentNote[] = []
  const values: number[] = []
  for (const tag of tags) {
    const m = multipliers[tag]
    if (typeof m === 'number' && m > 1.0) {
      values.push(m)
      perTag.push({ tag, type: 'percent', value: round2(m - 1.0) })
    }
  }
  if (values.length === 0) return { combined: 1.0, capped: false, perTag }
  values.sort((a, b) => b - a)
  const lead = values[0]
  let combined = lead
  for (let i = 1; i < values.length; i++) {
    combined += 0.5 * (values[i] - 1.0)
  }
  const capped = combined > cap
  if (capped) combined = cap
  return { combined: round2(combined), capped, perTag }
}

function settingsSignature(s: ResidentialPricingSettings): string {
  // Lightweight hash sufficient to fingerprint the active settings
  // for "this breakdown was computed with settings X" diagnostics.
  // Not a security primitive — just a stable digest.
  const stable = JSON.stringify({
    r: s.default_hourly_rate, f: s.service_fee,
    m: s.minimum_job_hours, bs: s.buffer_standard, bh: s.buffer_heavy,
    rd: s.rounding_step_hours, cap: s.condition_multiplier_cap,
    bb: s.base_hours_by_bedroom, bex: s.bathroom_extra_hours, hu: s.high_use_extra_hours,
    sm: s.service_multipliers, cm: s.condition_multipliers, ah: s.addon_hours,
  })
  let hash = 0
  for (let i = 0; i < stable.length; i++) {
    hash = ((hash << 5) - hash + stable.charCodeAt(i)) | 0
  }
  return `r${(hash >>> 0).toString(16)}`
}

// ── Public API ───────────────────────────────────────────────────

export function isPricingEligible(
  category: ServiceCategory | null,
  serviceTypeCode: string | null,
  settings: ResidentialPricingSettings = FALLBACK_RESIDENTIAL_PRICING_SETTINGS,
): boolean {
  if (!category || !serviceTypeCode) return false
  return `${category}.${serviceTypeCode}` in settings.service_multipliers
}

export function calculateQuotePrice(
  input: PricingInput,
  mode: PricingMode,
  override?: number,
  settings: ResidentialPricingSettings = FALLBACK_RESIDENTIAL_PRICING_SETTINGS,
): PricingResult {
  if (!isPricingEligible(input.service_category, input.service_type_code, settings)) {
    return { eligible: false, estimated_hours: null, calculated_price: null, final_price: null, breakdown: null }
  }

  const category = input.service_category!
  const code = input.service_type_code!
  const key = `${category}.${code}`

  // Step 1 — base × service × condition.
  const bed = resolveBedCount(input.bedrooms, settings.base_hours_by_bedroom)
  const baseHours = bed.baseHours
  const serviceMultiplier = settings.service_multipliers[key] ?? 1.0

  const condition = combineConditionMultipliers(
    input.condition_tags,
    settings.condition_multipliers,
    settings.condition_multiplier_cap,
  )
  const conditionMultiplier = condition.combined

  const rawHours = baseHours * serviceMultiplier * conditionMultiplier

  // Step 2 — flat-hour loadings.
  const bathCount = (input.bathrooms == null || input.bathrooms <= 0) ? 1 : Math.floor(input.bathrooms)
  const bathroomHours = Math.max(0, (bathCount - 1) * settings.bathroom_extra_hours)

  const adjustments: PricingAdjustmentNote[] = [...condition.perTag]
  let highUseHours = 0
  if (input.condition_tags.includes('high_use_areas')) {
    highUseHours = settings.high_use_extra_hours
    adjustments.push({ tag: 'high_use_areas', type: 'hours', value: settings.high_use_extra_hours })
  }

  const addonItems: { key: string; hours: number }[] = []
  let addonHours = 0
  for (const addonKey of input.addons_wording) {
    const h = settings.addon_hours[addonKey]
    if (typeof h === 'number' && h > 0) {
      addonHours += h
      addonItems.push({ key: addonKey, hours: h })
    }
  }

  const hoursAfterAdjustments = rawHours + bathroomHours + highUseHours + addonHours

  // Step 3 — frequency × hours, THEN minimum floor.
  const { key: frequencyKey, multiplier: frequencyMultiplier } =
    resolveFrequencyMultiplier(input.frequency, input.x_per_week)

  const hoursAfterFrequency = hoursAfterAdjustments * frequencyMultiplier
  const minApplied = hoursAfterFrequency < settings.minimum_job_hours
  const preBufferHours = Math.max(hoursAfterFrequency, settings.minimum_job_hours)

  // Step 4 — buffer.
  const bufferPercent = settings.heavy_buffer_service_types.includes(code)
    ? settings.buffer_heavy
    : settings.buffer_standard
  const bufferedHours = preBufferHours * (1 + bufferPercent)

  // Step 5 — round up to the configured step (default 0.5 hr).
  const roundedHours = ceilToStep(bufferedHours, settings.rounding_step_hours)

  // Step 6 — rate × hours + service fee.
  // Hourly rate priority:
  //   - When the caller passes settings AND the standard mode is in
  //     play, settings.default_hourly_rate wins. The win/premium
  //     modes still adjust by their constant offset so the existing
  //     mode selector keeps doing something.
  //   - When no custom settings are passed, the engine resolves rate
  //     from HOURLY_RATES[mode] as before — ZERO change for legacy
  //     callers.
  const usingDefaults = settings === FALLBACK_RESIDENTIAL_PRICING_SETTINGS
  const baseRate = usingDefaults ? HOURLY_RATES[mode] : settings.default_hourly_rate
  let hourlyRate = baseRate
  if (!usingDefaults) {
    if (mode === 'win')      hourlyRate = baseRate - (HOURLY_RATE_STANDARD - HOURLY_RATE_WIN)
    if (mode === 'premium')  hourlyRate = baseRate + (HOURLY_RATE_PREMIUM - HOURLY_RATE_STANDARD)
  }

  const priceBeforeFee = roundedHours * hourlyRate
  const calculatedPrice = round2(priceBeforeFee + settings.service_fee)

  // Override.
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
    condition_cap_applied: condition.capped,

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
    service_fee: settings.service_fee,

    calculated_price: calculatedPrice,
    final_price: finalPrice,
    override_flag: hasOverride,

    settings_signature: settingsSignature(settings),
  }

  return {
    eligible: true,
    estimated_hours: roundedHours,
    calculated_price: calculatedPrice,
    final_price: finalPrice,
    breakdown,
  }
}
