'use client'

import { ArrowRight } from 'lucide-react'

interface WelcomeStepProps {
  onNext: () => void
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="text-center">
      <p className="eyebrow mb-4">Application</p>
      <h1 className="mb-6">Let&apos;s get you onboard.</h1>
      <p className="body-text max-w-lg mx-auto mb-10">
        This should take about five minutes. A few quick questions so we can understand if it&apos;s a good fit.
      </p>
      <button
        type="button"
        onClick={onNext}
        className="inline-flex items-center gap-2 rounded-full bg-sage-800 px-6 py-3 text-sm font-medium text-white hover:bg-sage-500 transition-colors"
      >
        Let&apos;s start
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}
