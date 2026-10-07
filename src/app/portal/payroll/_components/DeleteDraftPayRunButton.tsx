'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { Trash2 } from 'lucide-react'
import { deleteDraftPayRun } from '../_actions'

/** Delete a DRAFT pay run (admin only). Draft-only is enforced server-side.
 *  Releases any mileage the draft consumed so it flows into the next run. */
export function DeleteDraftPayRunButton({ payRunId }: { payRunId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function doDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deleteDraftPayRun(payRunId)
      if (res?.error) { setError(res.error); setConfirming(false) }
      else router.refresh()
    })
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirming(true) }}
        className="inline-flex items-center gap-1 text-[12px] text-sage-400 hover:text-red-600 transition-colors"
        title="Delete this draft pay run"
      >
        <Trash2 size={13} />
      </button>
    )
  }
  return (
    <span className="inline-flex items-center gap-2" onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>
      <span className="text-[11px] text-sage-600">Delete draft?</span>
      <button type="button" disabled={isPending} onClick={doDelete} className={clsx('text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded', isPending && 'opacity-60')}>{isPending ? '…' : 'Yes'}</button>
      <button type="button" onClick={() => setConfirming(false)} className="text-[11px] text-sage-500 hover:text-sage-700">Cancel</button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </span>
  )
}
