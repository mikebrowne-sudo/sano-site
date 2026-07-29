'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Undo2 } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { reverseRemittanceAllocation } from '../_actions'

/** Soft-reverse a single remittance allocation, with a reason prompt. */
export function ReverseRemitAllocation({ allocationId, remittanceNumber, amount }: { allocationId: string; remittanceNumber: string; amount: number }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function go() {
    setErr(null)
    startTransition(async () => {
      const res = await reverseRemittanceAllocation(allocationId, reason.trim() || null)
      if (!res.ok) { setErr(res.error ?? 'Could not reverse.'); return }
      setConfirming(false)
      router.refresh()
    })
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} title="Reverse this match" className="text-sage-400 hover:text-red-600">
        <Undo2 size={13} />
      </button>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="rounded border border-sage-200 px-2 py-0.5 text-xs w-36"
      />
      <button type="button" onClick={go} disabled={isPending} className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50">
        {isPending ? '…' : `Reverse ${remittanceNumber} · ${formatCurrency(amount)}`}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-xs text-sage-400 hover:text-sage-600">cancel</button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </span>
  )
}
