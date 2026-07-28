'use client'

// Editor for the Full Property Reset structured scope. Lives inline in the New
// and Edit quote forms (in place of the free-text scope) when the service type
// is Full Property Reset. Descriptive only — it never touches pricing/GST/lines.
//
// Regenerating the introduction replaces ONLY the intro; sections, notes,
// exclusions, title, duration and completion (all possibly hand-edited) are
// left untouched.

import { Plus, Trash2, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react'
import {
  type StructuredScope,
  type ScopeSection,
  buildResetIntro,
  buildResetCompletion,
} from '@/lib/full-property-reset-scope'

export function StructuredScopeEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: StructuredScope
  onChange: (next: StructuredScope) => void
  disabled?: boolean
}) {
  const set = (patch: Partial<StructuredScope>) => onChange({ ...value, ...patch })

  // ── Sections ──────────────────────────────────────────────
  function updateSection(i: number, patch: Partial<ScopeSection>) {
    const sections = value.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s))
    set({ sections })
  }
  function addSection() {
    set({ sections: [...value.sections, { heading: 'New section', items: [''] }] })
  }
  function removeSection(i: number) {
    set({ sections: value.sections.filter((_, idx) => idx !== i) })
  }
  function moveSection(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= value.sections.length) return
    const sections = [...value.sections]
    ;[sections[i], sections[j]] = [sections[j], sections[i]]
    set({ sections })
  }
  function updateItem(si: number, ii: number, text: string) {
    const items = value.sections[si].items.map((it, idx) => (idx === ii ? text : it))
    updateSection(si, { items })
  }
  function addItem(si: number) {
    updateSection(si, { items: [...value.sections[si].items, ''] })
  }
  function removeItem(si: number, ii: number) {
    updateSection(si, { items: value.sections[si].items.filter((_, idx) => idx !== ii) })
  }
  function moveItem(si: number, ii: number, dir: -1 | 1) {
    const jj = ii + dir
    const items = [...value.sections[si].items]
    if (jj < 0 || jj >= items.length) return
    ;[items[ii], items[jj]] = [items[jj], items[ii]]
    updateSection(si, { items })
  }

  // ── Notes / exclusions (simple string lists) ──────────────
  function updateList(key: 'notes' | 'exclusions', idx: number, text: string) {
    set({ [key]: value[key].map((v, i) => (i === idx ? text : v)) } as Partial<StructuredScope>)
  }
  function addToList(key: 'notes' | 'exclusions') {
    set({ [key]: [...value[key], ''] } as Partial<StructuredScope>)
  }
  function removeFromList(key: 'notes' | 'exclusions', idx: number) {
    set({ [key]: value[key].filter((_, i) => i !== idx) } as Partial<StructuredScope>)
  }

  // ── Regenerate intro (intro only) ─────────────────────────
  function regenerateIntro() {
    set({ intro: buildResetIntro({ title: value.title, expectedDuration: value.expectedDuration, sections: value.sections }) })
  }
  // Keep the completion clause's duration in sync when the field changes, but
  // only if the operator hasn't hand-edited completion away from a generated
  // form (we compare against both possible generated strings).
  function onDurationChange(next: string) {
    const wasGenerated =
      value.completion === buildResetCompletion(value.expectedDuration) ||
      value.completion === buildResetCompletion('')
    const patch: Partial<StructuredScope> = { expectedDuration: next }
    if (wasGenerated) patch.completion = buildResetCompletion(next)
    set(patch)
  }

  const inputCls =
    'w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm'
  const iconBtn = 'text-sage-400 hover:text-sage-700 transition-colors disabled:opacity-30'

  return (
    <div className="space-y-6">
      <p className="text-xs text-sage-500 -mt-1">
        The standard Full Property Reset scope is loaded below. Remove anything that doesn’t apply,
        add job-specific items, then save. This is the description shown to the customer — pricing is
        added separately as priced lines.
      </p>

      {/* Title + expected duration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Service title</span>
          <input className={inputCls} value={value.title} disabled={disabled}
            onChange={(e) => set({ title: e.target.value })} />
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Expected duration (optional)</span>
          <input className={inputCls} value={value.expectedDuration} disabled={disabled}
            placeholder="e.g. two days"
            onChange={(e) => onDurationChange(e.target.value)} />
        </label>
      </div>

      {/* Introduction */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-sage-800">Introduction</span>
          <button type="button" onClick={regenerateIntro} disabled={disabled}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-sage-500 hover:text-sage-700 disabled:opacity-40">
            <RefreshCw size={13} /> Regenerate introduction
          </button>
        </div>
        <textarea rows={3} className={`${inputCls} resize-y`} value={value.intro} disabled={disabled}
          onChange={(e) => set({ intro: e.target.value })} />
        <p className="text-[11px] text-sage-400 mt-1">
          Regenerating replaces only the introduction — your section edits are kept.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-sage-800">Scope sections</span>
          <button type="button" onClick={addSection} disabled={disabled}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-500 hover:text-sage-700 disabled:opacity-40">
            <Plus size={15} /> Add section
          </button>
        </div>

        {value.sections.map((section, si) => (
          <div key={si} className="rounded-lg border border-sage-100 bg-sage-50/40 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                className={`${inputCls} font-semibold`}
                value={section.heading}
                disabled={disabled}
                onChange={(e) => updateSection(si, { heading: e.target.value })}
                aria-label={`Section ${si + 1} heading`}
              />
              <button type="button" className={iconBtn} disabled={disabled || si === 0}
                onClick={() => moveSection(si, -1)} aria-label="Move section up"><ArrowUp size={15} /></button>
              <button type="button" className={iconBtn} disabled={disabled || si === value.sections.length - 1}
                onClick={() => moveSection(si, 1)} aria-label="Move section down"><ArrowDown size={15} /></button>
              <button type="button" className="text-sage-400 hover:text-red-500 disabled:opacity-30" disabled={disabled}
                onClick={() => removeSection(si)} aria-label="Remove section"><Trash2 size={15} /></button>
            </div>

            <div className="space-y-1.5 pl-1">
              {section.items.map((item, ii) => (
                <div key={ii} className="flex items-center gap-2">
                  <span className="text-sage-300 text-xs select-none">•</span>
                  <input
                    className={inputCls}
                    value={item}
                    disabled={disabled}
                    placeholder="Task line"
                    onChange={(e) => updateItem(si, ii, e.target.value)}
                    aria-label={`Section ${si + 1} task ${ii + 1}`}
                  />
                  <button type="button" className={iconBtn} disabled={disabled || ii === 0}
                    onClick={() => moveItem(si, ii, -1)} aria-label="Move task up"><ArrowUp size={13} /></button>
                  <button type="button" className={iconBtn} disabled={disabled || ii === section.items.length - 1}
                    onClick={() => moveItem(si, ii, 1)} aria-label="Move task down"><ArrowDown size={13} /></button>
                  <button type="button" className="text-sage-400 hover:text-red-500 disabled:opacity-30" disabled={disabled}
                    onClick={() => removeItem(si, ii)} aria-label="Remove task"><Trash2 size={13} /></button>
                </div>
              ))}
              <button type="button" onClick={() => addItem(si)} disabled={disabled}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-sage-500 hover:text-sage-700 disabled:opacity-40 mt-1">
                <Plus size={13} /> Add task
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Completion */}
      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Completion approach</span>
        <textarea rows={2} className={`${inputCls} resize-y`} value={value.completion} disabled={disabled}
          onChange={(e) => set({ completion: e.target.value })} />
      </label>

      {/* Important notes */}
      <StringListEditor
        label="Important notes"
        items={value.notes}
        disabled={disabled}
        onUpdate={(i, t) => updateList('notes', i, t)}
        onAdd={() => addToList('notes')}
        onRemove={(i) => removeFromList('notes', i)}
      />

      {/* Exclusions */}
      <StringListEditor
        label="Exclusions (optional)"
        items={value.exclusions}
        disabled={disabled}
        onUpdate={(i, t) => updateList('exclusions', i, t)}
        onAdd={() => addToList('exclusions')}
        onRemove={(i) => removeFromList('exclusions', i)}
      />
    </div>
  )
}

function StringListEditor({
  label, items, disabled, onUpdate, onAdd, onRemove,
}: {
  label: string
  items: string[]
  disabled: boolean
  onUpdate: (i: number, text: string) => void
  onAdd: () => void
  onRemove: (i: number) => void
}) {
  const inputCls =
    'w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm'
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-semibold text-sage-800">{label}</span>
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-sage-300 text-xs select-none">•</span>
          <input className={inputCls} value={it} disabled={disabled}
            onChange={(e) => onUpdate(i, e.target.value)} aria-label={`${label} ${i + 1}`} />
          <button type="button" className="text-sage-400 hover:text-red-500 disabled:opacity-30" disabled={disabled}
            onClick={() => onRemove(i)} aria-label={`Remove ${label} ${i + 1}`}><Trash2 size={13} /></button>
        </div>
      ))}
      <button type="button" onClick={onAdd} disabled={disabled}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-sage-500 hover:text-sage-700 disabled:opacity-40 mt-1">
        <Plus size={13} /> Add
      </button>
    </div>
  )
}
