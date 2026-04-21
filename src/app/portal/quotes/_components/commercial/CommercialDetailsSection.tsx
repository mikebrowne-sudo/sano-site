'use client'

import {
  type CommercialQuoteDetails,
  type SectorCategory,
  type OccupancyLevel,
  type TrafficLevel,
  type ConsumablesBy,
  type BuildingType,
  type MarginTier,
  MARGIN_TIERS,
  SECTOR_FIELD_PACKS,
  isSectorCategory,
  isMarginTier,
} from '@/lib/commercialQuote'
import type { CommercialDetailsInput } from '@/app/portal/quotes/_actions-commercial'
import { SectorFieldPack } from './SectorFieldPack'

// ── Form-state type ────────────────────────────────────────────────

// Numeric fields are held as strings (HTML inputs are strings) and
// converted to numbers on submit. `sector_fields` is a loose record
// whose shape is defined by SECTOR_FIELD_PACKS[sector_category].
export interface CommercialDetailsFormState {
  sector_category: SectorCategory | ''
  sector_subtype: string
  building_type: BuildingType | ''
  service_days: string[]
  service_window: string
  access_requirements: string
  consumables_by: ConsumablesBy | ''
  occupancy_level: OccupancyLevel | ''
  traffic_level: TrafficLevel | ''

  total_area_m2: string
  carpet_area_m2: string
  hard_floor_area_m2: string
  floor_count: string
  toilets_count: string
  urinals_count: string
  showers_count: string
  basins_count: string
  kitchens_count: string
  desks_count: string
  offices_count: string
  meeting_rooms_count: string
  reception_count: string

  corridors_stairs_notes: string
  external_glass_notes: string
  compliance_notes: string
  assumptions: string
  exclusions: string

  sector_fields: Record<string, unknown>

  selected_margin_tier: MarginTier | ''
  labour_cost_basis: string
}

export function emptyCommercialDetails(): CommercialDetailsFormState {
  return {
    sector_category: '',
    sector_subtype: '',
    building_type: '',
    service_days: [],
    service_window: '',
    access_requirements: '',
    consumables_by: '',
    occupancy_level: '',
    traffic_level: '',
    total_area_m2: '',
    carpet_area_m2: '',
    hard_floor_area_m2: '',
    floor_count: '',
    toilets_count: '',
    urinals_count: '',
    showers_count: '',
    basins_count: '',
    kitchens_count: '',
    desks_count: '',
    offices_count: '',
    meeting_rooms_count: '',
    reception_count: '',
    corridors_stairs_notes: '',
    external_glass_notes: '',
    compliance_notes: '',
    assumptions: '',
    exclusions: '',
    sector_fields: {},
    selected_margin_tier: '',
    labour_cost_basis: '',
  }
}

export function hydrateCommercialDetails(
  row: CommercialQuoteDetails | null,
): CommercialDetailsFormState {
  if (!row) return emptyCommercialDetails()
  const toStr = (n: number | null) => (n != null ? String(n) : '')
  return {
    sector_category: isSectorCategory(row.sector_category) ? row.sector_category : '',
    sector_subtype: row.sector_subtype ?? '',
    building_type: (row.building_type as BuildingType | null) ?? '',
    service_days: row.service_days ?? [],
    service_window: row.service_window ?? '',
    access_requirements: row.access_requirements ?? '',
    consumables_by: (row.consumables_by as ConsumablesBy | null) ?? '',
    occupancy_level: (row.occupancy_level as OccupancyLevel | null) ?? '',
    traffic_level: (row.traffic_level as TrafficLevel | null) ?? '',
    total_area_m2: toStr(row.total_area_m2),
    carpet_area_m2: toStr(row.carpet_area_m2),
    hard_floor_area_m2: toStr(row.hard_floor_area_m2),
    floor_count: toStr(row.floor_count),
    toilets_count: toStr(row.toilets_count),
    urinals_count: toStr(row.urinals_count),
    showers_count: toStr(row.showers_count),
    basins_count: toStr(row.basins_count),
    kitchens_count: toStr(row.kitchens_count),
    desks_count: toStr(row.desks_count),
    offices_count: toStr(row.offices_count),
    meeting_rooms_count: toStr(row.meeting_rooms_count),
    reception_count: toStr(row.reception_count),
    corridors_stairs_notes: row.corridors_stairs_notes ?? '',
    external_glass_notes: row.external_glass_notes ?? '',
    compliance_notes: row.compliance_notes ?? '',
    assumptions: row.assumptions ?? '',
    exclusions: row.exclusions ?? '',
    sector_fields: row.sector_fields ?? {},
    selected_margin_tier: isMarginTier(row.selected_margin_tier) ? row.selected_margin_tier : '',
    labour_cost_basis: toStr(row.labour_cost_basis),
  }
}

function toNumber(v: string): number | null {
  if (v.trim() === '') return null
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}
function toInt(v: string): number | null {
  if (v.trim() === '') return null
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}
function emptyToNull(v: string): string | null {
  const t = v.trim()
  return t === '' ? null : t
}

// Convert form state → shape accepted by saveCommercialDetails /
// createQuote's commercial_details payload. Returns null when the form
// isn't sufficiently filled (no sector picked).
//
// The optional `preview` arg lets the caller include freshly-computed
// hours so they land in the DB. Pass it when saving from the form;
// leave undefined if you only want to convert the raw form state.
export function toCommercialDetailsInput(
  state: CommercialDetailsFormState,
  preview?: {
    estimated_service_hours: number
    estimated_weekly_hours: number
    estimated_monthly_hours: number
  },
): CommercialDetailsInput | null {
  if (!state.sector_category) return null
  return {
    sector_category: state.sector_category,
    sector_subtype: emptyToNull(state.sector_subtype),
    building_type: state.building_type || null,
    service_days: state.service_days.length > 0 ? state.service_days : null,
    service_window: emptyToNull(state.service_window),
    access_requirements: emptyToNull(state.access_requirements),
    consumables_by: state.consumables_by || null,
    occupancy_level: state.occupancy_level || null,
    traffic_level: state.traffic_level || null,
    total_area_m2: toNumber(state.total_area_m2),
    carpet_area_m2: toNumber(state.carpet_area_m2),
    hard_floor_area_m2: toNumber(state.hard_floor_area_m2),
    floor_count: toInt(state.floor_count),
    toilets_count: toInt(state.toilets_count),
    urinals_count: toInt(state.urinals_count),
    showers_count: toInt(state.showers_count),
    basins_count: toInt(state.basins_count),
    kitchens_count: toInt(state.kitchens_count),
    desks_count: toInt(state.desks_count),
    offices_count: toInt(state.offices_count),
    meeting_rooms_count: toInt(state.meeting_rooms_count),
    reception_count: toInt(state.reception_count),
    corridors_stairs_notes: emptyToNull(state.corridors_stairs_notes),
    external_glass_notes: emptyToNull(state.external_glass_notes),
    compliance_notes: emptyToNull(state.compliance_notes),
    assumptions: emptyToNull(state.assumptions),
    exclusions: emptyToNull(state.exclusions),
    sector_fields: state.sector_fields,
    selected_margin_tier: state.selected_margin_tier || null,
    labour_cost_basis: toNumber(state.labour_cost_basis),
    estimated_service_hours: preview?.estimated_service_hours ?? null,
    estimated_weekly_hours: preview?.estimated_weekly_hours ?? null,
    estimated_monthly_hours: preview?.estimated_monthly_hours ?? null,
  }
}

// ── Section component ──────────────────────────────────────────────

const SECTOR_OPTIONS: readonly { value: SectorCategory; label: string }[] = [
  { value: 'office',     label: 'Office' },
  { value: 'education',  label: 'Education' },
  { value: 'medical',    label: 'Medical / Healthcare' },
  { value: 'industrial', label: 'Industrial / Warehouse' },
  { value: 'mixed_use',  label: 'Mixed-use' },
  { value: 'custom',     label: 'Custom' },
]

const BUILDING_OPTIONS: readonly { value: BuildingType; label: string }[] = [
  { value: 'single_tenant', label: 'Single tenant' },
  { value: 'multi_tenant',  label: 'Multi-tenant' },
  { value: 'standalone',    label: 'Standalone' },
  { value: 'retail_strip',  label: 'Retail strip' },
  { value: 'campus',        label: 'Campus' },
  { value: 'other',         label: 'Other' },
]

const SERVICE_DAYS: readonly { value: string; label: string }[] = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
]

const CONSUMABLES_OPTIONS: readonly { value: ConsumablesBy; label: string }[] = [
  { value: 'sano',   label: 'Sano' },
  { value: 'client', label: 'Client' },
  { value: 'shared', label: 'Shared' },
]

const LEVEL_OPTIONS: readonly { value: 'low' | 'medium' | 'high'; label: string }[] = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
]

export function CommercialDetailsSection({
  value,
  onChange,
  disabled = false,
}: {
  value: CommercialDetailsFormState
  onChange: (next: CommercialDetailsFormState) => void
  disabled?: boolean
}) {
  function set<K extends keyof CommercialDetailsFormState>(
    k: K,
    v: CommercialDetailsFormState[K],
  ) {
    onChange({ ...value, [k]: v })
  }

  function toggleServiceDay(day: string) {
    const s = new Set(value.service_days)
    if (s.has(day)) s.delete(day)
    else s.add(day)
    set('service_days', Array.from(s))
  }

  const sectorFields = value.sector_category
    ? SECTOR_FIELD_PACKS[value.sector_category as SectorCategory]
    : []

  return (
    <div className="space-y-6 border border-sage-100 bg-sage-50/40 rounded-xl p-5">
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-semibold text-sage-800">Commercial details</h2>
        <span className="text-xs text-sage-500">Shown because this quote is commercial.</span>
      </div>

      {/* ── 1. Overview ─────────────────────────────────────── */}
      <Fieldset title="Commercial overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Sector category"
            value={value.sector_category}
            onChange={(v) => set('sector_category', v as SectorCategory | '')}
            options={[{ value: '', label: '— select sector —' }, ...SECTOR_OPTIONS]}
            disabled={disabled}
            required
          />
          <TextInput
            label="Sector subtype (optional)"
            value={value.sector_subtype}
            onChange={(v) => set('sector_subtype', v)}
            placeholder="e.g. coworking, community centre"
            disabled={disabled}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 items-end">
          <MarginTierPicker
            value={value.selected_margin_tier}
            onChange={(v) => set('selected_margin_tier', v)}
            disabled={disabled}
          />
          <NumberInput
            label="Labour cost basis ($/hr)"
            value={value.labour_cost_basis}
            onChange={(v) => set('labour_cost_basis', v)}
            disabled={disabled}
            min={0}
          />
        </div>
      </Fieldset>

      {/* ── 2. Site & building profile ───────────────────────── */}
      <Fieldset title="Site & building profile">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Building type"
            value={value.building_type}
            onChange={(v) => set('building_type', v as BuildingType | '')}
            options={[{ value: '', label: '—' }, ...BUILDING_OPTIONS]}
            disabled={disabled}
          />
          <Select
            label="Consumables supplied by"
            value={value.consumables_by}
            onChange={(v) => set('consumables_by', v as ConsumablesBy | '')}
            options={[{ value: '', label: '—' }, ...CONSUMABLES_OPTIONS]}
            disabled={disabled}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Select
            label="Occupancy level"
            value={value.occupancy_level}
            onChange={(v) => set('occupancy_level', v as OccupancyLevel | '')}
            options={[{ value: '', label: '—' }, ...LEVEL_OPTIONS]}
            disabled={disabled}
          />
          <Select
            label="Traffic level"
            value={value.traffic_level}
            onChange={(v) => set('traffic_level', v as TrafficLevel | '')}
            options={[{ value: '', label: '—' }, ...LEVEL_OPTIONS]}
            disabled={disabled}
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold text-sage-800 mb-2">Service days</label>
          <div className="flex flex-wrap gap-2">
            {SERVICE_DAYS.map((d) => {
              const active = value.service_days.includes(d.value)
              return (
                <button
                  key={d.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleServiceDay(d.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-sage-600 text-white'
                      : 'bg-white border border-sage-200 text-sage-700 hover:bg-sage-100'
                  } ${disabled ? 'opacity-50' : ''}`}
                >
                  {d.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <TextInput
            label="Service window"
            value={value.service_window}
            onChange={(v) => set('service_window', v)}
            placeholder="e.g. 17:00–22:00"
            disabled={disabled}
          />
          <TextInput
            label="Access requirements"
            value={value.access_requirements}
            onChange={(v) => set('access_requirements', v)}
            placeholder="e.g. alarm code, swipe card, after-hours contact"
            disabled={disabled}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <NumberInput label="Total area (m²)"     value={value.total_area_m2}      onChange={(v) => set('total_area_m2', v)}      disabled={disabled} min={0} />
          <NumberInput label="Carpet area (m²)"    value={value.carpet_area_m2}     onChange={(v) => set('carpet_area_m2', v)}     disabled={disabled} min={0} />
          <NumberInput label="Hard floor (m²)"     value={value.hard_floor_area_m2} onChange={(v) => set('hard_floor_area_m2', v)} disabled={disabled} min={0} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <NumberInput label="Floors"         value={value.floor_count}        onChange={(v) => set('floor_count', v)}        disabled={disabled} integer min={0} />
          <NumberInput label="Toilets"        value={value.toilets_count}      onChange={(v) => set('toilets_count', v)}      disabled={disabled} integer min={0} />
          <NumberInput label="Urinals"        value={value.urinals_count}      onChange={(v) => set('urinals_count', v)}      disabled={disabled} integer min={0} />
          <NumberInput label="Showers"        value={value.showers_count}      onChange={(v) => set('showers_count', v)}      disabled={disabled} integer min={0} />
          <NumberInput label="Basins"         value={value.basins_count}       onChange={(v) => set('basins_count', v)}       disabled={disabled} integer min={0} />
          <NumberInput label="Kitchens"       value={value.kitchens_count}     onChange={(v) => set('kitchens_count', v)}     disabled={disabled} integer min={0} />
          <NumberInput label="Desks"          value={value.desks_count}        onChange={(v) => set('desks_count', v)}        disabled={disabled} integer min={0} />
          <NumberInput label="Offices"        value={value.offices_count}      onChange={(v) => set('offices_count', v)}      disabled={disabled} integer min={0} />
          <NumberInput label="Meeting rooms"  value={value.meeting_rooms_count} onChange={(v) => set('meeting_rooms_count', v)} disabled={disabled} integer min={0} />
          <NumberInput label="Reception"      value={value.reception_count}    onChange={(v) => set('reception_count', v)}    disabled={disabled} integer min={0} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <TextareaInput
            label="Corridors / stairs notes"
            value={value.corridors_stairs_notes}
            onChange={(v) => set('corridors_stairs_notes', v)}
            rows={2}
            disabled={disabled}
          />
          <TextareaInput
            label="External glass notes"
            value={value.external_glass_notes}
            onChange={(v) => set('external_glass_notes', v)}
            rows={2}
            disabled={disabled}
          />
        </div>
      </Fieldset>

      {/* ── 3. Sector pack ───────────────────────────────────── */}
      {value.sector_category && sectorFields.length > 0 && (
        <Fieldset title={`${labelFor(value.sector_category as SectorCategory)} details`}>
          <SectorFieldPack
            fields={sectorFields}
            values={value.sector_fields}
            onChange={(nextValues) => set('sector_fields', nextValues)}
            disabled={disabled}
          />
        </Fieldset>
      )}

      {/* ── 4. Assumptions / exclusions / compliance ────────── */}
      <Fieldset title="Assumptions, exclusions & compliance">
        <TextareaInput
          label="Assumptions"
          value={value.assumptions}
          onChange={(v) => set('assumptions', v)}
          rows={3}
          placeholder="e.g. Bin liners supplied by client. No window cleaning above 2 m."
          disabled={disabled}
        />
        <div className="mt-4">
          <TextareaInput
            label="Exclusions"
            value={value.exclusions}
            onChange={(v) => set('exclusions', v)}
            rows={3}
            placeholder="e.g. Exterior glass, carpet deep clean, specialist surfaces."
            disabled={disabled}
          />
        </div>
        <div className="mt-4">
          <TextareaInput
            label="Compliance notes"
            value={value.compliance_notes}
            onChange={(v) => set('compliance_notes', v)}
            rows={2}
            placeholder="e.g. Site induction required. HACCP protocol applies in kitchen."
            disabled={disabled}
          />
        </div>
      </Fieldset>
    </div>
  )
}

function labelFor(s: SectorCategory): string {
  return SECTOR_OPTIONS.find((o) => o.value === s)?.label ?? s
}

// ── Shared form primitives (kept local to the commercial section) ──

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-sage-100 bg-white p-4">
      <h3 className="text-sm font-semibold text-sage-800 uppercase tracking-wide mb-4">{title}</h3>
      {children}
    </section>
  )
}

function TextInput({
  label, value, onChange, placeholder, disabled, required,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; disabled?: boolean; required?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm disabled:opacity-50 disabled:bg-sage-50"
      />
    </label>
  )
}

function NumberInput({
  label, value, onChange, disabled, min, max, integer,
}: {
  label: string; value: string; onChange: (v: string) => void
  disabled?: boolean; min?: number; max?: number; integer?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        step={integer ? 1 : 'any'}
        disabled={disabled}
        className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm disabled:opacity-50 disabled:bg-sage-50"
      />
    </label>
  )
}

function TextareaInput({
  label, value, onChange, rows = 3, placeholder, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void
  rows?: number; placeholder?: string; disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm resize-y disabled:opacity-50 disabled:bg-sage-50"
      />
    </label>
  )
}

function Select({
  label, value, onChange, options, disabled, required,
}: {
  label: string; value: string; onChange: (v: string) => void
  options: readonly { value: string; label: string }[]
  disabled?: boolean; required?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm disabled:opacity-50 disabled:bg-sage-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

function MarginTierPicker({
  value, onChange, disabled,
}: {
  value: MarginTier | ''; onChange: (v: MarginTier | '') => void; disabled?: boolean
}) {
  const tiers: MarginTier[] = ['win_the_work', 'standard', 'premium', 'specialist']
  return (
    <div>
      <span className="block text-sm font-semibold text-sage-800 mb-2">Commercial margin tier</span>
      <div className="flex flex-wrap gap-2">
        {tiers.map((t) => {
          const spec = MARGIN_TIERS[t]
          const active = value === t
          const pctRange = `${Math.round(spec.min * 100)}–${Math.round(spec.max * 100)}%`
          return (
            <button
              key={t}
              type="button"
              disabled={disabled}
              onClick={() => onChange(active ? '' : t)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex flex-col items-start gap-0.5 ${
                active
                  ? 'bg-sage-600 text-white'
                  : 'bg-white border border-sage-200 text-sage-700 hover:bg-sage-100'
              } ${disabled ? 'opacity-50' : ''}`}
            >
              <span>{spec.label}</span>
              <span className={`text-[10px] ${active ? 'text-sage-100' : 'text-sage-500'}`}>{pctRange}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
