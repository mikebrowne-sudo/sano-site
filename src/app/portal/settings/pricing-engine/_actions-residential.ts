'use server'

// Residential pricing settings — save action.
//
// Admin-only. Upserts the singleton row in
// pricing_residential_settings. The shape is validated against the
// fallback so a partial save can't corrupt the engine — any value
// that's missing or invalid is dropped before persistence.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import {
  FALLBACK_RESIDENTIAL_PRICING_SETTINGS,
  type ResidentialPricingSettings,
} from '@/lib/residentialPricingSettings'

const ADMIN_EMAIL = 'michael@sano.nz'

function clean(input: unknown): ResidentialPricingSettings {
  // Run the input through a fresh fallback merge so we always emit a
  // complete, well-typed settings object regardless of what the form
  // sends. Same defensive shape the loader uses on read.
  const fb = FALLBACK_RESIDENTIAL_PRICING_SETTINGS
  if (!input || typeof input !== 'object') return fb
  const raw = input as Partial<ResidentialPricingSettings>
  const num = (v: unknown, fallback: number, minInclusive = 0) =>
    typeof v === 'number' && Number.isFinite(v) && v >= minInclusive ? v : fallback

  const sanitiseMap = <T extends Record<string, number>>(value: unknown, fallback: T): T => {
    if (!value || typeof value !== 'object') return fallback
    const out = { ...fallback } as Record<string, number>
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = v
    }
    return out as T
  }

  return {
    default_hourly_rate: num(raw.default_hourly_rate, fb.default_hourly_rate, 1),
    service_fee:          num(raw.service_fee, fb.service_fee, 0),
    minimum_job_hours:    num(raw.minimum_job_hours, fb.minimum_job_hours, 0),
    buffer_standard:      num(raw.buffer_standard, fb.buffer_standard, 0),
    buffer_heavy:         num(raw.buffer_heavy, fb.buffer_heavy, 0),
    heavy_buffer_service_types: Array.isArray(raw.heavy_buffer_service_types)
      ? raw.heavy_buffer_service_types.filter((s): s is string => typeof s === 'string' && s.length > 0)
      : fb.heavy_buffer_service_types,
    rounding_step_hours:  num(raw.rounding_step_hours, fb.rounding_step_hours, 0.05),
    base_hours_by_bedroom: sanitiseMap(raw.base_hours_by_bedroom, fb.base_hours_by_bedroom),
    bathroom_extra_hours: num(raw.bathroom_extra_hours, fb.bathroom_extra_hours, 0),
    high_use_extra_hours: num(raw.high_use_extra_hours, fb.high_use_extra_hours, 0),
    service_multipliers:  sanitiseMap(raw.service_multipliers, fb.service_multipliers),
    condition_multipliers: sanitiseMap(raw.condition_multipliers, fb.condition_multipliers),
    condition_multiplier_cap: num(raw.condition_multiplier_cap, fb.condition_multiplier_cap, 1.0),
    addon_hours:          sanitiseMap(raw.addon_hours, fb.addon_hours),
  }
}

export async function saveResidentialPricingSettings(
  input: ResidentialPricingSettings,
): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (user.email !== ADMIN_EMAIL) return { error: 'Admin only.' }

  const next = clean(input)

  const { error } = await supabase
    .from('pricing_residential_settings')
    .upsert({
      key: 'default',
      value: next,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }, { onConflict: 'key' })

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'residential_pricing_settings.updated',
    entity_table: 'pricing_residential_settings',
    entity_id: null,
    before: null,
    after: { default_hourly_rate: next.default_hourly_rate, condition_multiplier_cap: next.condition_multiplier_cap },
  })

  revalidatePath('/portal/settings/pricing-engine')
  revalidatePath('/portal/quotes/new')
  return { ok: true }
}

/** Reset the settings row back to the code-defined fallback. Useful
 *  if an admin edit puts the engine into an unexpected state. */
export async function resetResidentialPricingSettings(): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (user.email !== ADMIN_EMAIL) return { error: 'Admin only.' }

  const { error } = await supabase
    .from('pricing_residential_settings')
    .upsert({
      key: 'default',
      value: FALLBACK_RESIDENTIAL_PRICING_SETTINGS,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }, { onConflict: 'key' })

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'residential_pricing_settings.reset',
    entity_table: 'pricing_residential_settings',
    entity_id: null,
    before: null,
    after: { reset: true },
  })

  revalidatePath('/portal/settings/pricing-engine')
  revalidatePath('/portal/quotes/new')
  return { ok: true }
}
