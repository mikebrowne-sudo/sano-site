'use client'

interface Option { value: string; label: string }

interface ChipSingleStepProps {
  id: string
  question: string
  options: Option[]
  value: string
  onChange: (v: string) => void
  error?: string | null
}

export function ChipSingleStep({ id, question, options, value, onChange, error }: ChipSingleStepProps) {
  return (
    <div>
      <h2 id={`step-${id}-label`} className="mb-8">{question}</h2>
      <div role="radiogroup" aria-labelledby={`step-${id}-label`} className="flex flex-wrap gap-3">
        {options.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={`px-6 py-3 rounded-full border text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sage-300 ${
                selected ? 'bg-sage-800 text-white border-sage-800' : 'bg-white border-sage-100 text-gray-700 hover:border-sage-300'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {error && <p className="mt-4 text-sm text-red-500" role="alert">{error}</p>}
    </div>
  )
}
