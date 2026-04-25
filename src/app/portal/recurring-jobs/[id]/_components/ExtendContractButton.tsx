'use client'

// Phase F — Extend / Renew contract.
//
// Admin-only client modal that calls extendRecurringContract. Sets
// a new end_date (and optional new term in months + notes), bumps
// renewal_status to 'renewed', recreates pending reminders against
// the new end date.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarRange, X } from 'lucide-react'
import { extendRecurringContract } from '../../_actions-phase-f'

export interface ExtendContractButtonProps {
  recurringId: string
  currentEndDate: string | null
  currentTermMonths: number | null
}

function addMonthsIso(iso: string, months: number): string {
  const d = new Date(iso)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

export function ExtendContractButton({
  recurringId,
  currentEndDate,
  currentTermMonths,
}: ExtendContractButtonProps) {
  // Default the modal's new end-date input to current end + 12mo
  // if there's an existing end date, otherwise +12mo from today.
  const baseEnd = currentEndDate ?? new Date().toISOString().slice(0, 10)
  const [open, setOpen] = useState(false)
  const [newEndDate, setNewEndDate] = useState(addMonthsIso(baseEnd, 12))
  const [newTerm, setNewTerm] = useState<string>(
    currentTermMonths != null ? String(currentTermMonths) : '12',
  )
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function submit() {
    setError(null)
    if (!newEndDate) {
      setError('New end date is required.')
      return
    }
    const termNum = newTerm.trim() ? Number(newTerm) : null
    if (newTerm.trim() && (termNum == null || !Number.isFinite(termNum) || termNum <= 0)) {
      setError('Term months must be a positive number.')
      return
    }
    startTransition(async () => {
      const result = await extendRecurringContract({
        recurringJobId: recurringId,
        newEndDate,
        newTermMonths: termNum,
        notes: notes || null,
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
      >
        <CalendarRange size={16} />
        Renew / Extend
      </button>
    )
  }

  return (
    <div className="bg-white border border-sage-200 rounded-lg p-4 space-y-3 w-full max-w-md shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-sage-800">Renew / extend contract</span>
        <button type="button" onClick={() => setOpen(false)} className="text-sage-400 hover:text-sage-600">
          <X size={16} />
        </button>
      </div>

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">New end date</span>
        <input
          type="date"
          value={newEndDate}
          onChange={(e) => setNewEndDate(e.target.value)}
          className="w-full rounded-lg border border-sage-200 px-4 py-2 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
        />
        {currentEndDate && (
          <span className="block text-[11px] text-sage-500 mt-1">
            Current end date: {currentEndDate}
          </span>
        )}
      </label>

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">New term (months, optional)</span>
        <input
          type="number"
          min="1"
          step="1"
          value={newTerm}
          onChange={(e) => setNewTerm(e.target.value)}
          placeholder="12"
          className="w-full rounded-lg border border-sage-200 px-4 py-2 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Renewal context, fee changes, scope notes…"
          className="w-full rounded-lg border border-sage-200 px-4 py-2 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
        />
      </label>

      {error && <p className="text-red-600 text-xs">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Renew contract'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(null) }} className="text-sm text-sage-600 hover:text-sage-800">
          Cancel
        </button>
      </div>
    </div>
  )
}
