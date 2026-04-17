'use client'

import { useState, useTransition } from 'react'
import { approveContractorInvoice, markContractorInvoicePaid } from '../../_actions'
import { CheckCircle, ThumbsUp } from 'lucide-react'

export function CIStatusActions({ id, status: initialStatus }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition()
  const [currentStatus, setCurrentStatus] = useState(initialStatus)
  const [error, setError] = useState<string | null>(null)

  function handleApprove() {
    setError(null)
    startTransition(async () => {
      const res = await approveContractorInvoice(id)
      if (res?.error) setError(res.error)
      else setCurrentStatus('approved')
    })
  }

  function handlePaid() {
    setError(null)
    startTransition(async () => {
      const res = await markContractorInvoicePaid(id)
      if (res?.error) setError(res.error)
      else setCurrentStatus('paid')
    })
  }

  return (
    <>
      {currentStatus === 'pending' && (
        <button onClick={handleApprove} disabled={isPending} className="inline-flex items-center gap-2 bg-blue-600 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
          <ThumbsUp size={14} /> {isPending ? 'Approving…' : 'Approve'}
        </button>
      )}
      {(currentStatus === 'pending' || currentStatus === 'approved') && (
        <button onClick={handlePaid} disabled={isPending} className="inline-flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50">
          <CheckCircle size={14} /> {isPending ? 'Updating…' : 'Mark Paid'}
        </button>
      )}
      {error && <span className="text-red-600 text-xs">{error}</span>}
    </>
  )
}
