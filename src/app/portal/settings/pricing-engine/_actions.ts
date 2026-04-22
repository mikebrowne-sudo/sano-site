'use server'

// Pricing engine settings — server actions (Phase 3B.2).
//
// Admin-only. Each action upserts one of the four pricing_* tables
// introduced in Phase 3A. Validation mirrors the DB CHECK constraints
// as a second gate; the DB is still the final source of truth.
//
// Revalidates both this page (so the form shows fresh values) and the
// /portal/quotes layout (so new render of any quote form picks up
// fresh settings via loadPricingSettings).

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type {
  MarginTier,
  SectorCategory,
  TrafficLevel,
} from '@/lib/commercialQuote'

const ADMIN_EMAIL = 'michael@sano.nz'

const VALID_TIERS: readonly MarginTier[] = ['win_the_work', 'standard', 'premium', 'specialist']
const VALID_SECTORS: readonly SectorCategory[] = ['office', 'education', 'medical', 'industrial', 'mixed_use', 'custom']
const VALID_TRAFFIC: readonly TrafficLevel[] = ['low', 'medium', 'high']

type ActionResult = { ok: true } | { error: string }

function revalidateSettingsAndQuotes() {
  revalidatePath('/portal/settings/pricing-engine')
  revalidatePath('/portal/quotes', 'layout')
}

async function requireAdmin(): Promise<{ ok: true; userId: string } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return { error: 'Admin only.' }
  return { ok: true, userId: user.id }
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

// ── saveGlobalSettings ─────────────────────────────────────────────

export interface SaveGlobalSettingsInput {
  labour_cost_basis_default: number
  weeks_per_month: number
}

export async function saveGlobalSettings(
  input: SaveGlobalSettingsInput,
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const lcb = Number(input.labour_cost_basis_default)
  const wpm = Number(input.weeks_per_month)
  if (!isFiniteNumber(lcb) || lcb <= 0 || lcb >= 500) {
    return { error: 'Labour cost basis must be greater than 0 and less than 500.' }
  }
  if (!isFiniteNumber(wpm) || wpm <= 0 || wpm >= 10) {
    return { error: 'Weeks per month must be greater than 0 and less than 10.' }
  }

  const supabase = createClient()
  const now = new Date().toISOString()
  const rows = [
    { key: 'labour_cost_basis_default', value_numeric: lcb, updated_at: now, updated_by: auth.userId },
    { key: 'weeks_per_month',           value_numeric: wpm, updated_at: now, updated_by: auth.userId },
  ]
  const { error } = await supabase
    .from('pricing_global_settings')
    .upsert(rows, { onConflict: 'key' })
  if (error) return { error: `Failed to save global settings: ${error.message}` }

  revalidateSettingsAndQuotes()
  return { ok: true }
}

// ── saveMarginTiers ────────────────────────────────────────────────

export interface MarginTierInput {
  tier: MarginTier
  label: string
  min_pct: number
  max_pct: number
  default_pct: number
}

export async function saveMarginTiers(
  input: { tiers: MarginTierInput[] },
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  if (!Array.isArray(input.tiers) || input.tiers.length === 0) {
    return { error: 'At least one tier is required.' }
  }

  for (const t of input.tiers) {
    if (!VALID_TIERS.includes(t.tier)) {
      return { error: `Invalid tier: ${t.tier}` }
    }
    if (!t.label || !t.label.trim()) {
      return { error: `Tier ${t.tier}: label is required.` }
    }
    if (!isFiniteNumber(t.min_pct) || !isFiniteNumber(t.max_pct) || !isFiniteNumber(t.default_pct)) {
      return { error: `Tier ${t.tier}: all percentages must be numbers.` }
    }
    if (t.min_pct <= 0) {
      return { error: `Tier ${t.tier}: min percentage must be greater than 0.` }
    }
    if (t.max_pct >= 1) {
      return { error: `Tier ${t.tier}: max percentage must be less than 100%.` }
    }
    if (t.min_pct > t.default_pct || t.default_pct > t.max_pct) {
      return { error: `Tier ${t.tier}: require min ≤ default ≤ max.` }
    }
  }

  const supabase = createClient()
  const now = new Date().toISOString()
  const rows = input.tiers.map((t, idx) => ({
    tier: t.tier,
    label: t.label.trim(),
    min_pct: t.min_pct,
    max_pct: t.max_pct,
    default_pct: t.default_pct,
    display_order: idx + 1,
    updated_at: now,
    updated_by: auth.userId,
  }))
  const { error } = await supabase
    .from('pricing_margin_tiers')
    .upsert(rows, { onConflict: 'tier' })
  if (error) return { error: `Failed to save margin tiers: ${error.message}` }

  revalidateSettingsAndQuotes()
  return { ok: true }
}

// ── saveSectorMultipliers ──────────────────────────────────────────

export interface SectorMultiplierInput {
  sector_category: SectorCategory
  multiplier: number
}

export async function saveSectorMultipliers(
  input: { multipliers: SectorMultiplierInput[] },
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  for (const m of input.multipliers) {
    if (!VALID_SECTORS.includes(m.sector_category)) {
      return { error: `Invalid sector: ${m.sector_category}` }
    }
    if (!isFiniteNumber(m.multiplier) || m.multiplier <= 0 || m.multiplier >= 5) {
      return { error: `Sector ${m.sector_category}: multiplier must be greater than 0 and less than 5.` }
    }
  }

  const supabase = createClient()
  const now = new Date().toISOString()
  const rows = input.multipliers.map((m) => ({
    sector_category: m.sector_category,
    multiplier: m.multiplier,
    updated_at: now,
    updated_by: auth.userId,
  }))
  const { error } = await supabase
    .from('pricing_sector_multipliers')
    .upsert(rows, { onConflict: 'sector_category' })
  if (error) return { error: `Failed to save sector multipliers: ${error.message}` }

  revalidateSettingsAndQuotes()
  return { ok: true }
}

// ── saveTrafficMultipliers ─────────────────────────────────────────

export interface TrafficMultiplierInput {
  traffic_level: TrafficLevel
  multiplier: number
}

export async function saveTrafficMultipliers(
  input: { multipliers: TrafficMultiplierInput[] },
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  for (const m of input.multipliers) {
    if (!VALID_TRAFFIC.includes(m.traffic_level)) {
      return { error: `Invalid traffic level: ${m.traffic_level}` }
    }
    if (!isFiniteNumber(m.multiplier) || m.multiplier <= 0 || m.multiplier >= 5) {
      return { error: `Traffic ${m.traffic_level}: multiplier must be greater than 0 and less than 5.` }
    }
  }

  const supabase = createClient()
  const now = new Date().toISOString()
  const rows = input.multipliers.map((m) => ({
    traffic_level: m.traffic_level,
    multiplier: m.multiplier,
    updated_at: now,
    updated_by: auth.userId,
  }))
  const { error } = await supabase
    .from('pricing_traffic_multipliers')
    .upsert(rows, { onConflict: 'traffic_level' })
  if (error) return { error: `Failed to save traffic multipliers: ${error.message}` }

  revalidateSettingsAndQuotes()
  return { ok: true }
}
