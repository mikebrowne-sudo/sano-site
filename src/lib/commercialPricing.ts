// Pure TypeScript. No React, no Supabase imports.
// All constants exported so they can be tuned without touching the calc order.

export type PropertyType = 'office' | 'warehouse' | 'retail' | 'medical'
export type LocationType = 'suburban' | 'cbd' | 'remote'
export type FrequencyType = 'weekly' | 'fortnightly' | 'monthly'
export type TrafficLevel = 'low' | 'medium' | 'high'
export type FitoutLevel = 'basic' | 'standard' | 'premium'
export type AccessDifficulty = 'easy' | 'medium' | 'hard'
export type PricingMode = 'win_work' | 'make_money' | 'premium'
export type PricingStatus = 'high_margin' | 'healthy' | 'tight'
export type PricingView = 'per_clean' | 'monthly'

export interface CommercialInputs {
  property_type: PropertyType
  office_m2?: number
  warehouse_m2?: number
  retail_m2?: number
  medical_m2?: number
  total_m2?: number
  floors?: number
  location_type: LocationType
  bathrooms: number
  kitchens: number
  windows?: number
  desks?: number
  bins?: number
  frequency_type: FrequencyType
  visits_per_period: number
  traffic_level: TrafficLevel
  fitout_level: FitoutLevel
  access_difficulty: AccessDifficulty
  carpet_clean_m2?: number
  hard_floor_m2?: number
  deep_clean?: boolean
  pricing_mode: PricingMode
}

export interface ExtrasBreakdown {
  windows: number
  carpet: number
  hard_floor: number
  deep_clean: number
}

export interface CommercialResult {
  total_per_clean: number
  monthly_value: number
  estimated_hours: number
  estimated_cost: number
  profit: number
  margin: number
  effective_hourly_rate: number
  below_target_margin: boolean
  suggested_price: number | null
  minimum_applied: boolean
  pricing_status: PricingStatus
  extras_total: number
  extras_breakdown: ExtrasBreakdown
}

// ─ Constants (spec-accurate) ───────────────────────────────────────

export const BASE_RATES: Record<PropertyType, Record<PricingMode, number>> = {
  office:    { win_work: 0.60, make_money: 0.80, premium: 1.20 },
  warehouse: { win_work: 0.35, make_money: 0.50, premium: 0.70 },
  retail:    { win_work: 0.70, make_money: 0.90, premium: 1.30 },
  medical:   { win_work: 1.10, make_money: 1.50, premium: 2.20 },
}

export const FIXTURE_RATES = {
  bathroom: { win_work: 25, make_money: 30, premium: 40 } as Record<PricingMode, number>,
  kitchen:  { win_work: 15, make_money: 20, premium: 28 } as Record<PricingMode, number>,
  desk:     { win_work:  2, make_money:  3, premium:  5 } as Record<PricingMode, number>,
  bin:      { win_work:  1, make_money: 1.5, premium:  2 } as Record<PricingMode, number>,
  window:    8,
  carpet:    4,
  hard_floor: 5,
} as const

export const COMPLEXITY_UPLIFTS = {
  traffic: { low: 0.00, medium: 0.05, high: 0.10 } as Record<TrafficLevel, number>,
  fitout:  { basic: 0.00, standard: 0.05, premium: 0.10 } as Record<FitoutLevel, number>,
  access:  { easy: 0.00, medium: 0.05, hard: 0.15 } as Record<AccessDifficulty, number>,
}

export const LOCATION_UPLIFT: Record<LocationType, number> = {
  suburban: 0.00,
  cbd:      0.10,
  remote:   0.20,
}

export const DEEP_CLEAN_MULTIPLIER = 1.5

export const HOURLY_COST = 45
export const MINIMUM_HOURS = 1.5
export const SETUP_TIME = 0.25

export const TRAVEL_TIME: Record<LocationType, number> = {
  suburban: 0.25,
  cbd:      0.30,
  remote:   0.50,
}

export const FIXTURE_HOURS = { bathroom: 0.25, kitchen: 0.20 }

// fitout selects the column within this table:
// basic -> low, standard -> medium, premium -> high
// warehouse is a flat 300 m²/hr regardless of fitout
export const PRODUCTION_RATES: Record<PropertyType, { low: number; medium: number; high: number }> = {
  office:    { low: 120, medium: 100, high: 80 },
  retail:    { low: 120, medium: 100, high: 80 },
  medical:   { low:  90, medium:  80, high: 65 },
  warehouse: { low: 300, medium: 300, high: 300 },
}

// ─ Helpers ─────────────────────────────────────────────────────────

export interface FrequencyNormal {
  visits_per_month: number
  effective_visits_per_week: number
}

export function normaliseFrequency(
  frequency_type: FrequencyType,
  visits_per_period: number,
): FrequencyNormal {
  switch (frequency_type) {
    case 'weekly':
      return {
        visits_per_month: visits_per_period * 4.33,
        effective_visits_per_week: visits_per_period,
      }
    case 'fortnightly':
      return {
        visits_per_month: visits_per_period * 2.165,
        effective_visits_per_week: visits_per_period / 2,
      }
    case 'monthly':
      return {
        visits_per_month: visits_per_period,
        effective_visits_per_week: visits_per_period / 4.33,
      }
  }
}

export function frequencyMultiplier(effectiveVisitsPerWeek: number): number {
  if (effectiveVisitsPerWeek >= 5) return 0.80
  if (effectiveVisitsPerWeek >= 4) return 0.85
  if (effectiveVisitsPerWeek >= 3) return 0.90
  if (effectiveVisitsPerWeek >= 2) return 0.95
  if (effectiveVisitsPerWeek >= 1) return 1.00
  return 1.15
}

export function targetMargin(effectiveVisitsPerWeek: number): number {
  if (effectiveVisitsPerWeek >= 5) return 0.35
  if (effectiveVisitsPerWeek >= 4) return 0.38
  if (effectiveVisitsPerWeek >= 3) return 0.40
  if (effectiveVisitsPerWeek >= 2) return 0.45
  if (effectiveVisitsPerWeek >= 1) return 0.50
  return 0.55
}

export function minimumCharge(effectiveVisitsPerWeek: number): number {
  if (effectiveVisitsPerWeek >= 5) return 120
  if (effectiveVisitsPerWeek >= 4) return 130
  if (effectiveVisitsPerWeek >= 3) return 140
  if (effectiveVisitsPerWeek >= 2) return 150
  if (effectiveVisitsPerWeek >= 1) return 160
  return 180
}

// calculateCommercialPrice will be added in Task 3.
