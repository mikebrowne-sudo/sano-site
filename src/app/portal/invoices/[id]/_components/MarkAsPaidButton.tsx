'use client'

// Mark as Paid — two steps so a stray click can't mark an invoice paid: the
// button opens a small inline confirm with the date the money arrived
// (defaults to today, NZ). The action records it in the audit log.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markInvoicePaid } from '../_actions'
import { CheckCircle } from 'lucide-react'

function nzTodayClient(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(new Date())
}

export function MarkAsPaidButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(nzTodayClient())
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function confirmPaid() {
    setError(null)
    startTransition(async () => {
      const result = await markInvoicePaid(invoiceId, date)
      if (result?.error) {
        setError(result.error)
      } else {
        setDone(true)
        setOpen(false)
        router.refresh()
      }
    })
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
        <CheckCircle size={16} />
        Marked as paid
      </span>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-emerald-700 transition-colors"
      >
        <CheckCircle size={16} />
        Mark as Paid
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
      <label className="text-xs font-semibold text-sage-800">
        Paid on
        <input
          type="date"
          value={date}
          max={nzTodayClient()}
          onChange={(e) => setDate(e.target.value)}
          className="ml-2 rounded-md border border-sage-200 px-2 py-1.5 text-sm font-normal text-sage-800"
        />
      </label>
      <button
        type="button"
        onClick={confirmPaid}
        disabled={isPending || !date}
        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        <CheckCircle size={14} />
        {isPending ? 'Saving…' : 'Confirm paid'}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="px-2 py-1.5 text-sm text-sage-600 hover:text-sage-800">
        Cancel
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  )
}
