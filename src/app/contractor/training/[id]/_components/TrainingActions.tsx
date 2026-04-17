'use client'

import { useState, useTransition } from 'react'
import { acknowledgeTraining, completeTraining } from '../../_actions'
import { CheckCircle, Eye } from 'lucide-react'

export function TrainingActions({
  assignmentId,
  status: initialStatus,
  acknowledgedAt: initialAck,
  completedAt: initialCompleted,
  requiresAck,
  requiresCompletion,
}: {
  assignmentId: string
  status: string
  acknowledgedAt: string | null
  completedAt: string | null
  requiresAck: boolean
  requiresCompletion: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [acknowledged, setAcknowledged] = useState(!!initialAck)
  const [completed, setCompleted] = useState(!!initialCompleted || initialStatus === 'completed')
  const [error, setError] = useState<string | null>(null)

  function handleAcknowledge() {
    setError(null)
    startTransition(async () => {
      const result = await acknowledgeTraining(assignmentId)
      if (result?.error) setError(result.error)
      else setAcknowledged(true)
    })
  }

  function handleComplete() {
    setError(null)
    startTransition(async () => {
      const result = await completeTraining(assignmentId)
      if (result?.error) setError(result.error)
      else { setCompleted(true); setAcknowledged(true) }
    })
  }

  if (completed) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
        <CheckCircle size={18} className="text-emerald-600 shrink-0" />
        <span className="text-sm text-emerald-700 font-medium">Completed</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {requiresAck && !acknowledged && (
        <button
          onClick={handleAcknowledge}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-6 py-4 rounded-2xl text-base hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50"
        >
          <Eye size={18} />
          {isPending ? 'Acknowledging…' : 'I have read and understood'}
        </button>
      )}

      {requiresAck && acknowledged && !requiresCompletion && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle size={18} className="text-emerald-600 shrink-0" />
          <span className="text-sm text-emerald-700 font-medium">Acknowledged</span>
        </div>
      )}

      {requiresCompletion && (requiresAck ? acknowledged : true) && (
        <button
          onClick={handleComplete}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold px-6 py-4 rounded-2xl text-base hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50"
        >
          <CheckCircle size={18} />
          {isPending ? 'Completing…' : 'Mark as Complete'}
        </button>
      )}

      {error && <p className="text-red-600 text-xs text-center">{error}</p>}
    </div>
  )
}
