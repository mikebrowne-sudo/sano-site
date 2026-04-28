// Pure validation helpers for the residential pricing settings.
//
// Lives outside _actions-residential.ts because Next.js requires
// every export from a `'use server'` module to be an async function.
// Both the form (client component) and the save action (server
// action) consume `validateResidentialPricingSettings` directly,
// so it has to be a synchronous helper available from either side.

import type { ResidentialPricingSettings } from '@/lib/residentialPricingSettings'

const TIER_MIN = 1
const MULTIPLIER_MIN = 0.5
const MULTIPLIER_MAX = 2.5
const CAP_MAX = 2.0

export const RESIDENTIAL_PRICING_VALIDATION_LIMITS = {
  TIER_MIN,
  MULTIPLIER_MIN,
  MULTIPLIER_MAX,
  CAP_MAX,
} as const

export interface ValidationIssue {
  field: string
  message: string
}

/** Validate a settings object before write. Returns an empty array
 *  when everything is OK. Used by both the save action (server-side
 *  refusal) and the form (inline display). */
export function validateResidentialPricingSettings(
  input: ResidentialPricingSettings,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Tier rates positive + ordered.
  if (!(input.win_hourly_rate > 0))      issues.push({ field: 'win_hourly_rate', message: 'Win rate must be greater than 0.' })
  if (!(input.standard_hourly_rate > 0)) issues.push({ field: 'standard_hourly_rate', message: 'Standard rate must be greater than 0.' })
  if (!(input.premium_hourly_rate > 0))  issues.push({ field: 'premium_hourly_rate', message: 'Premium rate must be greater than 0.' })
  if (input.win_hourly_rate > input.standard_hourly_rate)
    issues.push({ field: 'win_hourly_rate', message: 'Win rate must be ≤ Standard rate.' })
  if (input.standard_hourly_rate > input.premium_hourly_rate)
    issues.push({ field: 'premium_hourly_rate', message: 'Premium rate must be ≥ Standard rate.' })

  // Service fee non-negative.
  if (input.service_fee < 0)
    issues.push({ field: 'service_fee', message: 'Service fee cannot be negative.' })

  // Service multipliers in range.
  for (const [k, v] of Object.entries(input.service_multipliers)) {
    if (!(v >= MULTIPLIER_MIN && v <= MULTIPLIER_MAX))
      issues.push({ field: `service_multipliers.${k}`, message: `Service multiplier ${k} must be between ${MULTIPLIER_MIN} and ${MULTIPLIER_MAX}.` })
  }

  // Condition multipliers in range.
  for (const [k, v] of Object.entries(input.condition_multipliers)) {
    if (!(v >= MULTIPLIER_MIN && v <= MULTIPLIER_MAX))
      issues.push({ field: `condition_multipliers.${k}`, message: `Condition multiplier ${k} must be between ${MULTIPLIER_MIN} and ${MULTIPLIER_MAX}.` })
  }

  // Cap range — at least 1.0 (a multiplier shouldn't decrease time)
  // and at most 2.0 per spec.
  if (!(input.condition_multiplier_cap >= 1.0 && input.condition_multiplier_cap <= CAP_MAX))
    issues.push({ field: 'condition_multiplier_cap', message: `Condition cap must be between 1.0 and ${CAP_MAX}.` })

  // Addon minutes non-negative.
  for (const [k, v] of Object.entries(input.addon_hours)) {
    if (v < 0)
      issues.push({ field: `addon_hours.${k}`, message: `Addon hours for ${k} cannot be negative.` })
  }

  return issues
}
