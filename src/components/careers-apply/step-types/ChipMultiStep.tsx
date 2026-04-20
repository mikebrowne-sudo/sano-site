'use client'

interface Option { value: string; label: string }

interface ChipMultiStepProps {
  id: string
  question: string
  helper?: string
  options: Option[]
  value: string[]
  onChange: (v: string[]) => void
  error?: string | null
}

export function ChipMultiStep({ id, question, helper, options, value, onChange, error }: ChipMultiStepProps) {
  function toggle(opt: string) {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt))
    else onChange([...value, opt])
  }

  return (
    <div>
      <h2 className="mb-3" id={`step-${id}-label`}>{question}</h2>
      {helper && <p className="text-sm text-gray-500 mb-6">{helper}</p>}
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`step-${id}-label`}>
        {options.map((opt) => {
          const selected = value.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(opt.value)}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sage-300 ${
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
