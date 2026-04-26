'use client'

import { useState, useTransition } from 'react'
import { setOnboardingItemStatus } from '../_actions-onboarding'

export function OnboardingChecklistItem({
  itemId,
  contractorId,
  label,
  complete,
  completedDateLabel,
}: {
  itemId: string
  contractorId: string
  label: string
  complete: boolean
  completedAt: string | null
  completedDateLabel: string
}) {
  const [optimistic, setOptimistic] = useState(complete)
  const [pending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')

  function toggle() {
    const next: 'pending' | 'complete' = optimistic ? 'pending' : 'complete'
    setOptimistic(!optimistic)
    setErrorMessage('')
    startTransition(async () => {
      const result = await setOnboardingItemStatus({ itemId, contractorId, status: next })
      if ('error' in result) {
        setErrorMessage(result.error)
        setOptimistic(complete) // rollback
      }
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors duration-150 ${
        optimistic
          ? 'border-sage-200 bg-sage-50/40'
          : 'border-sage-100 bg-white hover:border-sage-200 hover:bg-sage-50/30'
      } disabled:opacity-50`}
    >
      <span
        className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
          optimistic ? 'bg-sage-500 border-sage-500' : 'border-sage-200 bg-white'
        }`}
      >
        {optimistic && (
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
            <path d="M2 5.5L4.5 8L9 3" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={`flex-1 text-sm ${optimistic ? 'text-sage-700 line-through decoration-sage-300' : 'text-sage-800 font-medium'}`}>
        {label}
      </span>
      {optimistic && completedDateLabel && (
        <span className="text-[11px] text-sage-500 whitespace-nowrap">{completedDateLabel}</span>
      )}
      {errorMessage && (
        <span className="text-[11px] text-red-600 whitespace-nowrap">{errorMessage}</span>
      )}
    </button>
  )
}
