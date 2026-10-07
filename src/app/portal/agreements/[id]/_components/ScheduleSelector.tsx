'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { setAgreementScheduleSelection, setAgreementNoScheduleException } from '../../_actions'

export interface EligibleSchedule {
  id: string
  name: string
  status: string
  paymentMethod: string | null
  paymentBasis: string | null
  agreedAmount: number | null
}

/** Staff pick which eligible (draft/active) schedules this agreement covers.
 *  Selection drives what gets snapshotted on send — nothing is auto-included.
 *  Where eligible schedules exist, staff must select at least one OR set the
 *  explicit no-service-schedule exception (with a reason). */
export function ScheduleSelector({ agreementId, eligible, selectedIds, noSchedules, noScheduleReason }: {
  agreementId: string
  eligible: EligibleSchedule[]
  selectedIds: string[]
  noSchedules: boolean
  noScheduleReason: string | null
}) {
  const router = useRouter()
  const [sel, setSel] = useState<Set<string>>(new Set(selectedIds))
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Exception UI state.
  const [exceptionOpen, setExceptionOpen] = useState(noSchedules)
  const [reason, setReason] = useState(noScheduleReason ?? '')

  const nothingSelected = sel.size === 0
  const mustChoose = eligible.length > 0 && nothingSelected && !noSchedules

  function toggle(id: string) {
    setSel((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
    setSaved(false)
  }

  function save() {
    setErr(null)
    startTransition(async () => {
      const res = await setAgreementScheduleSelection(agreementId, Array.from(sel))
      if (res.error) { setErr(res.error); return }
      // Selecting a schedule clears any prior no-schedule exception.
      if (sel.size > 0 && noSchedules) await setAgreementNoScheduleException(agreementId, false, null)
      setSaved(true)
      router.refresh()
    })
  }

  function saveException(enabled: boolean) {
    setErr(null)
    startTransition(async () => {
      const res = await setAgreementNoScheduleException(agreementId, enabled, enabled ? reason : null)
      if (res.error) { setErr(res.error); return }
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border border-sage-200 bg-white p-5 mb-6">
      <p className="text-sm font-semibold text-sage-800 mb-1">Schedules on this agreement</p>
      <p className="text-[11px] text-sage-400 mb-3">Select which of this contractor&rsquo;s arrangements this agreement covers. Only selected schedules are shown to the contractor and frozen when you send. Nothing is included automatically.</p>

      {eligible.length === 0 ? (
        <p className="text-sm text-sage-400">No eligible (draft or active) schedules for this contractor. This agreement can be sent as a master agreement with no service schedule; add schedules in the contractor&rsquo;s Setup if needed.</p>
      ) : (
        <ul className="space-y-1.5">
          {eligible.map((s) => (
            <li key={s.id}>
              <label className="flex items-center gap-3 rounded-lg border border-sage-100 px-3 py-2 cursor-pointer hover:bg-sage-50/50">
                <input type="checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} className="rounded border-sage-300" />
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-sage-800">{s.name}</span>
                  <span className="text-[11px] text-sage-400 ml-2">{s.status}</span>
                  <span className="block text-xs text-sage-500">
                    {s.paymentMethod ?? '—'}{s.paymentBasis === 'guaranteed_net' ? ' · guaranteed net' : ' · gross fee'}
                    {s.agreedAmount != null && ` · ${formatCurrency(s.agreedAmount)}`}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {mustChoose && (
        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-[13px] text-amber-800 flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0" /> Select at least one service schedule for this agreement.
        </div>
      )}

      <div className="flex items-center gap-3 mt-3">
        <button type="button" onClick={save} disabled={isPending} className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
          <Check size={15} /> {isPending ? 'Saving…' : 'Save selection'}
        </button>
        {saved && <span className="text-xs text-emerald-700">Saved.</span>}
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>

      {/* Explicit no-schedule exception (only relevant when eligible schedules exist). */}
      {eligible.length > 0 && (
        <div className="mt-4 border-t border-sage-100 pt-3">
          {noSchedules ? (
            <div className="rounded-lg bg-sage-50 border border-sage-100 px-3 py-2 text-[13px] text-sage-700 flex items-center justify-between gap-3">
              <span>Master agreement with <span className="font-medium">no service schedule</span> — reason: {noScheduleReason || '—'}</span>
              <button type="button" onClick={() => saveException(false)} disabled={isPending} className="text-xs text-sage-600 underline shrink-0">Undo</button>
            </div>
          ) : !exceptionOpen ? (
            <button type="button" onClick={() => setExceptionOpen(true)} className="text-[13px] text-sage-600 underline">Create master agreement without a service schedule…</button>
          ) : (
            <div className="space-y-2">
              <p className="text-[13px] text-sage-700">Send this contractor agreement with <span className="font-medium">no service schedule</span>. The contractor-facing agreement will state that no schedules are attached (no rate shown). A reason is required and recorded.</p>
              <div className="flex items-center gap-2">
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (e.g. master agreement; schedule to follow)" className="rounded-lg border border-sage-200 px-3 py-2 text-sm w-full" />
                <button type="button" onClick={() => saveException(true)} disabled={isPending || !reason.trim()} className="bg-sage-500 text-white font-semibold px-3 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50 shrink-0">Confirm</button>
                <button type="button" onClick={() => setExceptionOpen(false)} className="text-xs text-sage-500 shrink-0">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
