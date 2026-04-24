'use client'

// Phase D — Create Job + Invoice button.
//
// Invokes the combined createJobAndInvoiceFromQuote server action.
// Keeps interaction patterns identical to CreateJobButton +
// ConvertToInvoiceButton so the three Next Step paths feel like
// siblings.

import { useState, useTransition } from 'react'
import { createJobAndInvoiceFromQuote } from '../_actions-job-and-invoice'
import { Receipt } from 'lucide-react'

export function CreateJobAndInvoiceButton({ quoteId }: { quoteId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await createJobAndInvoiceFromQuote(quoteId)
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
        <Receipt size={16} />
        {isPending ? 'Creating…' : 'Create Job + Invoice'}
      </button>
      {error && (
        <p className="text-red-600 text-xs mt-1">{error}</p>
      )}
    </div>
  )
}
