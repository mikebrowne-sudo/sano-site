'use client'

import clsx from 'clsx'
import type { OverrideValidationErrors } from './override-validation'

export interface OverridePanelValue {
  is_price_overridden: boolean
  override_price: string
  override_reason: string
  override_confirmed: boolean
}

interface Props {
  value: OverridePanelValue
  onChange: (next: OverridePanelValue) => void
  errors: OverrideValidationErrors
  readOnly?: boolean
}

export function OverridePanel({ value, onChange, errors, readOnly = false }: Props) {
  function update<K extends keyof OverridePanelValue>(key: K, next: OverridePanelValue[K]) {
    if (readOnly) return
    onChange({ ...value, [key]: next })
  }

  return (
    <div className="mt-4">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          aria-label="Override price manually"
          checked={value.is_price_overridden}
          onChange={(e) => update('is_price_overridden', e.target.checked)}
          disabled={readOnly}
          className="h-4 w-4 rounded border-sage-300 text-sage-500 focus:ring-sage-500"
        />
        <span className="text-sm font-medium text-sage-800">Override price manually</span>
      </label>

      {value.is_price_overridden && (
        <div className="mt-4 space-y-4 bg-amber-50/40 border border-amber-200 rounded-xl p-5">
          <p className="text-xs text-amber-700 italic">
            This price bypasses the pricing engine and may affect margins.
          </p>

          <div>
            <label htmlFor="override-price" className="block text-sm font-semibold text-sage-800 mb-1.5">
              Custom Price ($) <span className="text-red-500">*</span>
            </label>
            <input
              id="override-price"
              type="number"
              step="0.01"
              min="0"
              value={value.override_price}
              onChange={(e) => update('override_price', e.target.value)}
              disabled={readOnly}
              className={clsx(
                'w-full max-w-sm rounded-lg border px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent',
                errors.override_price ? 'border-red-400' : 'border-sage-200',
                readOnly && 'bg-sage-50 text-sage-500 cursor-not-allowed',
              )}
            />
            {errors.override_price && (
              <span className="text-red-500 text-xs mt-1 block">{errors.override_price}</span>
            )}
          </div>

          <div>
            <label htmlFor="override-reason" className="block text-sm font-semibold text-sage-800 mb-1.5">
              Reason for override <span className="text-red-500">*</span>
            </label>
            <textarea
              id="override-reason"
              rows={3}
              value={value.override_reason}
              onChange={(e) => update('override_reason', e.target.value)}
              disabled={readOnly}
              className={clsx(
                'w-full rounded-lg border px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent',
                errors.override_reason ? 'border-red-400' : 'border-sage-200',
                readOnly && 'bg-sage-50 text-sage-500 cursor-not-allowed',
              )}
            />
            {errors.override_reason && (
              <span className="text-red-500 text-xs mt-1 block">{errors.override_reason}</span>
            )}
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                aria-label="I confirm this overrides the calculated price"
                checked={value.override_confirmed}
                onChange={(e) => update('override_confirmed', e.target.checked)}
                disabled={readOnly}
                className="h-4 w-4 rounded border-sage-300 text-sage-500 focus:ring-sage-500"
              />
              <span className="text-sm text-sage-800">I confirm this overrides the calculated price</span>
            </label>
            {errors.override_confirmed && (
              <span className="text-red-500 text-xs mt-1 block">{errors.override_confirmed}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
