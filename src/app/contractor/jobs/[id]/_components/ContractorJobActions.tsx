'use client'

// Allowed-hours model (2026-06) — single "Mark complete" action.
// The old Start → Complete clock-in/out flow is archived; the
// contractor just marks the job complete when it's done.

import { useEffect, useState, useTransition } from 'react'
import { contractorCompleteJob } from '../_actions'
import { CheckCircle } from 'lucide-react'

export function ContractorJobActions({ jobId, status: initialStatus }: { jobId: string; status: string }) {
  const [isPending, startTransition] = useTransition()
  const [currentStatus, setCurrentStatus] = useState(initialStatus)
  const [error, setError] = useState<string | null>(null)
  // Brief success flash after Complete so the contractor gets
  // confirmation before the button shape changes.
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(false), 2200)
    return () => clearTimeout(t)
  }, [flash])

  function handle() {
    setError(null)
    startTransition(async () => {
      const result = await contractorCompleteJob(jobId)
      if (result?.error) {
        setError(result.error)
      } else {
        setCurrentStatus('completed')
        setFlash(true)
      }
    })
  }

  if (currentStatus === 'completed' || currentStatus === 'invoiced') {
    return (
      <div>
        {flash && (
          <p className="text-xs text-emerald-800 bg-emerald-100 rounded-lg px-3 py-1.5 mb-2 text-center font-medium">
            Job marked complete. Nice work.
          </p>
        )}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle size={18} className="text-emerald-600 shrink-0" />
          <span className="text-sm text-emerald-700 font-medium">This job is complete</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={handle}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold px-6 py-4 rounded-2xl text-base hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50 min-h-[52px]"
      >
        <CheckCircle size={20} />
        {isPending ? 'Marking complete…' : 'Mark complete'}
      </button>
      {error && <p className="text-red-600 text-xs mt-2 text-center">{error}</p>}
    </div>
  )
}
