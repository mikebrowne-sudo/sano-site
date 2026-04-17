'use client'

import { useState, useTransition } from 'react'
import { contractorStartJob, contractorCompleteJob } from '../_actions'
import { Play, CheckCircle } from 'lucide-react'

export function ContractorJobActions({ jobId, status }: { jobId: string; status: string }) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handle(action: 'start' | 'complete') {
    setError(null)
    startTransition(async () => {
      const result = action === 'start'
        ? await contractorStartJob(jobId)
        : await contractorCompleteJob(jobId)
      if (result?.error) {
        setError(result.error)
      } else {
        setDone(action === 'start' ? 'Job started' : 'Job completed')
      }
    })
  }

  if (done) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3">
        <CheckCircle size={20} className="text-emerald-600 shrink-0" />
        <span className="text-sm text-emerald-700 font-semibold">{done}</span>
      </div>
    )
  }

  if (status === 'draft' || status === 'assigned') {
    return (
      <div>
        <button
          onClick={() => handle('start')}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-6 py-4 rounded-2xl text-base hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50"
        >
          <Play size={20} />
          {isPending ? 'Starting…' : 'Start Job'}
        </button>
        {error && <p className="text-red-600 text-xs mt-2 text-center">{error}</p>}
      </div>
    )
  }

  if (status === 'in_progress') {
    return (
      <div>
        <button
          onClick={() => handle('complete')}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold px-6 py-4 rounded-2xl text-base hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50"
        >
          <CheckCircle size={20} />
          {isPending ? 'Completing…' : 'Complete Job'}
        </button>
        {error && <p className="text-red-600 text-xs mt-2 text-center">{error}</p>}
      </div>
    )
  }

  if (status === 'completed') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
        <CheckCircle size={18} className="text-emerald-600 shrink-0" />
        <span className="text-sm text-emerald-700 font-medium">This job is complete</span>
      </div>
    )
  }

  return null
}
