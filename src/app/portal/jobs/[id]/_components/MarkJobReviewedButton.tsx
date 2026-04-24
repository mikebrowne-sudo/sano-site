'use client'

// Phase D — Mark as Reviewed.
//
// Rendered on the job page when status is 'completed' or 'invoiced'
// AND reviewed_at is null. A single click calls markJobReviewed,
// which captures reviewed_at + reviewed_by and refreshes the page.

import { useState, useTransition } from 'react'
import { markJobReviewed } from '../_actions'
import { CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function MarkJobReviewedButton({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await markJobReviewed(jobId)
      if (result?.error) {
        setError(result.error)
      } else {
        router.refresh()
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
        <CheckCircle size={16} />
        {isPending ? 'Marking…' : 'Mark as Reviewed'}
      </button>
      {error && (
        <p className="text-red-600 text-xs mt-1">{error}</p>
      )}
    </div>
  )
}
