'use client'

// Allowed-hours model (2026-06) — single "Mark complete" action.
// The old Start → Complete two-step is archived; staff just mark a
// job complete when it's done (no clock-in/out time tracking).

import { useState, useTransition } from 'react'
import { completeJob } from '../_actions'
import { CheckCircle } from 'lucide-react'

export function JobStatusActions({ jobId, status }: { jobId: string; status: string }) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handle() {
    setError(null)
    startTransition(async () => {
      const result = await completeJob(jobId)
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
        Completed
      </span>
    )
  }

  // Mark complete is available until the job is completed / invoiced.
  if (status === 'completed' || status === 'invoiced') return null

  return (
    <div>
      <button
        type="button"
        onClick={handle}
        disabled={isPending}
        className="inline-flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
      >
        <CheckCircle size={14} />
        {isPending ? 'Marking complete…' : 'Mark complete'}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  )
}
