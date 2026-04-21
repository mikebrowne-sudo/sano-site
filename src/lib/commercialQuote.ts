// Commercial Quote Engine — types + constants.
// Pure TypeScript, no React, no Supabase. Consumed by server actions
// (src/app/portal/quotes/_actions-commercial.ts) and, later, by UI.
//
// The schema backing these types lives in
// docs/db/2026-04-20-commercial-quote-foundation.sql.

// ── Enums ──────────────────────────────────────────────────────────

export type SectorCategory =
  | 'office'
  | 'education'
  | 'medical'
  | 'industrial'
  | 'mixed_use'
  | 'custom'

export type BuildingType =
  | 'single_tenant'
  | 'multi_tenant'
  | 'standalone'
  | 'retail_strip'
  | 'campus'
  | 'other'

export type OccupancyLevel = 'low' | 'medium' | 'high'
export type TrafficLevel = 'low' | 'medium' | 'high'
export type ConsumablesBy = 'sano' | 'client' | 'shared'

export type MarginTier = 'win_the_work' | 'standard' | 'premium' | 'specialist'

export type ScopeFrequency =
  | 'per_visit'
  | 'daily'
  | 'weekly'
  | 'fortnightly'
  | 'monthly'
  | 'quarterly'
  | 'six_monthly'
  | 'annual'
  | 'as_required'

export type QuantityType =
  | 'area_m2'
  | 'fixture_count'
  | 'linear_m'
  | 'time_minutes'
  | 'none'

// ── Row shapes (mirror the DB tables) ──────────────────────────────

export interface CommercialQuoteDetails {
  id: string
  quote_id: string

  sector_category: SectorCategory
  sector_subtype: string | null
  building_type: BuildingType | null
  service_days: string[] | null
  service_window: string | null
  access_requirements: string | null
  consumables_by: ConsumablesBy | null
  occupancy_level: OccupancyLevel | null
  traffic_level: TrafficLevel | null

  total_area_m2: number | null
  carpet_area_m2: number | null
  hard_floor_area_m2: number | null
  floor_count: number | null
  toilets_count: number | null
  urinals_count: number | null
  showers_count: number | null
  basins_count: number | null
  kitchens_count: number | null
  desks_count: number | null
  offices_count: number | null
  meeting_rooms_count: number | null
  reception_count: number | null

  corridors_stairs_notes: string | null
  external_glass_notes: string | null
  compliance_notes: string | null
  assumptions: string | null
  exclusions: string | null

  sector_fields: Record<string, unknown>

  selected_margin_tier: MarginTier | null
  labour_cost_basis: number | null
  estimated_service_hours: number | null
  estimated_weekly_hours: number | null
  estimated_monthly_hours: number | null

  created_at: string
  updated_at: string
}

export interface CommercialScopeItem {
  id: string
  quote_id: string
  area_type: string | null
  task_group: string | null
  task_name: string
  frequency: ScopeFrequency | null
  quantity_type: QuantityType | null
  quantity_value: number | null
  unit_minutes: number | null
  production_rate: number | null
  included: boolean
  notes: string | null
  display_order: number
  created_at: string
}

// ── Margin tiers ───────────────────────────────────────────────────
// Configurable ranges. UI shows the range to the operator; the
// server stores the chosen tier on commercial_quote_details.selected_margin_tier
// and (separately) a concrete percentage the operator picks within the range.

export interface MarginTierSpec {
  label: string
  min: number
  max: number
  default: number
}

export const MARGIN_TIERS: Record<MarginTier, MarginTierSpec> = {
  win_the_work: {
    label: 'Win the work',
    min: 0.15,
    max: 0.20,
    default: 0.18,
  },
  standard: {
    label: 'Standard',
    min: 0.22,
    max: 0.28,
    default: 0.25,
  },
  premium: {
    label: 'Premium',
    min: 0.30,
    max: 0.38,
    default: 0.34,
  },
  specialist: {
    label: 'Specialist / high-risk',
    min: 0.35,
    max: 0.50,
    default: 0.40,
  },
}

// ── Sector field packs ─────────────────────────────────────────────
// Drives progressive disclosure in the commercial quote form. Values
// stored inside commercial_quote_details.sector_fields JSONB, keyed by
// SectorFieldDef.key.

export type SectorFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'select'
  | 'chips'

export interface SectorFieldDef {
  key: string
  label: string
  type: SectorFieldType
  options?: readonly string[]
  min?: number
  max?: number
  placeholder?: string
}

export const SECTOR_FIELD_PACKS: Record<SectorCategory, readonly SectorFieldDef[]> = {
  office: [
    { key: 'staff_count', label: 'Staff count', type: 'integer', min: 0 },
    { key: 'public_facing_areas', label: 'Public-facing areas', type: 'textarea' },
    { key: 'internal_glass_frequency', label: 'Internal glass frequency', type: 'select',
      options: ['weekly', 'fortnightly', 'monthly', 'quarterly', 'as_required'] },
    { key: 'desk_sanitation_required', label: 'Desk sanitation required', type: 'boolean' },
    { key: 'waste_streams', label: 'Waste streams', type: 'chips',
      options: ['general', 'recycling', 'organic', 'paper', 'confidential'] },
  ],
  education: [
    { key: 'education_type', label: 'Education type', type: 'select',
      options: ['childcare', 'primary', 'secondary', 'tertiary', 'mixed'] },
    { key: 'classroom_count', label: 'Classroom count', type: 'integer', min: 0 },
    { key: 'library_count', label: 'Library count', type: 'integer', min: 0 },
    { key: 'staffroom_count', label: 'Staffroom count', type: 'integer', min: 0 },
    { key: 'hall_gym_count', label: 'Hall / gym count', type: 'integer', min: 0 },
    { key: 'holiday_clean_required', label: 'Holiday clean required', type: 'boolean' },
    { key: 'term_time_only', label: 'Term-time only', type: 'boolean' },
  ],
  medical: [
    { key: 'medical_type', label: 'Medical type', type: 'select',
      options: ['gp_clinic', 'dental', 'specialist', 'allied_health', 'imaging', 'day_surgery', 'other'] },
    { key: 'treatment_room_count', label: 'Treatment room count', type: 'integer', min: 0 },
    { key: 'waiting_area_size', label: 'Waiting area size', type: 'select',
      options: ['small', 'medium', 'large'] },
    { key: 'patient_throughput', label: 'Patient throughput', type: 'select',
      options: ['low', 'medium', 'high'] },
    { key: 'high_touch_disinfection_level', label: 'High-touch disinfection level', type: 'select',
      options: ['standard', 'enhanced', 'clinical'] },
    { key: 'clinical_waste_present', label: 'Clinical waste present', type: 'boolean' },
    { key: 'sharps_present', label: 'Sharps present', type: 'boolean' },
    { key: 'between_patient_cleaning_required', label: 'Between-patient cleaning required', type: 'boolean' },
  ],
  industrial: [
    { key: 'industrial_type', label: 'Industrial type', type: 'select',
      options: ['warehouse', 'manufacturing', 'mechanical_workshop', 'food_production', 'logistics', 'other'] },
    { key: 'warehouse_area_m2', label: 'Warehouse area (m²)', type: 'number', min: 0 },
    { key: 'workshop_area_m2', label: 'Workshop area (m²)', type: 'number', min: 0 },
    { key: 'loading_dock_count', label: 'Loading dock count', type: 'integer', min: 0 },
    { key: 'machinery_wipe_required', label: 'Machinery wipe required', type: 'boolean' },
    { key: 'dust_level', label: 'Dust level', type: 'select',
      options: ['low', 'medium', 'high'] },
    { key: 'grease_level', label: 'Grease level', type: 'select',
      options: ['low', 'medium', 'high'] },
    { key: 'scrubber_required', label: 'Scrubber required', type: 'boolean' },
    { key: 'site_induction_required', label: 'Site induction required', type: 'boolean' },
  ],
  mixed_use: [
    { key: 'tenant_mix', label: 'Tenant mix', type: 'textarea',
      placeholder: 'e.g. ground-floor retail + upper-floor offices' },
    { key: 'shared_areas', label: 'Shared common areas', type: 'textarea',
      placeholder: 'Lobbies, stairs, restrooms, carpark, etc.' },
  ],
  custom: [
    { key: 'custom_notes', label: 'Custom notes', type: 'textarea' },
  ],
}

// ── Time / pricing assumption defaults ─────────────────────────────
// Seed values for the scope builder. Operator may override per-row on
// commercial_scope_items.unit_minutes / production_rate.

// Production rates in m² per hour, keyed by surface + traffic.
export const PRODUCTION_RATE_DEFAULTS = {
  carpet:     { low: 400, medium: 300, high: 250 },
  hard_floor: { low: 500, medium: 400, high: 320 },
} as const

// Unit-minute defaults (minutes per fixture/action).
export const UNIT_MINUTE_DEFAULTS: Record<string, number> = {
  bathroom_clean: 6,
  kitchen_clean: 4,
  urinal: 2,
  shower: 5,
  basin: 1.5,
  desk_wipe: 1,
  toilet_clean: 4,
}

// Sector multiplier — total labour time multiplier by sector category.
// Medical is slower because of protocol / PPE / disinfection overhead;
// industrial slightly slower due to access + safety; education is
// roughly office + a small uplift for heavier use.
export const SECTOR_MULTIPLIER: Record<SectorCategory, number> = {
  office: 1.00,
  education: 1.05,
  medical: 1.20,
  industrial: 1.15,
  mixed_use: 1.05,
  custom: 1.00,
}

// Traffic multiplier applied on top of sector multiplier.
export const TRAFFIC_MULTIPLIER: Record<TrafficLevel, number> = {
  low: 1.00,
  medium: 1.05,
  high: 1.10,
}

// ── Small helpers ──────────────────────────────────────────────────

export function marginTierLabel(tier: MarginTier): string {
  return MARGIN_TIERS[tier].label
}

export function sectorFieldsFor(sector: SectorCategory): readonly SectorFieldDef[] {
  return SECTOR_FIELD_PACKS[sector]
}

export function isSectorCategory(v: unknown): v is SectorCategory {
  return v === 'office' || v === 'education' || v === 'medical'
      || v === 'industrial' || v === 'mixed_use' || v === 'custom'
}

export function isMarginTier(v: unknown): v is MarginTier {
  return v === 'win_the_work' || v === 'standard' || v === 'premium' || v === 'specialist'
}

// ── Commercial pricing preview ─────────────────────────────────────
// Pure function that turns the structured commercial quote data
// (universal details + scope rows) into hours, labour cost, and a
// suggested sell price. Used by the CommercialPricingPreview component
// inside the quote form; computed values are also persisted back to
// commercial_quote_details (estimated_service_hours, estimated_weekly_
// hours, estimated_monthly_hours) on save.

export const WEEKS_PER_MONTH = 4.33

// Default labour cost basis ($/hr) when the operator hasn't set one.
export const DEFAULT_LABOUR_COST_BASIS = 45

// How many times a given scope frequency repeats per week. `per_visit`
// is handled specially (multiplied by visits_per_week); `as_required`
// contributes nothing to the recurring estimate.
const FREQ_PER_WEEK: Record<Exclude<ScopeFrequency, 'per_visit'>, number> = {
  daily:       7,
  weekly:      1,
  fortnightly: 0.5,
  monthly:     1 / WEEKS_PER_MONTH,
  quarterly:   1 / (WEEKS_PER_MONTH * 3),
  six_monthly: 1 / (WEEKS_PER_MONTH * 6),
  annual:      1 / 52,
  as_required: 0,
}

// Narrowed inputs the preview consumes. UI form shapes can adapt to
// these by passing `null` or empty strings where data is missing.
export interface CommercialPreviewDetails {
  sector_category: SectorCategory | '' | null
  traffic_level: TrafficLevel | '' | null
  selected_margin_tier: MarginTier | '' | null
  labour_cost_basis: number | null   // $/hr
  service_days: string[] | null
}

export interface CommercialPreviewScopeRow {
  included: boolean
  frequency: ScopeFrequency | '' | null
  quantity_value: number | null
  unit_minutes: number | null
  production_rate: number | null
}

export interface CommercialPreview {
  // Inputs that shaped the preview (useful for UI transparency)
  visits_per_week: number
  sector_multiplier: number
  traffic_multiplier: number
  margin_tier: MarginTier | null
  margin_default: number | null   // e.g. 0.25 for standard
  labour_cost_basis: number       // $/hr actually used (after default fallback)

  // Computed hours
  base_weekly_hours: number       // pre-multiplier
  estimated_weekly_hours: number  // post sector/traffic multipliers
  estimated_monthly_hours: number // weekly × WEEKS_PER_MONTH
  estimated_service_hours: number // per single visit

  // Computed cost + price
  estimated_monthly_cost: number
  estimated_monthly_sell_price: number
  estimated_weekly_sell_price: number
  estimated_per_visit_sell_price: number

  // Diagnostics
  included_scope_rows: number
  incomplete_scope_rows: number
  warnings: string[]
}

function visitsPerWeek(serviceDays: string[] | null | undefined): number {
  if (!serviceDays || serviceDays.length === 0) return 1
  return serviceDays.length
}

export function computeCommercialPreview(
  details: CommercialPreviewDetails,
  scope: readonly CommercialPreviewScopeRow[],
): CommercialPreview {
  const visits_per_week = visitsPerWeek(details.service_days)
  const sector_multiplier = details.sector_category
    ? SECTOR_MULTIPLIER[details.sector_category as SectorCategory]
    : 1.00
  const traffic_multiplier = details.traffic_level
    ? TRAFFIC_MULTIPLIER[details.traffic_level as TrafficLevel]
    : 1.00
  const margin_tier = (details.selected_margin_tier || null) as MarginTier | null
  const margin_default = margin_tier ? MARGIN_TIERS[margin_tier].default : null
  const labour_cost_basis = details.labour_cost_basis && details.labour_cost_basis > 0
    ? details.labour_cost_basis
    : DEFAULT_LABOUR_COST_BASIS

  // Walk the scope and accumulate weekly minutes.
  // Priority rule: if unit_minutes is set, use that (quantity × unit_minutes).
  //                otherwise, use quantity / production_rate × 60.
  //                if neither, the row is incomplete and skipped.
  let base_weekly_minutes = 0
  let included_scope_rows = 0
  let incomplete_scope_rows = 0

  for (const row of scope) {
    if (!row.included) continue
    if (!row.quantity_value || row.quantity_value <= 0) continue

    let minutes_per_execution: number | null = null
    if (row.unit_minutes != null && row.unit_minutes > 0) {
      minutes_per_execution = row.quantity_value * row.unit_minutes
    } else if (row.production_rate != null && row.production_rate > 0) {
      minutes_per_execution = (row.quantity_value / row.production_rate) * 60
    }

    if (minutes_per_execution == null) {
      incomplete_scope_rows++
      continue
    }

    // Frequency → executions per week.
    let executions_per_week: number
    if (!row.frequency || row.frequency === 'per_visit') {
      executions_per_week = visits_per_week
    } else {
      executions_per_week = FREQ_PER_WEEK[row.frequency]
      if (executions_per_week === 0) continue // as_required: not recurring
    }

    base_weekly_minutes += minutes_per_execution * executions_per_week
    included_scope_rows++
  }

  const base_weekly_hours = base_weekly_minutes / 60
  const estimated_weekly_hours = base_weekly_hours * sector_multiplier * traffic_multiplier
  const estimated_monthly_hours = estimated_weekly_hours * WEEKS_PER_MONTH
  const estimated_service_hours = visits_per_week > 0
    ? estimated_weekly_hours / visits_per_week
    : 0

  const estimated_monthly_cost = estimated_monthly_hours * labour_cost_basis
  const estimated_monthly_sell_price = margin_default != null && estimated_monthly_cost > 0
    ? estimated_monthly_cost / (1 - margin_default)
    : 0
  const estimated_weekly_sell_price = estimated_monthly_sell_price / WEEKS_PER_MONTH
  const estimated_per_visit_sell_price = visits_per_week > 0
    ? estimated_weekly_sell_price / visits_per_week
    : 0

  const warnings: string[] = []
  if (included_scope_rows === 0) {
    warnings.push('No complete scope rows yet — add at least one row with a quantity and either unit minutes or a production rate.')
  }
  if (incomplete_scope_rows > 0) {
    warnings.push(
      `${incomplete_scope_rows} scope row${incomplete_scope_rows === 1 ? ' is' : 's are'} missing time data and skipped.`,
    )
  }
  if (!margin_tier) {
    warnings.push('Pick a margin tier to see an estimated sell price.')
  }
  if (!details.sector_category) {
    warnings.push('Pick a sector category to apply the sector multiplier.')
  }

  return {
    visits_per_week,
    sector_multiplier,
    traffic_multiplier,
    margin_tier,
    margin_default,
    labour_cost_basis,
    base_weekly_hours,
    estimated_weekly_hours,
    estimated_monthly_hours,
    estimated_service_hours,
    estimated_monthly_cost,
    estimated_monthly_sell_price,
    estimated_weekly_sell_price,
    estimated_per_visit_sell_price,
    included_scope_rows,
    incomplete_scope_rows,
    warnings,
  }
}
