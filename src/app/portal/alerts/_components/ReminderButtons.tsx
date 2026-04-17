'use client'

import { useState, useTransition } from 'react'
import { runJobReminders, runTrainingReminders } from '../_actions'
import { Send, CheckCircle, AlertCircle } from 'lucide-react'

interface ReminderResult {
  sent: number
  failed: number
  total: number
  error?: string
}

function ResultMessage({ result }: { result: ReminderResult }) {
  if (result.error) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-red-600">
        <AlertCircle size={14} />
        {result.error}
      </span>
    )
  }
  if (result.total === 0) {
    return <span className="text-sm text-sage-500">No reminders to send — all up to date</span>
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
      <CheckCircle size={14} />
      {result.sent} sent{result.failed > 0 ? `, ${result.failed} failed` : ''}
    </span>
  )
}

export function RunJobReminders() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<ReminderResult | null>(null)

  function handleRun() {
    setResult(null)
    startTransition(async () => {
      const res = await runJobReminders()
      if (res) setResult(res)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={handleRun} disabled={isPending} className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50">
        <Send size={14} />
        {isPending ? 'Sending…' : 'Send job reminders'}
      </button>
      {result && <ResultMessage result={result} />}
    </div>
  )
}

export function RunTrainingReminders() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<ReminderResult | null>(null)

  function handleRun() {
    setResult(null)
    startTransition(async () => {
      const res = await runTrainingReminders()
      if (res) setResult(res)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={handleRun} disabled={isPending} className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50">
        <Send size={14} />
        {isPending ? 'Sending…' : 'Send training reminders'}
      </button>
      {result && <ResultMessage result={result} />}
    </div>
  )
}
