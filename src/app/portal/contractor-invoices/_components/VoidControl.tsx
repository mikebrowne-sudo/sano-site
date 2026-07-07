'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, X, Loader2, AlertTriangle } from 'lucide-react'
import { voidContractorPayable, voidRemittanceBatch } from '../_actions-void-pay'

interface VoidControlProps {
  kind: 'payable' | 'remittance'
  id: string
  /** Optional label override for the trigger button. */
  label?: string
  /** Where to send the operator after a remittance is voided. */
  redirectTo?: string
}

export function VoidControl({ kind, id, label, redirectTo }: VoidControlProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const trigger = label ?? (kind === 'payable' ? 'Void / redo' : 'Void remittance')

  function submit() {
    setErr(null)
    if (!reason.trim()) { setErr('Enter a reason.'); return }
    startTransition(async () => {
      const res = kind === 'payable'
        ? await voidContractorPayable(id, reason)
        : await voidRemittanceBatch(id, reason)
      if (res?.error) { setErr(res.error); return }
      setOpen(false)
      if (kind === 'remittance' && redirectTo) router.push(redirectTo)
      else router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setErr(null); setReason(''); setOpen(true) }}
        className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-medium border border-amber-200 bg-amber-50 px-2.5 py-1 rounded-md hover:bg-amber-100 transition-colors"
      >
        <RotateCcw size={12} /> {trigger}
      </button>
    )
  }

  return (
    <div className="bg-white border border-amber-200 rounded-lg p-3 space-y-2 w-full max-w-sm shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-amber-800 inline-flex items-center gap-1.5">
          <AlertTriangle size={14} /> {kind === 'payable' ? 'Void this contractor pay?' : 'Void this remittance?'}
        </span>
        <button type="button" onClick={() => setOpen(false)} className="text-sage-400 hover:text-sage-600"><X size={15} /></button>
      </div>
      <p className="text-[11px] text-sage-500 leading-relaxed">
        {kind === 'payable'
          ? 'Marks the payable as voided (kept for audit) so the job can be approved for pay again with the correct amount.'
          : 'Deletes this remittance and reverts its payables to approved (un-marks them paid) so they can be corrected or voided. Use only when no money has actually left the bank for it.'}
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Reason (required) — e.g. wrong amount approved by staff, redoing"
        className="w-full rounded-md border border-sage-200 px-2 py-1.5 text-sm text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      {err && <p className="text-red-600 text-xs">{err}</p>}
      <div className="flex items-center gap-2">
        <button type="button" onClick={submit} disabled={pending}
          className="inline-flex items-center gap-1.5 bg-amber-600 text-white font-semibold px-3 py-1.5 rounded-md text-xs hover:bg-amber-700 disabled:opacity-50">
          {pending ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
          {pending ? 'Voiding…' : 'Void'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-sage-600 hover:text-sage-800">Cancel</button>
      </div>
    </div>
  )
}
