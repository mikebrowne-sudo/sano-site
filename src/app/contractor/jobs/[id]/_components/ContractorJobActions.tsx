'use client'

import { useEffect, useState, useTransition } from 'react'
import { contractorStartJob, contractorCompleteJob } from '../_actions'
import { Play, CheckCircle } from 'lucide-react'

export function ContractorJobActions({ jobId, status: initialStatus }: { jobId: string; status: string }) {
  const [isPending, startTransition] = useTransition()
  const [currentStatus, setCurrentStatus] = useState(initialStatus)
  const [error, setError] = useState<string | null>(null)
  // Phase 5.5.7 — brief success flash after Start / Complete so the
  // contractor gets confirmation before the button shape changes.
  const [flash, setFlash] = useState<'idle' | 'started' | 'completed'>('idle')

  useEffect(() => {
    if (flash === 'idle') return
    const t = setTimeout(() => setFlash('idle'), 2200)
    return () => clearTimeout(t)
  }, [flash])

  function handle(action: 'start' | 'complete') {
    setError(null)
    startTransition(async () => {
      const result = action === 'start'
        ? await contractorStartJob(jobId)
        : await contractorCompleteJob(jobId)
      if (result?.error) {
        setError(result.error)
      } else {
        setCurrentStatus(action === 'start' ? 'in_progress' : 'completed')
        setFlash(action === 'start' ? 'started' : 'completed')
      }
    })
  }

  if (currentStatus === 'draft' || currentStatus === 'assigned') {
    return (
      <div>
        <button
          onClick={() => handle('start')}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-6 py-4 rounded-2xl text-base hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 min-h-[52px]"
        >
          <Play size={20} />
          {isPending ? 'Starting…' : 'Start Job'}
        </button>
        {error && <p className="text-red-600 text-xs mt-2 text-center">{error}</p>}
      </div>
    )
  }

  if (currentStatus === 'in_progress') {
    return (
      <div>
        {flash === 'started' && (
          <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5 mb-2 text-center">
            Job started — good luck.
          </p>
        )}
        <button
          onClick={() => handle('complete')}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold px-6 py-4 rounded-2xl text-base hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50 min-h-[52px]"
        >
          <CheckCircle size={20} />
          {isPending ? 'Completing…' : 'Complete Job'}
        </button>
        {error && <p className="text-red-600 text-xs mt-2 text-center">{error}</p>}
      </div>
    )
  }

  if (currentStatus === 'completed' || currentStatus === 'invoiced') {
    return (
      <div>
        {flash === 'completed' && (
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

  return null
}
