'use client'

import { useTransition, useState } from 'react'
import { seedContractorChecklist } from '../_actions-onboarding'

export function SeedChecklistButton({ contractorId }: { contractorId: string }) {
  const [pending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')

  function onClick() {
    setErrorMessage('')
    startTransition(async () => {
      const result = await seedContractorChecklist({ contractorId })
      if ('error' in result) setErrorMessage(result.error)
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
      >
        {pending ? 'Seeding…' : 'Seed onboarding checklist'}
      </button>
      {errorMessage && <p className="text-xs text-red-600 mt-2">{errorMessage}</p>}
    </div>
  )
}
