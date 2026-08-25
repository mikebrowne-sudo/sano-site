'use client'

import {
  type CommercialQuoteDetails,
  type SectorCategory,
  type OccupancyLevel,
  type TrafficLevel,
  type ConsumablesBy,
  type BuildingType,
  type MarginTier,
  type ContractTerm,
  type CleaningStandard,
  MARGIN_TIERS,
  SECTOR_FIELD_PACKS,
  isSectorCategory,
  isMarginTier,
  isContractTerm,
  isCleaningStandard,
  parseManualScopeSections,
} from '@/lib/commercialQuote'
import { Plus, Trash2 } from 'lucide-react'
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

  // Phase 5A — tender fields, less the contact / billing / reference
  // group which Phase 5D promoted to the universal ContactBillingSection
  // (lives on the quotes table, applies to all categories).
  contract_term: ContractTerm | ''
  notice_period_days: string
  service_start_date: string

  // One-off clean (single visit) rather than ongoing recurring
  // service. Drives the proposal wording; recurring is the default.
  is_one_off: boolean

  // Free-text scope sections for the proposal Scope of Works page.
  // Items are held as one raw textarea string per section (one item
  // per line) so typing feels natural; split into an array on save.
  manual_scope_sections: ManualScopeFormSection[]

  cleaning_standard: CleaningStandard | ''

  security_sensitive: boolean
  induction_required: boolean
  restricted_areas: boolean
  restricted_areas_notes: string
}

/** Editor shape for one manual scope section. `itemsText` is the raw
 *  textarea value — one scope item per line. Kept as a single string
 *  rather than a string[] so the operator can type, paste and reorder
 *  lines without the editor fighting them on every keystroke. */
export interface ManualScopeFormSection {
  _key: string
  title: string
  itemsText: string
}

let _manualScopeKeyCounter = 0
function newManualScopeKey(): string {
  _manualScopeKeyCounter += 1
  return `manual-scope-${_manualScopeKeyCounter}`
}

export function emptyManualScopeSection(): ManualScopeFormSection {
  return { _key: newManualScopeKey(), title: '', itemsText: '' }
}

/** Textarea string — one item per line — to the stored items array.
 *  Blank lines are dropped, and any bullet character the operator
 *  pasted in ("- ", "• ", "* ") is stripped, since the proposal
 *  renders its own list markers. */
export function manualScopeItemsFromText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*·]\s*/, '').trim())
    .filter(Boolean)
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
    // Phase 5A (commercial-only tender fields)
    contract_term: '',
    notice_period_days: '',
    service_start_date: '',
    is_one_off: false,
    manual_scope_sections: [],
    cleaning_standard: '',
    security_sensitive: false,
    induction_required: false,
    restricted_areas: false,
    restricted_areas_notes: '',
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
    // Phase 5A — commercial-only tender fields. Defensive against
    // pre-migration rows that may not yet carry these columns.
    contract_term:          isContractTerm(row.contract_term) ? row.contract_term : '',
    notice_period_days:     toStr(row.notice_period_days),
    service_start_date:     row.service_start_date     ?? '',
    is_one_off:             row.is_one_off             ?? false,
    manual_scope_sections:  parseManualScopeSections(row.manual_scope_sections).map((m) => ({
      _key: newManualScopeKey(),
      title: m.title,
      itemsText: m.items.join('\n'),
    })),
    cleaning_standard:      isCleaningStandard(row.cleaning_standard) ? row.cleaning_standard : '',
    security_sensitive:     row.security_sensitive     ?? false,
    induction_required:     row.induction_required     ?? false,
    restricted_areas:       row.restricted_areas       ?? false,
    restricted_areas_notes: row.restricted_areas_notes ?? '',
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

    // Phase 5A — commercial-only tender fields. Phase 5D moved
    // contact / billing / reference up to the universal quotes
    // table (and ContactBillingSection), so they no longer flow
    // through this commercial-details payload.
    // A one-off clean has no contract term or notice period. The form
    // hides those inputs when the flag is set, but stale values can
    // still be sitting in state from before it was ticked — null them
    // so the stored row can't contradict the one-off wording.
    contract_term:          state.is_one_off ? null : (state.contract_term || null),
    notice_period_days:     state.is_one_off ? null : toInt(state.notice_period_days),
    service_start_date:     emptyToNull(state.service_start_date),
    is_one_off:             state.is_one_off,
    // Drop sections with no items — a heading with nothing under it
    // would render as an empty block on the proposal.
    manual_scope_sections:  state.manual_scope_sections
      .map((m) => ({ title: m.title.trim(), items: manualScopeItemsFromText(m.itemsText) }))
      .filter((m) => m.items.length > 0),
    cleaning_standard:      state.cleaning_standard || null,
    security_sensitive:     state.security_sensitive,
    induction_required:     state.induction_required,
    restricted_areas:       state.restricted_areas,
    restricted_areas_notes: emptyToNull(state.restricted_areas_notes),
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

// ── Phase 5A enum options ──────────────────────────────────────────

const CONTRACT_TERM_OPTIONS: readonly { value: ContractTerm; label: string }[] = [
  { value: '3_months',  label: '3 months' },
  { value: '6_months',  label: '6 months' },
  { value: '12_months', label: '12 months' },
  { value: 'open',      label: 'Open / no fixed term' },
]

const CLEANING_STANDARD_OPTIONS: readonly { value: CleaningStandard; label: string }[] = [
  { value: 'maintenance',       label: 'Maintenance — baseline standard' },
  { value: 'high_presentation', label: 'High presentation — visible spaces prioritised' },
  { value: 'premium',           label: 'Premium — top tier finish' },
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

  // ── Manual scope section handlers ──
  function addManualScope() {
    set('manual_scope_sections', [...value.manual_scope_sections, emptyManualScopeSection()])
  }

  function removeManualScope(index: number) {
    set('manual_scope_sections', value.manual_scope_sections.filter((_, i) => i !== index))
  }

  function updateManualScope(index: number, patch: Partial<ManualScopeFormSection>) {
    set(
      'manual_scope_sections',
      value.manual_scope_sections.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    )
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

      {/* Phase 5D — the previous "Contact details" Fieldset block was
           removed from here. Contact / accounts / client-reference
           inputs now live in the universal ContactBillingSection at
           the top of the parent form (residential + commercial both). */}

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

        {/* Phase 5A — service level + PO/reference + contract terms */}
        <div className="mt-6 pt-5 border-t border-sage-100">
          <div className="mb-4">
            <Select
              label="Cleaning standard"
              value={value.cleaning_standard}
              onChange={(v) => set('cleaning_standard', v as CleaningStandard | '')}
              options={[{ value: '', label: '—' }, ...CLEANING_STANDARD_OPTIONS]}
              disabled={disabled}
            />
          </div>

          {/* One-off vs recurring. Most commercial work is ongoing, so
               recurring stays the default and this is an opt-in. When
               ticked, the proposal drops all cadence / contract-term /
               monthly-fee wording and the contract fields below are
               hidden — they don't apply to a single visit. */}
          <div className="mb-4">
            <CheckboxInput
              label="One-off clean (single visit, not ongoing service)"
              checked={value.is_one_off}
              onChange={(v) => set('is_one_off', v)}
              disabled={disabled}
            />
            <p className="mt-1 ml-6 text-sm text-sage-600">
              Changes the proposal wording to a one-off clean and prices it
              as a total service fee instead of a monthly fee.
            </p>
          </div>

          {value.is_one_off ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DateInput
                label="Service date"
                value={value.service_start_date}
                onChange={(v) => set('service_start_date', v)}
                disabled={disabled}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Contract term"
                value={value.contract_term}
                onChange={(v) => set('contract_term', v as ContractTerm | '')}
                options={[{ value: '', label: '—' }, ...CONTRACT_TERM_OPTIONS]}
                disabled={disabled}
              />
              <NumberInput
                label="Notice period (days)"
                value={value.notice_period_days}
                onChange={(v) => set('notice_period_days', v)}
                disabled={disabled}
                integer
                min={0}
              />
              <DateInput
                label="Service start date"
                value={value.service_start_date}
                onChange={(v) => set('service_start_date', v)}
                disabled={disabled}
              />
            </div>
          )}
          {/* Phase 5D — client_reference + requires_po now live in
               the universal ContactBillingSection at the top of the
               parent form. */}
        </div>
      </Fieldset>

      {/* ── 1b. Manual scope sections ─────────────────────────
           Free-text scope that renders on the proposal Scope of Works
           page after the generated (costed) groups. Presentational
           only — nothing here touches pricing or estimated hours. */}
      <Fieldset title="Additional scope (proposal only)">
        <p className="text-sm text-sage-600 mb-4">
          Extra scope to list on the proposal&rsquo;s Scope of Works page, on top of
          the priced scope items. One task per line. These are shown to the
          client but don&rsquo;t affect pricing or estimated hours.
        </p>

        {value.manual_scope_sections.length === 0 ? (
          <p className="text-sm text-sage-500 mb-4">No additional scope sections.</p>
        ) : (
          <div className="space-y-4 mb-4">
            {value.manual_scope_sections.map((section, i) => (
              <div key={section._key} className="rounded-lg border border-sage-100 bg-sage-50/40 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-3">
                    <TextInput
                      label="Section heading"
                      value={section.title}
                      onChange={(v) => updateManualScope(i, { title: v })}
                      placeholder="e.g. Deep clean extras"
                      disabled={disabled}
                    />
                    <TextareaInput
                      label="Scope items (one per line)"
                      value={section.itemsText}
                      onChange={(v) => updateManualScope(i, { itemsText: v })}
                      rows={4}
                      placeholder={'Degrease kitchen extraction filters\nSteam clean upholstered seating\nWash internal glass, both sides'}
                      disabled={disabled}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeManualScope(i)}
                    disabled={disabled}
                    aria-label={`Remove scope section ${i + 1}`}
                    className="mt-7 rounded-lg border border-sage-200 p-2 text-sage-500 hover:text-red-600 hover:border-red-200 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addManualScope}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sage-200 px-3 py-2 text-sm font-semibold text-sage-700 hover:bg-sage-50 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add scope section
        </button>
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

      {/* ── 2b. Site constraints (Phase 5A) ──────────────────────
           Operational flags that drive scheduling, briefing, and
           insurance logic downstream. Sit between site profile and
           the sector pack so the operator captures site-wide
           operational constraints in one place. */}
      <Fieldset title="Site constraints">
        <div className="space-y-2">
          <CheckboxInput
            label="Security-sensitive site (sign-in protocol, rotated keys, restricted hours)"
            checked={value.security_sensitive}
            onChange={(v) => set('security_sensitive', v)}
            disabled={disabled}
          />
          <CheckboxInput
            label="Formal site induction required before first visit"
            checked={value.induction_required}
            onChange={(v) => set('induction_required', v)}
            disabled={disabled}
          />
          <CheckboxInput
            label="Restricted / off-limits areas on site"
            checked={value.restricted_areas}
            onChange={(v) => set('restricted_areas', v)}
            disabled={disabled}
          />
        </div>
        {value.restricted_areas && (
          <div className="mt-4">
            <TextareaInput
              label="Restricted areas — notes"
              value={value.restricted_areas_notes}
              onChange={(v) => set('restricted_areas_notes', v)}
              rows={2}
              placeholder="Where, why, and any access conditions"
              disabled={disabled}
            />
          </div>
        )}
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

function DateInput({
  label, value, onChange, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm disabled:opacity-50 disabled:bg-sage-50"
      />
    </label>
  )
}

function CheckboxInput({
  label, checked, onChange, disabled,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <label className={`flex items-start gap-2.5 text-sm text-sage-800 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-sage-300 text-sage-600 focus:ring-sage-500"
      />
      <span>{label}</span>
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
