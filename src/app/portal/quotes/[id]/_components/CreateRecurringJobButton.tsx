'use client'

// Phase F — Create Recurring Job button.
//
// Mirrors CreateJobButton + CreateJobAndInvoiceButton interaction.
// Calls createRecurringJobFromQuote which handles the redirect on
// success.

import { useState, useTransition } from 'react'
import { createRecurringJobFromQuote } from '../../../recurring-jobs/_actions-phase-f'
import { Repeat } from 'lucide-react'

export function CreateRecurringJobButton({ quoteId }: { quoteId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await createRecurringJobFromQuote(quoteId)
      if (result && 'error' in result) {
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
        <Repeat size={16} />
        {isPending ? 'Creating…' : 'Create Recurring Job'}
      </button>
      {error && (
        <p className="text-red-600 text-xs mt-1">{error}</p>
      )}
    </div>
  )
}
