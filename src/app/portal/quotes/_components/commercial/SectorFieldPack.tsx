'use client'

// Config-driven renderer for the per-sector extra fields defined in
// SECTOR_FIELD_PACKS (src/lib/commercialQuote.ts). Zero hardcoded
// sector-specific JSX — adding a new sector only requires editing the
// config.

import type { SectorFieldDef } from '@/lib/commercialQuote'

export function SectorFieldPack({
  fields,
  values,
  onChange,
  disabled = false,
}: {
  fields: readonly SectorFieldDef[]
  values: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
  disabled?: boolean
}) {
  function set(key: string, v: unknown) {
    onChange({ ...values, [key]: v })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map((f) => (
        <FieldRenderer
          key={f.key}
          field={f}
          value={values[f.key]}
          onChange={(v) => set(f.key, v)}
          disabled={disabled}
        />
      ))}
    </div>
  )
}

function FieldRenderer({
  field, value, onChange, disabled,
}: {
  field: SectorFieldDef
  value: unknown
  onChange: (v: unknown) => void
  disabled: boolean
}) {
  const labelEl = (
    <span className="block text-sm font-semibold text-sage-800 mb-1.5">{field.label}</span>
  )

  switch (field.type) {
    case 'text':
      return (
        <label className="block">
          {labelEl}
          <input
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm disabled:opacity-50 disabled:bg-sage-50"
          />
        </label>
      )

    case 'textarea':
      return (
        <label className="block sm:col-span-2">
          {labelEl}
          <textarea
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            disabled={disabled}
            className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm resize-y disabled:opacity-50 disabled:bg-sage-50"
          />
        </label>
      )

    case 'number':
    case 'integer':
      return (
        <label className="block">
          {labelEl}
          <input
            type="number"
            value={typeof value === 'number' ? String(value) : typeof value === 'string' ? value : ''}
            onChange={(e) => {
              const v = e.target.value
              if (v === '') return onChange(null)
              const parsed = field.type === 'integer' ? parseInt(v, 10) : parseFloat(v)
              onChange(Number.isFinite(parsed) ? parsed : null)
            }}
            min={field.min}
            max={field.max}
            step={field.type === 'integer' ? 1 : 'any'}
            disabled={disabled}
            className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm disabled:opacity-50 disabled:bg-sage-50"
          />
        </label>
      )

    case 'boolean':
      return (
        <label className="flex items-start gap-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="mt-0.5 rounded border-sage-300 text-sage-600 focus:ring-sage-500 disabled:opacity-50"
          />
          <span className="text-sm text-sage-800">{field.label}</span>
        </label>
      )

    case 'select':
      return (
        <label className="block">
          {labelEl}
          <select
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
            className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sage-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm disabled:opacity-50 disabled:bg-sage-50"
          >
            <option value="">—</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </label>
      )

    case 'chips': {
      const current = Array.isArray(value) ? (value as string[]) : []
      return (
        <div className="sm:col-span-2">
          {labelEl}
          <div className="flex flex-wrap gap-2">
            {field.options?.map((opt) => {
              const active = current.includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const next = active ? current.filter((v) => v !== opt) : [...current, opt]
                    onChange(next)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-sage-600 text-white'
                      : 'bg-white border border-sage-200 text-sage-700 hover:bg-sage-100'
                  } ${disabled ? 'opacity-50' : ''}`}
                >
                  {opt.replace(/_/g, ' ')}
                </button>
              )
            })}
          </div>
        </div>
      )
    }
  }
}
