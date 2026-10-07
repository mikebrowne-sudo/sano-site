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

  // Compact inline treatment — this control sits in a row alongside other
  // status chips, and previously took a full-width banner plus two lines of
  // explanatory copy, pushing the actual remittance document below the fold.
  // The explanation moved to the button's title attribute: it matters once,
  // when you first meet the control, not on every visit.
  if (paidAt) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium whitespace-nowrap">
          <CheckCircle2 size={13} /> Paid {formatDate(paidAt.slice(0, 10))}
        </span>
        <button
          type="button"
          onClick={() => run(() => markRemittanceUnpaid(id))}
          disabled={isPending}
          className="inline-flex items-center gap-1 text-xs text-sage-500 hover:text-sage-700 disabled:opacity-50"
        >
          <Undo2 size={12} /> {isPending ? 'Reverting…' : 'Undo'}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </span>
    )
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {!confirming ? (
        <>
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium whitespace-nowrap">
            <Clock size={13} /> Not yet paid
          </span>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            title="Marks this remittance and its payables paid. Only do this once the money has left the bank — the contractor sees “Pending payment” until then."
            className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-md text-xs hover:bg-emerald-700 whitespace-nowrap"
          >
            <CheckCircle2 size={13} /> Mark paid
          </button>
        </>
      ) : (
        <>
          <label className="inline-flex items-center gap-1.5 text-xs text-sage-600 whitespace-nowrap">
            Paid on
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="rounded-md border border-sage-200 px-2 py-1 text-xs text-sage-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          <button
            type="button"
            onClick={() => run(() => markRemittancePaid(id, payDate || undefined))}
            disabled={isPending || !payDate}
            className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-md text-xs hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
          >
            {isPending ? 'Saving…' : 'Confirm paid'}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="text-xs text-sage-500 hover:text-sage-700">
            Cancel
          </button>
        </>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  )
}
