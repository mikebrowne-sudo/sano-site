'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Undo2 } from 'lucide-react'
import { reverseAllocation } from '../_actions'

function fmt(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

/**
 * Reverse a single payment allocation. Soft reversal (the row stays for audit).
 * A confirmation with an optional reason. If the bank line was cleared and this
 * drops it below fully allocated, the server un-clears it so it re-appears.
 */
export function ReverseAllocation({
  allocationId,
  invoiceNumber,
  amount,
}: {
  allocationId: string
  invoiceNumber: string
  amount: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function confirm() {
    setError(null)
    startTransition(async () => {
      const r = await reverseAllocation(allocationId, reason.trim() || null)
      if (!r.ok) { setError(r.error ?? 'Could not reverse.'); return }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sage-400 hover:text-red-500 transition-colors"
        title="Reverse this allocation"
        aria-label={`Reverse allocation of ${fmt(amount)} to ${invoiceNumber}`}
      >
        <Undo2 size={13} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mt-20 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-sage-800">Reverse allocation</h3>
            <p className="text-sm text-sage-500 mt-1">
              Undo the {fmt(amount)} allocated to <span className="font-medium text-sage-700">{invoiceNumber}</span>. The
              invoice stays as it is; only this bank-side allocation is reversed. It remains in the audit trail.
            </p>
            <label className="block mt-4">
              <span className="block text-xs font-semibold text-sage-600 mb-1">Reason (optional)</span>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. allocated to the wrong invoice"
                className="w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500"
              />
            </label>
            {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 mt-3">{error}</p>}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={confirm}
                disabled={isPending}
                className="bg-red-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
              >
                {isPending ? 'Reversing…' : 'Reverse allocation'}
              </button>
              <button onClick={() => setOpen(false)} className="text-sm text-sage-600 hover:text-sage-800">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
