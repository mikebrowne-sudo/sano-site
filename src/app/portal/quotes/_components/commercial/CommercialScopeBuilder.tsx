'use client'

import { ArrowDown, ArrowUp, Plus, Sparkles, Trash2 } from 'lucide-react'
import type {
  CommercialScopeItem,
  ScopeFrequency,
  QuantityType,
  ScopeInputMode,
} from '@/lib/commercialQuote'
import type { CommercialScopeItemInput } from '@/app/portal/quotes/_actions-commercial'
import { stampOfficeTemplate } from '@/lib/commercialOfficeTemplate'

// ── Form-row type ──────────────────────────────────────────────────

// Numeric fields held as strings; converted on submit. `id` is present
// for existing rows so the server can UPDATE rather than INSERT, and a
// UI-only `_key` keeps React happy when reordering new rows.
//
// Phase 1: input_mode locks which fields the operator can edit, and
// which fields the preview / save include. UI-only for this phase —
// derived on hydrate, applied at save. Not persisted to DB yet.
// TODO: persist input_mode in DB (Phase 2)
export interface CommercialScopeFormRow {
  _key: string
  id?: string
  input_mode: ScopeInputMode
  area_type: string
  task_group: string
  task_name: string
  frequency: ScopeFrequency | ''
  quantity_type: QuantityType | ''
  quantity_value: string
  unit_minutes: string
  production_rate: string
  included: boolean
  notes: string
}

let _scopeKeyCounter = 0
function newScopeKey(): string {
  _scopeKeyCounter += 1
  return `scope-${Date.now()}-${_scopeKeyCounter}`
}

export function emptyScopeRow(): CommercialScopeFormRow {
  return {
    _key: newScopeKey(),
    input_mode: 'measured',
    area_type: '',
    task_group: '',
    task_name: '',
    frequency: '',
    quantity_type: '',
    quantity_value: '',
    unit_minutes: '',
    production_rate: '',
    included: true,
    notes: '',
  }
}

// Phase 1 hydration heuristic — kept as a defensive fallback only.
// Phase 2 persists input_mode in the DB (NOT NULL DEFAULT 'measured').
// This helper is used when a row somehow arrives without input_mode set
// (e.g. data written by an older client, or a local environment that
// hasn't run the Phase 2 SQL migration yet).
//
// Rules (unchanged from Phase 1):
//   - unit_minutes set            → measured
//   - only production_rate set    → time_based (legacy mapping; value not converted)
//   - both set or neither set     → measured (safe default)
function inferInputMode(row: CommercialScopeItem): ScopeInputMode {
  const hasUnitMins = row.unit_minutes != null && row.unit_minutes > 0
  const hasRate     = row.production_rate != null && row.production_rate > 0
  if (hasUnitMins) return 'measured'
  if (!hasUnitMins && hasRate) return 'time_based'
  return 'measured'
}

export function hydrateScopeRows(
  rows: CommercialScopeItem[] | null | undefined,
): CommercialScopeFormRow[] {
  if (!rows || rows.length === 0) return []
  const toStr = (n: number | null) => (n != null ? String(n) : '')
  return [...rows]
    .sort((a, b) => a.display_order - b.display_order)
    .map((r) => ({
      _key: r.id,
      id: r.id,
      // Phase 2: prefer the persisted input_mode. Fall back to the Phase 1
      // heuristic only when the field is missing (pre-migration rows or
      // data written by an older client).
      input_mode: r.input_mode ?? inferInputMode(r),
      area_type: r.area_type ?? '',
      task_group: r.task_group ?? '',
      task_name: r.task_name,
      frequency: (r.frequency as ScopeFrequency | null) ?? '',
      quantity_type: (r.quantity_type as QuantityType | null) ?? '',
      quantity_value: toStr(r.quantity_value),
      unit_minutes: toStr(r.unit_minutes),
      production_rate: toStr(r.production_rate),
      included: r.included,
      notes: r.notes ?? '',
    }))
}

function toNum(v: string): number | null {
  if (v.trim() === '') return null
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

// Form rows → payload for saveCommercialScope / createQuote's commercial_scope.
// Also filters out rows that have neither an id nor a task_name (fully empty
// rows from the user clicking Add but not typing anything).
//
// Phase 1 save-time field nulling:
//   measured   → keep quantity + unit_minutes; null production_rate
//   time_based → force quantity_value = 1; null quantity_type + production_rate;
//                keep unit_minutes ("Time per visit (mins)")
// Form state keeps all typed values (non-destructive mode switching);
// this function applies the lock when persisting.
export function toScopeItemsInput(rows: CommercialScopeFormRow[]): CommercialScopeItemInput[] {
  return rows
    .filter((r) => r.task_name.trim() !== '' || r.id)
    .map((r, idx) => {
      const base = {
        ...(r.id ? { id: r.id } : {}),
        area_type: emptyToNull(r.area_type),
        task_group: emptyToNull(r.task_group),
        task_name: r.task_name.trim(),
        frequency: (r.frequency || null) as ScopeFrequency | null,
        included: r.included,
        notes: emptyToNull(r.notes),
        display_order: idx,
      }
      if (r.input_mode === 'time_based') {
        return {
          ...base,
          input_mode: 'time_based',
          quantity_type: null,
          quantity_value: 1,
          unit_minutes: toNum(r.unit_minutes),
          production_rate: null,
        }
      }
      // measured
      return {
        ...base,
        input_mode: 'measured',
        quantity_type: (r.quantity_type || null) as QuantityType | null,
        quantity_value: toNum(r.quantity_value),
        unit_minutes: toNum(r.unit_minutes),
        production_rate: null,
      }
    })
}

function emptyToNull(v: string): string | null {
  const t = v.trim()
  return t === '' ? null : t
}

// Row-level guidance string for the operator. Returns null when the
// row is OK for its active mode, or a short sentence when it's not.
// Non-blocking — save still works; the pricing preview skips the row.
// Only surfaces a warning for rows the operator has committed to
// (has a task_name AND is included) so blank rows aren't noisy.
function rowModeWarning(row: CommercialScopeFormRow): string | null {
  if (!row.included) return null
  if (row.task_name.trim() === '') return null
  const hasUnitMins = row.unit_minutes.trim() !== ''
  const hasQty      = row.quantity_value.trim() !== ''
  if (row.input_mode === 'time_based') {
    if (!hasUnitMins) return 'Enter time per visit to include in pricing.'
    return null
  }
  // measured
  if (!hasQty || !hasUnitMins) {
    return 'Complete quantity and unit minutes to include in pricing.'
  }
  return null
}

// ── Dropdown options ───────────────────────────────────────────────

const FREQ_OPTIONS: readonly { value: ScopeFrequency; label: string }[] = [
  { value: 'per_visit',   label: 'Per visit' },
  { value: 'daily',       label: 'Daily' },
  { value: 'weekly',      label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly',     label: 'Monthly' },
  { value: 'quarterly',   label: 'Quarterly' },
  { value: 'six_monthly', label: 'Six-monthly' },
  { value: 'annual',      label: 'Annual' },
  { value: 'as_required', label: 'As required' },
]

const QTY_OPTIONS: readonly { value: QuantityType; label: string }[] = [
  { value: 'none',          label: '—' },
  { value: 'area_m2',       label: 'Area (m²)' },
  { value: 'fixture_count', label: 'Fixture count' },
  { value: 'linear_m',      label: 'Linear metres' },
  { value: 'time_minutes',  label: 'Time (minutes)' },
]

// ── Component ──────────────────────────────────────────────────────

export function CommercialScopeBuilder({
  rows,
  onChange,
  disabled = false,
}: {
  rows: CommercialScopeFormRow[]
  onChange: (next: CommercialScopeFormRow[]) => void
  disabled?: boolean
}) {
  function addRow() {
    onChange([...rows, emptyScopeRow()])
  }

  // Phase 4A — stamp the Commercial Office template. Replaces the
  // current row set. When rows are already present, confirms first so
  // in-progress work is not wiped accidentally. Fresh _key generated
  // per row so there is no collision with any existing React state.
  function applyOfficeTemplate() {
    if (rows.length > 0) {
      const confirmed = window.confirm(
        'Apply the office template? This replaces all current scope rows.',
      )
      if (!confirmed) return
    }
    const stamped = stampOfficeTemplate().map((row) => ({
      ...row,
      _key: newScopeKey(),
    }))
    onChange(stamped)
  }

  function removeAt(idx: number) {
    onChange(rows.filter((_, i) => i !== idx))
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    const next = rows.slice()
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    onChange(next)
  }

  function moveDown(idx: number) {
    if (idx === rows.length - 1) return
    const next = rows.slice()
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    onChange(next)
  }

  function updateRow(idx: number, patch: Partial<CommercialScopeFormRow>) {
    const next = rows.slice()
    next[idx] = { ...next[idx], ...patch }
    onChange(next)
  }

  return (
    <section className="rounded-lg border border-sage-100 bg-white p-4">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-sage-800 uppercase tracking-wide">Scope of work</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={applyOfficeTemplate}
            disabled={disabled}
            title="Replace the current scope rows with the Commercial Office template."
            className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-600 bg-white border border-sage-200 hover:bg-sage-50 rounded-lg px-3 py-1.5 disabled:opacity-50"
          >
            <Sparkles size={14} /> Apply office template
          </button>
          <button
            type="button"
            onClick={addRow}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-700 bg-sage-50 hover:bg-sage-100 border border-sage-200 rounded-lg px-3 py-1.5 disabled:opacity-50"
          >
            <Plus size={14} /> Add scope row
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-sage-500 italic">
          No scope rows yet. Click <strong>Add scope row</strong> to capture an area, task, frequency, and time assumption.
        </p>
      ) : (
        <ol className="space-y-3">
          {rows.map((row, idx) => (
            <li
              key={row._key}
              className={`rounded-lg border p-3 ${
                row.included ? 'border-sage-200 bg-white' : 'border-sage-100 bg-sage-50/50'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => moveUp(idx)}
                    disabled={disabled || idx === 0}
                    className="text-sage-400 hover:text-sage-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Move up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={disabled || idx === rows.length - 1}
                    className="text-sage-400 hover:text-sage-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Move down"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <RowText
                      label="Area"
                      value={row.area_type}
                      onChange={(v) => updateRow(idx, { area_type: v })}
                      placeholder="e.g. Ground floor offices"
                      disabled={disabled}
                    />
                    <RowText
                      label="Task group"
                      value={row.task_group}
                      onChange={(v) => updateRow(idx, { task_group: v })}
                      placeholder="e.g. Floor care"
                      disabled={disabled}
                    />
                    <RowText
                      label="Task"
                      value={row.task_name}
                      onChange={(v) => updateRow(idx, { task_name: v })}
                      placeholder="e.g. Vacuum carpet"
                      disabled={disabled}
                      required
                    />
                  </div>

                  {/* Mode toggle — locks which inputs the operator can edit. */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-sage-600">Input mode</span>
                      <div className="inline-flex rounded-lg border border-sage-200 bg-sage-50 p-0.5">
                        <button
                          type="button"
                          onClick={() => updateRow(idx, { input_mode: 'measured' })}
                          disabled={disabled}
                          className={
                            row.input_mode === 'measured'
                              ? 'px-3 py-1 rounded-md text-xs font-semibold bg-white text-sage-800 shadow-sm'
                              : 'px-3 py-1 rounded-md text-xs font-medium text-sage-600 hover:text-sage-800'
                          }
                        >
                          Measured
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRow(idx, { input_mode: 'time_based' })}
                          disabled={disabled}
                          className={
                            row.input_mode === 'time_based'
                              ? 'px-3 py-1 rounded-md text-xs font-semibold bg-white text-sage-800 shadow-sm'
                              : 'px-3 py-1 rounded-md text-xs font-medium text-sage-600 hover:text-sage-800'
                          }
                        >
                          Time-based
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-sage-500">
                      {row.input_mode === 'measured'
                        ? 'Use for floors and counted items (m² or quantities).'
                        : 'Use for general tasks (fixed time per visit).'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <RowSelect
                      label="Frequency"
                      value={row.frequency}
                      onChange={(v) => updateRow(idx, { frequency: v as ScopeFrequency | '' })}
                      options={[{ value: '', label: '—' }, ...FREQ_OPTIONS]}
                      disabled={disabled}
                    />

                    {row.input_mode === 'measured' ? (
                      <>
                        <RowSelect
                          label="Quantity type"
                          value={row.quantity_type}
                          onChange={(v) => updateRow(idx, { quantity_type: v as QuantityType | '' })}
                          options={[{ value: '', label: '—' }, ...QTY_OPTIONS]}
                          disabled={disabled}
                        />
                        <RowNumber
                          label="Quantity"
                          value={row.quantity_value}
                          onChange={(v) => updateRow(idx, { quantity_value: v })}
                          disabled={disabled}
                        />
                        <RowNumber
                          label="Unit mins"
                          value={row.unit_minutes}
                          onChange={(v) => updateRow(idx, { unit_minutes: v })}
                          disabled={disabled}
                        />
                      </>
                    ) : (
                      <div className="sm:col-span-3">
                        <RowNumber
                          label="Time per visit (mins)"
                          value={row.unit_minutes}
                          onChange={(v) => updateRow(idx, { unit_minutes: v })}
                          disabled={disabled}
                        />
                      </div>
                    )}
                  </div>

                  {/* Guidance (non-blocking) — flag rows that are incomplete for
                      their active mode so they're obvious to the operator but
                      the save still works. Pricing preview already skips them. */}
                  {(() => {
                    const warning = rowModeWarning(row)
                    if (!warning) return null
                    return (
                      <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                        <span aria-hidden="true">⚠</span>
                        <span>{warning}</span>
                      </div>
                    )
                  })()}

                  <RowText
                    label="Notes"
                    value={row.notes}
                    onChange={(v) => updateRow(idx, { notes: v })}
                    placeholder="Optional"
                    disabled={disabled}
                  />

                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-sm text-sage-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={row.included}
                        onChange={(e) => updateRow(idx, { included: e.target.checked })}
                        disabled={disabled}
                        className="rounded border-sage-300 text-sage-600 focus:ring-sage-500"
                      />
                      <span>Included</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeAt(idx)}
                      disabled={disabled}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                      aria-label="Remove scope row"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-3 text-xs text-sage-500">
        <em>Measured</em> multiplies a quantity by unit minutes (e.g. 8 toilets × 6 min).
        <em> Time-based</em> uses a single fixed time per visit (e.g. 20 min for dusting).
        Pick the mode per row — inactive fields are ignored by pricing and cleared when saved.
      </p>
    </section>
  )
}

// ── Row-scoped small inputs ────────────────────────────────────────

function RowText({
  label, value, onChange, placeholder, disabled, required,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; disabled?: boolean; required?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-sage-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-sage-200 px-2.5 py-1.5 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm disabled:opacity-50 disabled:bg-sage-50"
      />
    </label>
  )
}

function RowNumber({
  label, value, onChange, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-sage-600 mb-1">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step="any"
        disabled={disabled}
        className="w-full rounded-lg border border-sage-200 px-2.5 py-1.5 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm disabled:opacity-50 disabled:bg-sage-50"
      />
    </label>
  )
}

function RowSelect({
  label, value, onChange, options, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void
  options: readonly { value: string; label: string }[]; disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-sage-600 mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-sage-200 px-2.5 py-1.5 text-sage-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm disabled:opacity-50 disabled:bg-sage-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}
