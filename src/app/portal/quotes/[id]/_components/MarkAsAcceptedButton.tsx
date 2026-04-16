'use client'

import { useState, useTransition } from 'react'
import { markQuoteAccepted } from '../_actions'
import { CheckCircle } from 'lucide-react'

export function MarkAsAcceptedButton({ quoteId }: { quoteId: string }) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await markQuoteAccepted(quoteId)
      if (result?.error) {
        setError(result.error)
      } else {
        setDone(true)
      }
    })
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
        <CheckCircle size={16} />
        Accepted
      </span>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
      >
        <CheckCircle size={16} />
        {isPending ? 'Updating…' : 'Mark as Accepted'}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  )
}
