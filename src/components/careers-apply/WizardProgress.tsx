'use client'

interface WizardProgressProps {
  current: number // 0-indexed
  total: number
}

export function WizardProgress({ current, total }: WizardProgressProps) {
  const pct = Math.min(100, Math.max(0, ((current + 1) / total) * 100))
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-sage-600">
          Step {current + 1} of {total}
        </span>
      </div>
      <div className="h-[3px] w-full bg-sage-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-sage-800 transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={current + 1}
        />
      </div>
    </div>
  )
}
