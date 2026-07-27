'use client'

// Payslip sending only. The payment lifecycle (approve → mark paid) lives in the
// employee-payment card of PayRunWorkflowPanel. Payslips can be sent once the run
// is approved or paid.

import { useState, useTransition } from 'react'
import { sendAllPayslips } from '../../_actions'
import { Send } from 'lucide-react'

export function PayRunActions({ payRunId, status }: { payRunId: string; status: string }) {
  const [isPending, startTransition] = useTransition()
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleSendAll() {
    setError(null); setSendResult(null)
    startTransition(async () => {
      const result = await sendAllPayslips(payRunId)
      if (result) setSendResult(result)
    })
  }

  if (status !== 'approved' && status !== 'paid' && status !== 'completed') return null

  return (
    <div className="flex items-center gap-3">
      <button onClick={handleSendAll} disabled={isPending} className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50">
        <Send size={14} /> {isPending ? 'Sending…' : 'Send payslips'}
      </button>
      {sendResult && <span className="text-sm text-emerald-700">{sendResult.sent} sent{sendResult.failed > 0 ? `, ${sendResult.failed} failed` : ''}</span>}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  )
}
