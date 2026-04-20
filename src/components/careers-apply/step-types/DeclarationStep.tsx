'use client'

interface DeclarationStepProps {
  body: string
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string | null
}

export function DeclarationStep({ body, checked, onChange, error }: DeclarationStepProps) {
  return (
    <div>
      <h2 className="mb-6">One last thing.</h2>
      <label className="flex items-start gap-3 cursor-pointer bg-sage-50 border border-sage-100 rounded-2xl p-6">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-sage-100 text-sage-800 focus:ring-sage-300"
        />
        <span className="text-base text-gray-700 leading-relaxed">{body}</span>
      </label>
      {error && <p className="mt-2 text-sm text-red-500" role="alert">{error}</p>}
    </div>
  )
}
