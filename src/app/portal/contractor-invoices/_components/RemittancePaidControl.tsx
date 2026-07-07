'use client'

// Staff control for a remittance's paid state. Shows a "Mark paid" action
// (with the payment date) when unpaid, and a Paid badge + "Mark unpaid"
// escape hatch when paid. Mirrors VoidControl's inline, no-modal pattern.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock, Undo2 } from 'lucide-react'
import { markRemittancePaid, markRemittanceUnpaid } from '../_actions-remittance-paid'
import { formatDate } from '@/lib/format'

export function RemittancePaidControl({
  id,
  paidAt,
  paymentDate,
}: {
  id: string
  paidAt: string | null
  paymentDate: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [payDate, setPayDate] = useState(paymentDate ?? '')

  function run(fn: () => Promise<{ error?: string } | { ok: true }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res && 'error' in res && res.error) { setError(res.error); return }
      setConfirming(false)
      router.refresh()
    })
  }

  if (paidAt) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800">
          <CheckCircle2 size={16} /> Paid {formatDate(paidAt.slice(0, 10))}
        </span>
        <button
          type="button"
          onClick={() => run(() => markRemittanceUnpaid(id))}
          disabled={isPending}
          className="ml-auto inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
        >
          <Undo2 size={13} /> {isPending ? 'Reverting…' : 'Mark unpaid'}
        </button>
        {error && <p className="w-full text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-amber-800">
          <Clock size={16} /> Not yet paid
        </span>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="ml-auto inline-flex items-center gap-2 bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-emerald-700"
          >
            <CheckCircle2 size={15} /> Mark paid
          </button>
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <label className="text-[11px] text-amber-800 flex items-center gap-1.5">
              Paid on
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="rounded-lg border border-amber-300 px-2 py-1.5 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <button
              type="button"
              onClick={() => run(() => markRemittancePaid(id, payDate || undefined))}
              disabled={isPending || !payDate}
              className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-semibold px-3 py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Confirm paid'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-xs text-amber-700 hover:text-amber-900">
              Cancel
            </button>
          </div>
        )}
      </div>
      <p className="mt-2 text-[11px] text-amber-700">
        Marks this remittance and its payables paid once the money has left the bank. The contractor sees “Pending payment” until then.
      </p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
