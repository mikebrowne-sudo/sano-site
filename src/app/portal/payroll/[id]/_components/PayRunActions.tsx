'use client'

import { useState, useTransition } from 'react'
import { completePayRun, sendAllPayslips } from '../../_actions'
import { CheckCircle, Send } from 'lucide-react'

export function PayRunActions({ payRunId, status: initialStatus }: { payRunId: string; status: string }) {
  const [isPending, startTransition] = useTransition()
  const [currentStatus, setCurrentStatus] = useState(initialStatus)
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleComplete() {
    setError(null)
    startTransition(async () => {
      const result = await completePayRun(payRunId)
      if (result?.error) setError(result.error)
      else setCurrentStatus('completed')
    })
  }

  function handleSendAll() {
    setError(null); setSendResult(null)
    startTransition(async () => {
      const result = await sendAllPayslips(payRunId)
      if (result) setSendResult(result)
    })
  }

  return (
    <div className="flex items-center gap-3">
      {currentStatus === 'draft' && (
        <button onClick={handleComplete} disabled={isPending} className="inline-flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50">
          <CheckCircle size={14} /> {isPending ? 'Completing…' : 'Complete Pay Run'}
        </button>
      )}
      {currentStatus === 'completed' && (
        <button onClick={handleSendAll} disabled={isPending} className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50">
          <Send size={14} /> {isPending ? 'Sending…' : 'Send All Payslips'}
        </button>
      )}
      {sendResult && <span className="text-sm text-emerald-700">{sendResult.sent} sent{sendResult.failed > 0 ? `, ${sendResult.failed} failed` : ''}</span>}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  )
}
