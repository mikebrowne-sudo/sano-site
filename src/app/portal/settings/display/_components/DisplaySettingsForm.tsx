'use client'

// Phase 2 — Display settings form. One client component, two entity
// sections (Jobs, Quotes), each with list + detail subsections. Pure
// state in React; on save we hand the whole DisplaySettings object to
// the server action, which re-runs validation and persists.

import { useState, useTransition } from 'react'
import {
  JOB_FIELDS, QUOTE_FIELDS, INVOICE_FIELDS, fieldsForContext, sortableKeys, groupableKeys,
  type DisplaySettings, type EntityDisplay, type FieldDef,
} from '@/lib/portal-display-settings'
import { saveDisplaySettings, resetDisplaySettings } from '../_actions'
import { Save, RotateCcw, Check, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

type Banner = { kind: 'ok' | 'error'; text: string } | null

export function DisplaySettingsForm({
  initialSettings,
}: {
  initialSettings: DisplaySettings
}) {
  const [settings, setSettings] = useState<DisplaySettings>(initialSettings)
  const [banner, setBanner] = useState<Banner>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setBanner(null)
    startTransition(async () => {
      const result = await saveDisplaySettings(settings)
      if ('error' in result) {
        setBanner({ kind: 'error', text: result.error })
      } else {
        setSettings(result.settings)
        setBanner({ kind: 'ok', text: 'Display settings saved.' })
      }
    })
  }

  function handleReset() {
    if (!confirm('Reset display settings to the built-in defaults?')) return
    setBanner(null)
    startTransition(async () => {
      const result = await resetDisplaySettings()
      if ('error' in result) {
        setBanner({ kind: 'error', text: result.error })
      } else {
        setSettings(result.settings)
        setBanner({ kind: 'ok', text: 'Display settings reset to defaults.' })
      }
    })
  }

  function updateJobs(next: EntityDisplay) {
    setSettings((s) => ({ ...s, jobs: next }))
  }
  function updateQuotes(next: EntityDisplay) {
    setSettings((s) => ({ ...s, quotes: next }))
  }
  function updateInvoices(next: EntityDisplay) {
    setSettings((s) => ({ ...s, invoices: next }))
  }

  return (
    <div className="space-y-8">
      {banner && (
        <div
          className={clsx(
            'flex items-center gap-2 rounded-lg px-4 py-3 text-sm border',
            banner.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800',
          )}
        >
          {banner.kind === 'ok' ? <Check size={15} /> : <AlertCircle size={15} />}
          {banner.text}
        </div>
      )}

      <EntitySection
        title="Jobs"
        description="How the Jobs list and detail pages display each job."
        defs={JOB_FIELDS}
        value={settings.jobs}
        onChange={updateJobs}
      />

      <EntitySection
        title="Quotes"
        description="How the Quotes list and detail pages display each quote."
        defs={QUOTE_FIELDS}
        value={settings.quotes}
        onChange={updateQuotes}
      />

      <EntitySection
        title="Invoices"
        description="How the Invoices list and detail pages display each invoice."
        defs={INVOICE_FIELDS}
        value={settings.invoices}
        onChange={updateInvoices}
      />

      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <RotateCcw size={14} />
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm shadow-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          <Save size={15} />
          {isPending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  )
}

// ── Entity section ─────────────────────────────────────────────────

function EntitySection({
  title, description, defs, value, onChange,
}: {
  title: string
  description: string
  defs: readonly FieldDef[]
  value: EntityDisplay
  onChange: (next: EntityDisplay) => void
}) {
  const listFields = fieldsForContext(defs, 'list')
  const detailFields = fieldsForContext(defs, 'detail')
  const sortable = sortableKeys(defs)
  const groupable = groupableKeys(defs)

  function setListVisible(keys: string[]) {
    const next = { ...value, list: { ...value.list, visibleFields: keys } }
    // Re-validate primary/secondary against the new visible set.
    if (!keys.includes(next.list.primaryField)) next.list.primaryField = keys[0] ?? next.list.primaryField
    if (!keys.includes(next.list.secondaryField)) next.list.secondaryField = keys[1] ?? keys[0] ?? next.list.secondaryField
    onChange(next)
  }
  function setDetailVisible(keys: string[]) {
    onChange({ ...value, detail: { visibleFields: keys } })
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <header className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-sage-800">{title}</h2>
        <p className="text-xs text-sage-500 mt-1">{description}</p>
      </header>

      {/* List view subsection */}
      <div className="px-6 py-5 border-b border-gray-100 space-y-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-500">List view</h3>

        <FieldToggleGroup
          label="Visible columns"
          help="Tick the fields that should appear as columns in the list."
          allKeys={listFields}
          selected={value.list.visibleFields}
          defs={defs}
          onChange={setListVisible}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SelectInput
            label="Primary field"
            help="Most prominent value in compact / mobile rows."
            value={value.list.primaryField}
            options={value.list.visibleFields.map((k) => ({ value: k, label: labelFor(defs, k) }))}
            onChange={(v) => onChange({ ...value, list: { ...value.list, primaryField: v } })}
          />
          <SelectInput
            label="Secondary field"
            help="Smaller subtitle under the primary."
            value={value.list.secondaryField}
            options={value.list.visibleFields.map((k) => ({ value: k, label: labelFor(defs, k) }))}
            onChange={(v) => onChange({ ...value, list: { ...value.list, secondaryField: v } })}
          />
          <SelectInput
            label="Sort by"
            value={value.list.sortBy}
            options={defs.filter((f) => sortable.has(f.key)).map((f) => ({ value: f.key, label: f.label }))}
            onChange={(v) => onChange({ ...value, list: { ...value.list, sortBy: v } })}
          />
          <SelectInput
            label="Sort direction"
            value={value.list.sortDirection}
            options={[
              { value: 'asc', label: 'Ascending' },
              { value: 'desc', label: 'Descending' },
            ]}
            onChange={(v) => onChange({ ...value, list: { ...value.list, sortDirection: v as 'asc' | 'desc' } })}
          />
        </div>

        <SelectInput
          label="Group by"
          help="UI for grouping is wired but row rendering for groups will land in the next phase. Setting persists."
          value={value.list.groupBy}
          options={[
            { value: 'none', label: 'No grouping' },
            ...defs.filter((f) => groupable.has(f.key)).map((f) => ({ value: f.key, label: f.label })),
          ]}
          onChange={(v) => onChange({ ...value, list: { ...value.list, groupBy: v } })}
          className="max-w-xs"
        />
      </div>

      {/* Detail view subsection */}
      <div className="px-6 py-5 space-y-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-sage-500">Detail / header view</h3>
        <FieldToggleGroup
          label="Visible fields"
          help="Tick the fields shown on the detail page header / summary panel."
          allKeys={detailFields}
          selected={value.detail.visibleFields}
          defs={defs}
          onChange={setDetailVisible}
        />
      </div>
    </section>
  )
}

function labelFor(defs: readonly FieldDef[], key: string): string {
  return defs.find((f) => f.key === key)?.label ?? key
}

// ── Reusable inputs ────────────────────────────────────────────────

function FieldToggleGroup({
  label, help, allKeys, selected, defs, onChange,
}: {
  label: string
  help?: string
  allKeys: string[]
  selected: string[]
  defs: readonly FieldDef[]
  onChange: (next: string[]) => void
}) {
  function toggle(k: string) {
    const next = selected.includes(k)
      ? selected.filter((x) => x !== k)
      : [...selected, k]
    onChange(next)
  }

  return (
    <div>
      <div className="block text-sm font-semibold text-sage-800 mb-1">{label}</div>
      {help && <p className="text-xs text-sage-500 mb-2">{help}</p>}
      <div className="flex flex-wrap gap-2">
        {allKeys.map((k) => {
          const on = selected.includes(k)
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                on
                  ? 'bg-sage-500 text-white border-sage-500 shadow-sm'
                  : 'bg-white text-sage-700 border-gray-200 hover:bg-gray-50',
              )}
              aria-pressed={on}
            >
              {on && <Check size={12} />}
              {labelFor(defs, k)}
            </button>
          )
        })}
      </div>
      {selected.length === 0 && (
        <p className="text-xs text-amber-700 mt-2">
          At least one field must remain selected — the loader will fall back to defaults otherwise.
        </p>
      )}
    </div>
  )
}

function SelectInput({
  label, help, value, options, onChange, className,
}: {
  label: string
  help?: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <label className={clsx('block', className)}>
      <span className="block text-sm font-semibold text-sage-800 mb-1">{label}</span>
      {help && <p className="text-xs text-sage-500 mb-1.5">{help}</p>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}
