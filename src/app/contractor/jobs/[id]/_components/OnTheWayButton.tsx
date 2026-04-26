'use client'

import { useState, useTransition } from 'react'
import { contractorOnTheWaySms } from '../_actions-notify'
import { Send, CheckCircle, AlertCircle } from 'lucide-react'

type Outcome =
  | { kind: 'sent' }
  | { kind: 'skipped'; reason: string }
  | { kind: 'failed';  reason: string }
  | { kind: 'error';   message: string }

export function OnTheWayButton({ jobId }: { jobId: string }) {
  const [isPending, startTransition] = useTransition()
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  function handleClick() {
    setOutcome(null)
    startTransition(async () => {
      const result = await contractorOnTheWaySms(jobId)
      if ('error' in result) {
        setOutcome({ kind: 'error', message: result.error })
      } else if (result.status === 'sent') {
        setOutcome({ kind: 'sent' })
      } else if (result.status === 'skipped') {
        setOutcome({ kind: 'skipped', reason: result.reason ?? 'Skipped.' })
      } else {
        setOutcome({ kind: 'failed', reason: result.reason ?? 'Failed to send.' })
      }
    })
  }

  // Once a successful send is recorded, replace the button with a
  // confirmation chip — cheaper than a re-render trip and matches
  // the dedupe guarantee server-side.
  if (outcome?.kind === 'sent') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2">
        <CheckCircle size={16} className="text-emerald-600 shrink-0" />
        <span className="text-sm text-emerald-700 font-medium">Customer notified — on the way</span>
      </div>
    )
  }

  return (
    <div className="mt-3">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 bg-white border-2 border-sage-300 text-sage-800 font-semibold px-6 py-3 rounded-2xl text-sm hover:bg-sage-50 active:bg-sage-100 transition-colors disabled:opacity-50"
      >
        <Send size={16} />
        {isPending ? 'Sending…' : "I'm on my way"}
      </button>
      {outcome && (
        <div className="mt-2 flex items-start gap-1.5 text-xs">
          <AlertCircle size={12} className="text-amber-600 mt-0.5 shrink-0" />
          <span className="text-amber-700">
            {outcome.kind === 'skipped' && outcome.reason}
            {outcome.kind === 'failed'  && outcome.reason}
            {outcome.kind === 'error'   && outcome.message}
          </span>
        </div>
      )}
    </div>
  )
}
