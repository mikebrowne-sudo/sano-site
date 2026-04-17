'use client'

import { useState, useTransition } from 'react'
import { runJobReminders, runTrainingReminders } from '../_actions'
import { Send, CheckCircle } from 'lucide-react'

export function RunJobReminders() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleRun() {
    setError(null); setResult(null)
    startTransition(async () => {
      const res = await runJobReminders()
      if (res) setResult(res)
    })
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={handleRun} disabled={isPending} className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50">
        <Send size={14} />
        {isPending ? 'Sending…' : 'Send job reminders'}
      </button>
      {result && (
        <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
          <CheckCircle size={14} />
          {result.sent} sent{result.failed > 0 ? `, ${result.failed} failed` : ''}
        </span>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  )
}

export function RunTrainingReminders() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)

  function handleRun() {
    setResult(null)
    startTransition(async () => {
      const res = await runTrainingReminders()
      if (res) setResult(res)
    })
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={handleRun} disabled={isPending} className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50">
        <Send size={14} />
        {isPending ? 'Sending…' : 'Send training reminders'}
      </button>
      {result && (
        <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
          <CheckCircle size={14} />
          {result.sent} sent{result.failed > 0 ? `, ${result.failed} failed` : ''}
        </span>
      )}
    </div>
  )
}
