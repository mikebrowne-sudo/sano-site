'use client'

import { useEffect, useRef } from 'react'

interface DateStepProps {
  id: string
  question: string
  helper?: string
  value: string | null
  onChange: (v: string | null) => void
  onSkip: () => void
}

export function DateStep({ id, question, helper, value, onChange, onSkip }: DateStepProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [id])

  const inputId = `step-${id}`

  return (
    <div>
      <label htmlFor={inputId} className="block text-2xl sm:text-3xl font-semibold text-sage-800 mb-4 leading-tight">
        {question}
      </label>
      {helper && <p className="text-sm text-gray-500 mb-6">{helper}</p>}
      <input
        ref={inputRef}
        id={inputId}
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        className="w-full rounded-xl border border-sage-100 px-4 py-4 text-lg bg-sage-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
      />
      <button
        type="button"
        onClick={onSkip}
        className="mt-4 text-sm text-sage-600 hover:text-sage-800 underline-offset-2 hover:underline transition-colors"
      >
        Skip this question
      </button>
    </div>
  )
}
