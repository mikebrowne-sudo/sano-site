'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'

interface WizardNavProps {
  onNext: () => void
  onBack: () => void
  isFirst: boolean
  isLast: boolean
  nextLabel?: string
  nextDisabled?: boolean
}

export function WizardNav({ onNext, onBack, isFirst, isLast, nextLabel, nextDisabled }: WizardNavProps) {
  return (
    <div className="flex items-center justify-between gap-4 mt-10">
      {!isFirst ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-sage-600 hover:text-sage-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </button>
      ) : <span />}
      {!isLast && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="inline-flex items-center gap-2 rounded-full bg-sage-800 px-6 py-3 text-sm font-medium text-white hover:bg-sage-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {nextLabel ?? 'Next'}
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
