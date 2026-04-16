'use client'

import { useState, useTransition } from 'react'
import { convertToInvoice } from '../_actions-invoice'
import { FileOutput } from 'lucide-react'

export function ConvertToInvoiceButton({ quoteId }: { quoteId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await convertToInvoice(quoteId)
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
        <FileOutput size={16} />
        {isPending ? 'Converting…' : 'Convert to Invoice'}
      </button>
      {error && (
        <p className="text-red-600 text-xs mt-1">{error}</p>
      )}
    </div>
  )
}
