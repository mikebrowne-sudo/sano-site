'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Check } from 'lucide-react'
import { createPaymentSnapshot, approvePaymentSnapshot } from '../_snapshot-actions'

/** Draft + approve a payment tax snapshot for a schedule as at today. A blocked/
 *  pending calc can be drafted (audit) but the approve action is server-gated to
 *  'ok' only. */
export function SnapshotControls({ contractorId, scheduleId, supplyDate, approvable }: {
  contractorId: string; scheduleId: string; supplyDate: string; approvable: boolean
}) {
  const router = useRouter()
  const [draftId, setDraftId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function draft() {
    setErr(null); setMsg(null)
    startTransition(async () => {
      const res = await createPaymentSnapshot(contractorId, scheduleId, supplyDate)
      if (res.error) { setErr(res.error); return }
      setDraftId(res.id ?? null); setMsg('Draft snapshot saved.')
      router.refresh()
    })
  }
  function approve() {
    if (!draftId) return
    setErr(null); setMsg(null)
    startTransition(async () => {
      const res = await approvePaymentSnapshot(draftId)
      if (res.error) { setErr(res.error); return }
      setMsg('Snapshot approved (payable).')
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t border-sage-50 text-[12px]">
      <button type="button" onClick={draft} disabled={isPending} className="inline-flex items-center gap-1 text-sage-600 hover:text-sage-800 disabled:opacity-50"><Save size={12} /> Save snapshot</button>
      {draftId && approvable && (
        <button type="button" onClick={approve} disabled={isPending} className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 disabled:opacity-50"><Check size={12} /> Approve</button>
      )}
      {msg && <span className="text-emerald-700">{msg}</span>}
      {err && <span className="text-red-600">{err}</span>}
    </div>
  )
}
