'use client'

import { useState, useTransition } from 'react'
import { startJob, completeJob } from '../_actions'
import { Play, CheckCircle } from 'lucide-react'

export function JobStatusActions({ jobId, status }: { jobId: string; status: string }) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handle(action: 'start' | 'complete') {
    setError(null)
    startTransition(async () => {
      const result = action === 'start' ? await startJob(jobId) : await completeJob(jobId)
      if (result?.error) {
        setError(result.error)
      } else {
        setDone(action === 'start' ? 'Started' : 'Completed')
      }
    })
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
        <CheckCircle size={16} />
        {done}
      </span>
    )
  }

  // Show Start button for draft or assigned jobs
  if (status === 'draft' || status === 'assigned') {
    return (
      <div>
        <button
          type="button"
          onClick={() => handle('start')}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-blue-600 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Play size={14} />
          {isPending ? 'Starting…' : 'Start Job'}
        </button>
        {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
      </div>
    )
  }

  // Show Complete button for in-progress jobs
  if (status === 'in_progress') {
    return (
      <div>
        <button
          type="button"
          onClick={() => handle('complete')}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          <CheckCircle size={14} />
          {isPending ? 'Completing…' : 'Complete Job'}
        </button>
        {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
      </div>
    )
  }

  // No action for completed/invoiced
  return null
}
