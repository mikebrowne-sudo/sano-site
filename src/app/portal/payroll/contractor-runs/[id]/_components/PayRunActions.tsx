'use client'

// Phase E.1 — pay run lifecycle action button(s).
//
// Renders one button at a time depending on status:
//   draft     → Approve Pay Run
//   approved  → Mark Paid
//   paid      → no button (CSV export covers this state)
// Errors render inline next to the button.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, DollarSign } from 'lucide-react'
import { approveContractorPayRun, markContractorPayRunPaid } from '../../_actions'

export function PayRunActions({ payRunId, status }: { payRunId: string; status: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<{ ok: true } | { error: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  if (status === 'draft') {
    return (
      <div className="inline-flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => run(() => approveContractorPayRun(payRunId))}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          <CheckCircle size={16} />
          {isPending ? 'Approving…' : 'Approve Pay Run'}
        </button>
        {error && <span className="text-[11px] text-red-600">{error}</span>}
      </div>
    )
  }

  if (status === 'approved') {
    return (
      <div className="inline-flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => run(() => markContractorPayRunPaid(payRunId))}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          <DollarSign size={16} />
          {isPending ? 'Marking paid…' : 'Mark Paid'}
        </button>
        {error && <span className="text-[11px] text-red-600">{error}</span>}
      </div>
    )
  }

  return null
}
