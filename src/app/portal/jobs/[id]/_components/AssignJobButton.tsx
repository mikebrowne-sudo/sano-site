'use client'

// Phase D.1 — staff contractor assignment modal.
//
// Replaces the prior "contractor dropdown + single Assign button"
// popover with a fuller modal that lets staff capture everything
// the contractor actually needs on site:
//   • which contractor
//   • scheduled date + time / service window
//   • allowed hours
//   • access instructions (keys, alarms, parking)
//   • internal / job notes
//
// The action split surfaces the brief's Assign Only vs Assign +
// Notify choice: Assign Only writes the job record without emailing
// the contractor, Assign + Notify also fires the assignment email.
//
// All schedule / hours / access / notes fields are optional — if
// the operator leaves them blank they stay as whatever was already
// on the job. That way re-assigning a contractor doesn't wipe
// previously-set values.

import { useState, useTransition } from 'react'
import { assignJob } from '../_actions'
import { UserPlus, X, ChevronDown, Send } from 'lucide-react'

interface Contractor {
  id: string
  full_name: string
}

export interface AssignJobButtonProps {
  jobId: string
  currentAssignee: string | null
  currentContractorId: string | null
  currentScheduledDate?: string | null
  currentScheduledTime?: string | null
  currentAllowedHours?: number | null
  currentAccessInstructions?: string | null
  currentInternalNotes?: string | null
  contractors: Contractor[]
}

export function AssignJobButton({
  jobId,
  currentAssignee,
  currentContractorId,
  currentScheduledDate,
  currentScheduledTime,
  currentAllowedHours,
  currentAccessInstructions,
  currentInternalNotes,
  contractors,
}: AssignJobButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(currentContractorId ?? '')
  const [scheduledDate, setScheduledDate] = useState(currentScheduledDate ?? '')
  const [scheduledTime, setScheduledTime] = useState(currentScheduledTime ?? '')
  const [allowedHours, setAllowedHours] = useState(
    currentAllowedHours != null ? String(currentAllowedHours) : '',
  )
  const [accessInstructions, setAccessInstructions] = useState(currentAccessInstructions ?? '')
  const [internalNotes, setInternalNotes] = useState(currentInternalNotes ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [savedName, setSavedName] = useState<string | null>(null)
  const [notified, setNotified] = useState(false)

  function submit(notify: boolean) {
    setError(null)
    if (!selectedId) {
      setError('Please select a contractor.')
      return
    }
    const hours = allowedHours.trim() ? Number(allowedHours) : null
    if (allowedHours.trim() && (hours == null || !Number.isFinite(hours) || hours < 0)) {
      setError('Allowed hours must be a positive number.')
      return
    }

    startTransition(async () => {
      const result = await assignJob({
        jobId,
        contractorId: selectedId,
        scheduledDate: scheduledDate || null,
        scheduledTime: scheduledTime || null,
        allowedHours: hours,
        accessInstructions: accessInstructions || null,
        internalNotes: internalNotes || null,
        notify,
      })
      if (result?.error) {
        setError(result.error)
      } else {
        const c = contractors.find((ct) => ct.id === selectedId)
        setSavedName(c?.full_name ?? 'Assigned')
        setNotified(notify)
        setOpen(false)
        setTimeout(() => setSavedName(null), 3500)
      }
    })
  }

  if (savedName) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
        {notified ? `Assigned to ${savedName} · notified` : `Assigned to ${savedName}`}
      </span>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
      >
        <UserPlus size={16} />
        {currentAssignee ? 'Reassign' : 'Assign Contractor'}
      </button>
    )
  }

  return (
    <div className="bg-white border border-sage-200 rounded-lg p-4 space-y-3 w-full max-w-xl">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-sage-800">
          {currentAssignee ? 'Reassign Job' : 'Assign Contractor'}
        </span>
        <button type="button" onClick={() => setOpen(false)} className="text-sage-400 hover:text-sage-600">
          <X size={16} />
        </button>
      </div>

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Contractor</span>
        <div className="relative">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full appearance-none rounded-lg border border-sage-200 px-4 py-3 pr-10 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm bg-white"
          >
            <option value="">Select contractor…</option>
            {contractors.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none" />
        </div>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Scheduled date</span>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Time / service window</span>
          <input
            type="text"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            placeholder="e.g. 9:00 am or 6pm–10pm"
            className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Allowed hours</span>
        <input
          type="number"
          min="0"
          step="0.25"
          value={allowedHours}
          onChange={(e) => setAllowedHours(e.target.value)}
          placeholder="Prefilled from quote where available"
          className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Access instructions</span>
        <textarea
          value={accessInstructions}
          onChange={(e) => setAccessInstructions(e.target.value)}
          rows={2}
          placeholder="Keys, alarm codes, parking, lockbox details…"
          className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Internal notes</span>
        <textarea
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          rows={2}
          placeholder="Anything the contractor should be aware of…"
          className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
        />
      </label>

      {error && <p className="text-red-600 text-xs">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={isPending}
          className="inline-flex items-center gap-2 border border-sage-300 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Assign Only'}
        </button>
        <button
          type="button"
          onClick={() => submit(true)}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          <Send size={14} />
          {isPending ? 'Sending…' : 'Assign + Notify'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-sage-600 hover:text-sage-800 ml-auto">
          Cancel
        </button>
      </div>
    </div>
  )
}
