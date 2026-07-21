'use client'

// Inline Add / Remove contractor controls for the job Labour & Margin
// worker breakdown (admin-only). Wraps the addJobWorker / removeJobWorker
// server actions. Remove shows a small confirm step and surfaces the
// server-side guard message (pay run / paid / has a payable) inline.

import { useState, useTransition } from 'react'
import { Plus, Check, Trash2, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { addJobWorker, removeJobWorker, setJobWorkerPayRate } from '../_actions-workers'

/** Explicit, audited pay-rate change for a worker. Only path that alters a
 *  snapshot; requires a reason. Disabled (with a tooltip) once the rate is
 *  frozen downstream. */
export function EditWorkerRateButton({
  jobId,
  contractorId,
  currentRate,
  blockedReason,
}: {
  jobId: string
  contractorId: string
  currentRate: number | null
  blockedReason?: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [rate, setRate] = useState(currentRate != null ? String(currentRate) : '')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (blockedReason) {
    return (
      <span className="text-sage-300 cursor-help ml-1" title={blockedReason}>
        <Pencil size={11} className="inline opacity-40" />
      </span>
    )
  }

  function save() {
    setError(null)
    const n = Number(rate)
    if (!Number.isFinite(n) || n <= 0) { setError('Enter a rate greater than zero.'); return }
    if (!reason.trim()) { setError('A reason is required.'); return }
    startTransition(async () => {
      const res = await setJobWorkerPayRate(jobId, contractorId, n, reason.trim())
      if (res?.error) { setError(res.error); return }
      setOpen(false); setReason('')
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Change pay rate (audited)"
        className="ml-1 text-sage-400 hover:text-sage-700"
      >
        <Pencil size={11} />
      </button>
    )
  }

  return (
    <span className="inline-flex flex-col items-end gap-1 mt-1">
      <input
        type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)}
        className="w-20 rounded border border-sage-200 px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-sage-500"
        placeholder="Rate"
      />
      <input
        value={reason} onChange={(e) => setReason(e.target.value)}
        className="w-40 rounded border border-sage-200 px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-sage-500"
        placeholder="Reason (required)"
      />
      <span className="inline-flex items-center gap-1.5">
        <button type="button" onClick={save} disabled={isPending} className="text-[10px] font-medium text-sage-600 hover:text-sage-800 disabled:opacity-50">
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(null) }} className="text-[10px] text-sage-500 hover:text-sage-700">Cancel</button>
      </span>
      {error && <span className="text-[10px] text-red-600 max-w-[10rem] text-right leading-snug">{error}</span>}
    </span>
  )
}

export function RemoveWorkerButton({
  jobId,
  contractorId,
  contractorName,
  blockedReason,
}: {
  jobId: string
  contractorId: string
  contractorName: string
  /** When set, removal is disabled up-front (committed to pay). */
  blockedReason?: string | null
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (blockedReason) {
    return (
      <span className="text-sage-300 cursor-help" title={blockedReason}>
        —
      </span>
    )
  }

  function doRemove() {
    setError(null)
    startTransition(async () => {
      const res = await removeJobWorker(jobId, contractorId)
      if (res?.error) {
        setError(res.error)
        setConfirming(false)
        return
      }
      router.refresh()
    })
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={doRemove}
          disabled={isPending}
          className="text-[10px] font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {isPending ? 'Removing…' : 'Confirm'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-[10px] text-sage-500 hover:text-sage-700"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        title={`Remove ${contractorName} from this job`}
        className="inline-flex items-center gap-0.5 text-[10px] text-sage-400 hover:text-red-600"
      >
        <Trash2 size={11} />
        Remove
      </button>
      {error && <span className="text-[10px] text-red-600 max-w-[11rem] text-right leading-snug">{error}</span>}
    </span>
  )
}

export function AddWorkerControl({
  jobId,
  options,
}: {
  jobId: string
  /** Active contractors not already assigned to the job. */
  options: ReadonlyArray<{ id: string; full_name: string }>
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function add() {
    if (!selected) {
      setError('Choose a contractor to add.')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await addJobWorker(jobId, selected)
      if (res?.error) {
        setError(res.error)
        return
      }
      setSelected('')
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    if (options.length === 0) return null
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1 text-[11px] text-sage-500 hover:text-sage-700 border border-dashed border-sage-200 rounded px-2 py-1 hover:border-sage-300"
      >
        <Plus size={12} />
        Add contractor
      </button>
    )
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded-md border border-sage-200 px-2.5 py-1.5 text-xs text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500"
      >
        <option value="">Select contractor…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.full_name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={add}
        disabled={isPending}
        className="inline-flex items-center gap-1 bg-sage-500 text-white font-medium px-2.5 py-1 rounded-md text-xs hover:bg-sage-700 disabled:opacity-50"
      >
        <Check size={12} />
        {isPending ? 'Adding…' : 'Add'}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false)
          setError(null)
        }}
        className="text-xs text-sage-500 hover:text-sage-700"
      >
        Cancel
      </button>
      {error && <span className="text-[11px] text-red-600 w-full">{error}</span>}
    </div>
  )
}
