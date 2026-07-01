'use client'

// Allowed-hours pay model (2026-06) — per-worker extra-hours control.
//
// Renders in the Labour & Margin worker breakdown, replacing the old
// actual-hours editor. Default pay is the allowed hours; this control
// is only for the exception where a job ran over.
//
//   • none / rejected → staff can record extra hours + a reason.
//   • pending         → amber chip; staff can edit; admin sees
//                       Approve / Decline.
//   • approved        → emerald chip (counts toward margin + pay).
//   • locked (worker already in a pay run / paid) → read-only chip.
//
// Recording is staff-level; Approve / Decline are admin-only and only
// rendered when the page passes isAdmin.

import { useState, useTransition } from 'react'
import { Plus, Check, X, Clock, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { recordExtraHours, approveExtraHours, rejectExtraHours } from '../_actions-extra-hours'

export interface ExtraHoursControlProps {
  jobId: string
  contractorId: string
  contractorName: string
  /** Allowed hours for this worker. When known, staff enter the ACTUAL
   *  hours worked and the stored adjustment (extra_hours) is derived as
   *  actual − allowed. Null falls back to the legacy +/- delta entry. */
  allowedHours: number | null
  extraHours: number
  extraStatus: string // none | pending | approved | rejected
  extraReason: string | null
  isAdmin: boolean
  locked: boolean // worker is in a pay run / paid — no edits
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function fmtHours(n: number): string {
  return `${round2(n)}h`
}

export function ExtraHoursControl(props: ExtraHoursControlProps) {
  const router = useRouter()
  const allowed = props.allowedHours
  // When allowed hours are known, the input represents ACTUAL hours worked
  // and the stored adjustment is derived (actual − allowed). Otherwise fall
  // back to the legacy signed +/- delta entry.
  const actualMode = allowed != null
  // Current effective actual = allowed + current adjustment.
  const currentActual = actualMode ? round2((allowed as number) + (props.extraHours ?? 0)) : null

  const [editing, setEditing] = useState(false)
  const [hours, setHours] = useState<string>(props.extraHours ? String(props.extraHours) : '')
  const [reason, setReason] = useState(props.extraReason ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const status = props.extraStatus || 'none'
  const has = (props.extraHours ?? 0) !== 0 && status !== 'none'

  function run(fn: () => Promise<{ ok?: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if (res?.error) { setError(res.error); return }
      setEditing(false)
      router.refresh()
    })
  }

  /** Open the editor. In actual mode we prefill the actual-hours field; a
   *  fresh adjustment defaults to the allowed hours so staff just type the
   *  real figure. */
  function open() {
    if (actualMode) {
      setHours(has ? String(currentActual) : String(allowed))
    } else {
      setHours(props.extraHours ? String(props.extraHours) : '')
    }
    setReason(has ? (props.extraReason ?? '') : '')
    setError(null)
    setEditing(true)
  }

  // Live adjustment implied by the current input (actual mode only).
  const parsed = Number(hours)
  const liveDelta =
    actualMode && hours.trim() !== '' && Number.isFinite(parsed)
      ? round2(parsed - (allowed as number))
      : null

  function save() {
    const n = Number(hours)
    if (hours.trim() === '' || !Number.isFinite(n)) {
      setError(actualMode ? 'Enter the actual hours worked.' : 'Enter a number of hours (0 to clear).')
      return
    }
    let delta: number
    if (actualMode) {
      if (n < 0) { setError('Hours can’t be negative.'); return }
      delta = round2(n - (allowed as number))
    } else {
      delta = n
    }
    if (delta !== 0 && !reason.trim()) { setError('Add a short reason for the change.'); return }
    run(() => recordExtraHours(props.jobId, props.contractorId, delta, reason))
  }

  // Signed display, e.g. "+2h" / "-1h".
  const signed = (n: number) => `${n > 0 ? '+' : ''}${fmtHours(n)}`

  // ---- Editor ----------------------------------------------------------
  if (editing) {
    return (
      <div className="text-left bg-white border border-sage-200 rounded-lg p-3 space-y-2 w-60 shadow-sm">
        <div className="text-xs font-semibold text-sage-800">
          {actualMode ? 'Actual hours worked' : 'Hours adjustment'} — {props.contractorName}
        </div>
        {actualMode && (
          <div className="text-[11px] text-sage-500">
            Allowed <span className="font-semibold text-sage-700">{fmtHours(allowed as number)}</span>
          </div>
        )}
        <input
          type="number" step="0.25" min={actualMode ? 0 : undefined} value={hours} autoFocus
          onChange={(e) => setHours(e.target.value)}
          placeholder={actualMode ? 'e.g. 5' : '+ over / − early'}
          className="w-full rounded-md border border-sage-200 px-2.5 py-1.5 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500"
        />
        <textarea
          value={reason} rows={2}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (e.g. extra room, or finished early)"
          className="w-full rounded-md border border-sage-200 px-2.5 py-1.5 text-xs text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500"
        />
        {actualMode ? (
          <p className="text-[10px] text-sage-400 leading-snug">
            {liveDelta == null || liveDelta === 0
              ? 'Enter the hours actually worked. Matching the allowed hours clears any adjustment.'
              : `Adjustment ${signed(liveDelta)} vs allowed. Saved as pending until an admin signs off.`}
          </p>
        ) : (
          <p className="text-[10px] text-sage-400 leading-snug">+ adds hours, − reduces. Set to 0 to clear. Saved as pending until an admin signs off.</p>
        )}
        {error && <p className="text-[11px] text-red-600">{error}</p>}
        <div className="flex items-center gap-2 pt-0.5">
          <button type="button" onClick={save} disabled={isPending}
            className="inline-flex items-center gap-1 bg-sage-500 text-white font-medium px-2.5 py-1 rounded-md text-xs hover:bg-sage-700 disabled:opacity-50">
            <Check size={12} />{isPending ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => { setEditing(false); setError(null) }}
            className="text-xs text-sage-500 hover:text-sage-700">Cancel</button>
        </div>
      </div>
    )
  }

  // ---- Read-only / chip states ----------------------------------------
  const chip = (cls: string, icon: React.ReactNode, label: string) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${cls}`} title={props.extraReason ?? undefined}>
      {icon}{label}
    </span>
  )

  if (!has) {
    // none / rejected with no live figure → offer to add (unless locked).
    if (props.locked) return <span className="text-sage-300">—</span>
    return (
      <button type="button" onClick={open}
        className="inline-flex items-center gap-1 text-[11px] text-sage-500 hover:text-sage-700 border border-dashed border-sage-200 rounded px-2 py-0.5 hover:border-sage-300">
        <Plus size={11} />{actualMode ? 'Set hours' : 'Adjust'}
      </button>
    )
  }

  const editable = !props.locked && (status === 'pending' || status === 'rejected')

  return (
    <span className="inline-flex flex-col items-end gap-1">
      {status === 'approved' && chip('text-emerald-700 bg-emerald-50', <Check size={11} />, `${signed(props.extraHours)} approved`)}
      {status === 'pending' && chip('text-amber-700 bg-amber-50', <Clock size={11} />, `${signed(props.extraHours)} pending`)}
      {status === 'rejected' && chip('text-sage-500 bg-sage-50 line-through', <X size={11} />, signed(props.extraHours))}

      {error && <span className="text-[10px] text-red-600">{error}</span>}

      <span className="inline-flex items-center gap-2">
        {editable && (
          <button type="button" onClick={open}
            className="inline-flex items-center gap-0.5 text-[10px] text-sage-500 hover:text-sage-700">
            <Pencil size={10} />Edit
          </button>
        )}
        {props.isAdmin && status === 'pending' && (
          <>
            <button type="button" disabled={isPending}
              onClick={() => run(() => approveExtraHours(props.jobId, props.contractorId))}
              className="text-[10px] font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-50">Approve</button>
            <button type="button" disabled={isPending}
              onClick={() => run(() => rejectExtraHours(props.jobId, props.contractorId))}
              className="text-[10px] font-medium text-red-600 hover:text-red-700 disabled:opacity-50">Decline</button>
          </>
        )}
      </span>
    </span>
  )
}
