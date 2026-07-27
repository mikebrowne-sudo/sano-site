'use client'

// Two-step delete for a DRAFT pay run: the first click reveals the run details
// (employee, period, payday, net) and an explicit Confirm. Admin-only surface;
// the server action re-checks every safety rule.

import { useState, useTransition } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { deletePayRunDraft } from '../_actions-delete-draft'

const money = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

export function DeleteDraftButton({
  runId, employeeLabel, periodStart, periodEnd, payDate, netTotal,
}: {
  runId: string
  employeeLabel: string
  periodStart: string
  periodEnd: string
  payDate: string
  netTotal: number
}) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function del() {
    setError(null)
    startTransition(async () => {
      const res = await deletePayRunDraft({ runId })
      // On success the action redirects; only errors return here.
      if (res?.error) setError(res.error)
    })
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50">
        <Trash2 size={14} /> Delete draft
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 max-w-md">
      <p className="text-sm font-semibold text-red-800">Delete this draft pay run?</p>
      <dl className="mt-2 text-sm text-red-800/90 space-y-0.5">
        <div className="flex justify-between"><dt className="text-red-700/70">Employee</dt><dd className="font-medium">{employeeLabel}</dd></div>
        <div className="flex justify-between"><dt className="text-red-700/70">Period</dt><dd className="font-medium">{fmtDate(periodStart)} – {fmtDate(periodEnd)}</dd></div>
        <div className="flex justify-between"><dt className="text-red-700/70">Payday</dt><dd className="font-medium">{fmtDate(payDate)}</dd></div>
        <div className="flex justify-between"><dt className="text-red-700/70">Net</dt><dd className="font-medium">{money(netTotal)}</dd></div>
      </dl>
      <p className="text-[11px] text-red-700/80 mt-2">Only drafts can be deleted. This cannot be undone.</p>
      <div className="flex gap-2 mt-3">
        <button type="button" disabled={isPending} onClick={del}
          className="inline-flex items-center gap-1.5 bg-red-600 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} {isPending ? 'Deleting…' : 'Confirm delete'}
        </button>
        <button type="button" disabled={isPending} onClick={() => setConfirming(false)}
          className="border border-red-200 text-red-700 font-medium px-4 py-2 rounded-lg text-sm hover:bg-red-100">Cancel</button>
      </div>
      {error && <p className="mt-2 text-sm text-red-700 font-medium">{error}</p>}
    </div>
  )
}
