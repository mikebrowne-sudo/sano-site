'use client'

import { useState, useTransition } from 'react'
import { markContractorActive } from '../_actions-onboarding'

export function MarkActiveButton({
  contractorId,
  blockedReason,
}: {
  contractorId: string
  blockedReason: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')
  const [success, setSuccess] = useState(false)

  function onClick() {
    setErrorMessage('')
    startTransition(async () => {
      const result = await markContractorActive({ contractorId })
      if ('error' in result) {
        setErrorMessage(result.error)
        return
      }
      setSuccess(true)
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending || !!blockedReason || success}
        className="inline-flex items-center gap-2 bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Activating…' : success ? 'Activated ✓' : 'Mark ready to work'}
      </button>
      {blockedReason && (
        <p className="text-xs text-amber-700 mt-2">{blockedReason}</p>
      )}
      {errorMessage && (
        <p className="text-xs text-red-600 mt-2">{errorMessage}</p>
      )}
      {success && (
        <p className="text-xs text-emerald-700 mt-2">Contractor is now active and assignable to jobs.</p>
      )}
    </div>
  )
}
