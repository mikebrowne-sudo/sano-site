'use client'

// Phase C — Create Job button.
//
// Thin client button that invokes the createJobFromQuote server
// action. On success the server action redirects to
// /portal/jobs/[id]; on error we surface an inline message.
// Intentionally mirrors ConvertToInvoiceButton so both Next Step
// paths share the same interaction pattern.

import { useState, useTransition } from 'react'
import { createJobFromQuote } from '../_actions-job'
import { Briefcase } from 'lucide-react'

export function CreateJobButton({ quoteId }: { quoteId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await createJobFromQuote(quoteId)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
      >
        <Briefcase size={16} />
        {isPending ? 'Creating job…' : 'Create Job'}
      </button>
      {error && (
        <p className="text-red-600 text-xs mt-1">{error}</p>
      )}
    </div>
  )
}
