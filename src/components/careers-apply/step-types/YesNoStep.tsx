'use client'

interface YesNoStepProps {
  id: string
  question: string
  value: boolean | null
  onChange: (v: boolean) => void
  error?: string | null
}

export function YesNoStep({ id, question, value, onChange, error }: YesNoStepProps) {
  const pill = (selected: boolean) =>
    `px-8 py-4 rounded-full border text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sage-300 ${
      selected
        ? 'bg-sage-800 text-white border-sage-800'
        : 'bg-white border-sage-100 text-gray-700 hover:border-sage-300'
    }`

  return (
    <div>
      <h2 id={`step-${id}-label`} className="mb-8">{question}</h2>
      <div role="radiogroup" aria-labelledby={`step-${id}-label`} className="flex gap-4">
        <button type="button" role="radio" aria-checked={value === true} onClick={() => onChange(true)} className={pill(value === true)}>
          Yes
        </button>
        <button type="button" role="radio" aria-checked={value === false} onClick={() => onChange(false)} className={pill(value === false)}>
          No
        </button>
      </div>
      {error && <p className="mt-4 text-sm text-red-500" role="alert">{error}</p>}
    </div>
  )
}
