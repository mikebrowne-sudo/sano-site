'use client'

// Shared portal form primitives — the single source for inputs, selects,
// toggles, sections, action rows and feedback banners. Extracted so the ~67
// files that hand-roll the same Tailwind can converge on one look (consistent
// focus rings, disabled states, error styling and label a11y). Visual standard
// follows the majority of existing forms: sentence-case `text-sm` labels,
// `px-4 py-3` controls, a sage focus ring.
//
// Purely additive — adopt page by page. Nothing changes until a form imports it.

import type { ReactNode } from 'react'
import clsx from 'clsx'
import { ChevronDown, Check, AlertCircle, Info } from 'lucide-react'

const controlBase =
  'w-full rounded-lg border px-4 py-3 text-sm text-sage-800 placeholder:text-sage-300 bg-white ' +
  'focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ' +
  'disabled:opacity-60 disabled:cursor-not-allowed'
const borderOk = 'border-sage-200 focus:ring-sage-500'
const borderErr = 'border-red-300 focus:ring-red-400'

interface Labelled {
  label?: string
  required?: boolean
  hint?: string
  error?: string
}

/** Label + optional hint/error wrapper. Associates the control via the label. */
export function FieldShell({ label, required, hint, error, className, children }: Labelled & { className?: string; children: ReactNode }) {
  return (
    <label className={clsx('block', className)}>
      {label && (
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle size={12} /> {error}</span>
      ) : hint ? (
        <span className="block text-xs text-sage-500 mt-1">{hint}</span>
      ) : null}
    </label>
  )
}

export function Input({
  label, required, hint, error, className, value, onChange, type = 'text', placeholder,
  name, disabled, autoComplete, inputMode, step, min, max,
}: Labelled & {
  className?: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  name?: string
  disabled?: boolean
  autoComplete?: string
  inputMode?: 'text' | 'tel' | 'email' | 'numeric' | 'decimal' | 'search' | 'url'
  step?: string
  min?: string
  max?: string
}) {
  return (
    <FieldShell label={label} required={required} hint={hint} error={error} className={className}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        name={name}
        disabled={disabled}
        autoComplete={autoComplete}
        inputMode={inputMode}
        step={step}
        min={min}
        max={max}
        className={clsx(controlBase, error ? borderErr : borderOk)}
      />
    </FieldShell>
  )
}

export function Textarea({
  label, required, hint, error, className, value, onChange, rows = 4, placeholder, name, disabled,
}: Labelled & {
  className?: string
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
  name?: string
  disabled?: boolean
}) {
  return (
    <FieldShell label={label} required={required} hint={hint} error={error} className={className}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        required={required}
        placeholder={placeholder}
        name={name}
        disabled={disabled}
        className={clsx(controlBase, 'resize-y', error ? borderErr : borderOk)}
      />
    </FieldShell>
  )
}

export function Select({
  label, required, hint, error, className, value, onChange, options, name, disabled, placeholder,
}: Labelled & {
  className?: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  name?: string
  disabled?: boolean
  /** When set, prepends an empty "— placeholder —" option. */
  placeholder?: string
}) {
  return (
    <FieldShell label={label} required={required} hint={hint} error={error} className={className}>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          name={name}
          disabled={disabled}
          className={clsx(controlBase, 'appearance-none pr-10', error ? borderErr : borderOk)}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none" />
      </div>
    </FieldShell>
  )
}

/** Inline checkbox with a label. */
export function Checkbox({
  checked, onChange, label, disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  disabled?: boolean
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-sage-700 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-sage-300 text-sage-500 focus:ring-2 focus:ring-sage-500"
      />
      {label}
    </label>
  )
}

/** Segmented control (single choice) — the pill/toggle group pattern. */
export function ToggleGroup({
  ariaLabel, options, value, onChange,
}: {
  ariaLabel: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex border border-sage-200 rounded-lg p-0.5 bg-sage-50">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={clsx(
              'px-4 py-1.5 rounded text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-500',
              active ? 'bg-white text-sage-800 shadow-sm' : 'text-sage-600 hover:text-sage-800',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Stacked radio "cards" with an optional hint per option. */
export function RadioCards({
  name, value, onChange, options,
}: {
  name: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; hint?: string }[]
}) {
  return (
    <div className="space-y-2">
      {options.map((o) => {
        const active = value === o.value
        return (
          <label
            key={o.value}
            className={clsx(
              'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
              active ? 'border-sage-500 bg-sage-50' : 'border-sage-200 hover:border-sage-300',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={active}
              onChange={() => onChange(o.value)}
              className="accent-sage-500 mt-0.5"
            />
            <span>
              <span className="block text-sm font-medium text-sage-800">{o.label}</span>
              {o.hint && <span className="block text-xs text-sage-500 mt-0.5">{o.hint}</span>}
            </span>
          </label>
        )
      })}
    </div>
  )
}

/** A titled form section (fieldset + legend). */
export function FormSection({
  title, description, children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-lg font-semibold text-sage-800">{title}</legend>
      {description && <p className="text-sm text-sage-500 -mt-2">{description}</p>}
      {children}
    </fieldset>
  )
}

/** Primary/secondary action row for the bottom of a form. */
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-4 pt-2">{children}</div>
}

/**
 * The house feedback banner — one look for success / error / info, so every
 * form confirms (or fails) the same way. Pair with actions returning
 * `{ ok, message }`.
 */
export function FormFeedback({
  variant, children,
}: {
  variant: 'success' | 'error' | 'info'
  children: ReactNode
}) {
  const styles = {
    success: { box: 'bg-emerald-50 border-emerald-200 text-emerald-800', Icon: Check },
    error: { box: 'bg-red-50 border-red-200 text-red-700', Icon: AlertCircle },
    info: { box: 'bg-sage-50 border-sage-200 text-sage-700', Icon: Info },
  }[variant]
  const { Icon } = styles
  return (
    <div className={clsx('flex items-start gap-2 rounded-lg border px-4 py-3 text-sm', styles.box)} role={variant === 'error' ? 'alert' : 'status'}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}
