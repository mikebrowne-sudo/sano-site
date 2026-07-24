'use client'

// Scroll-to-bottom acknowledgement gate. The acknowledge control stays DISABLED
// until the worker has scrolled the required module content to the bottom (an
// IntersectionObserver on a sentinel placed after the content). No quiz — just
// read-to-the-bottom then actively confirm. Also drives re-acknowledgement.

import { useEffect, useRef, useState, useTransition } from 'react'
import { acknowledgeTraining, completeTraining } from '../../_actions'
import { CheckCircle, Eye, RefreshCw, Lock } from 'lucide-react'

export function AcknowledgeGate({
  assignmentId,
  status,
  acknowledgedAt,
  completedAt,
  acknowledgedVersion,
  currentVersion,
  reacknowledgementRequired,
  requiresAck,
  requiresCompletion,
  gateEnabled,
  sentinelId,
}: {
  assignmentId: string
  status: string
  acknowledgedAt: string | null
  completedAt: string | null
  acknowledgedVersion: string | null
  currentVersion: string | null
  reacknowledgementRequired: boolean
  requiresAck: boolean
  requiresCompletion: boolean
  gateEnabled: boolean
  sentinelId: string
}) {
  const [reachedBottom, setReachedBottom] = useState(!gateEnabled)
  const [acknowledged, setAcknowledged] = useState(!!acknowledgedAt && !reacknowledgementRequired)
  const [completed, setCompleted] = useState((!!completedAt || status === 'completed') && !reacknowledgementRequired)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const observed = useRef(false)

  useEffect(() => {
    if (!gateEnabled || observed.current) return
    const el = document.getElementById(sentinelId)
    if (!el) return
    observed.current = true
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setReachedBottom(true); io.disconnect() }
    }, { rootMargin: '0px 0px -8px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [gateEnabled, sentinelId])

  function ack() {
    setError(null)
    startTransition(async () => {
      const r = await acknowledgeTraining(assignmentId)
      if (r?.error) setError(r.error); else setAcknowledged(true)
    })
  }
  function complete() {
    setError(null)
    startTransition(async () => {
      const r = await completeTraining(assignmentId)
      if (r?.error) setError(r.error); else { setCompleted(true); setAcknowledged(true) }
    })
  }

  if (completed) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
        <CheckCircle size={18} className="text-emerald-600 shrink-0" />
        <span className="text-sm text-emerald-700 font-medium">Completed{acknowledgedVersion ? ` · version ${acknowledgedVersion}` : ''}</span>
      </div>
    )
  }

  const primaryLabel = requiresCompletion ? (isPending ? 'Completing…' : 'I have read and understood') : (isPending ? 'Acknowledging…' : 'I have read and understood')
  const onPrimary = requiresCompletion ? complete : ack
  const btnDisabled = isPending || !reachedBottom

  return (
    <div className="space-y-3">
      {reacknowledgementRequired && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <RefreshCw size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Re-acknowledgement required</p>
            <p className="text-amber-700 text-xs mt-0.5">This module has been updated{currentVersion ? ` to version ${currentVersion}` : ''}. Please read it again and confirm.</p>
          </div>
        </div>
      )}

      {requiresAck && acknowledged && !requiresCompletion && !reacknowledgementRequired ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle size={18} className="text-emerald-600 shrink-0" />
          <span className="text-sm text-emerald-700 font-medium">Acknowledged{acknowledgedVersion ? ` · version ${acknowledgedVersion}` : ''}</span>
        </div>
      ) : (
        <>
          <button
            onClick={onPrimary}
            disabled={btnDisabled}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-6 py-4 rounded-2xl text-base hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {reachedBottom ? <Eye size={18} /> : <Lock size={18} />}
            {primaryLabel}
          </button>
          {!reachedBottom && (
            <p className="text-xs text-sage-500 text-center">Scroll to the bottom of the content above to enable this.</p>
          )}
        </>
      )}

      {error && <p className="text-red-600 text-xs text-center">{error}</p>}
    </div>
  )
}
