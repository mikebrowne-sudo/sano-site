'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { Ban } from 'lucide-react'
import { voidAgreement } from '../../_actions'

/** Pull a sent-but-unsigned agreement so its link can no longer be signed. */
export function VoidAgreementButton({ agreementId }: { agreementId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function doVoid() {
    setError(null)
    startTransition(async () => {
      const res = await voidAgreement(agreementId)
      if (res?.error) setError(res.error)
      else { setConfirming(false); router.refresh() }
    })
  }

  return (
    <div className="mt-3 pt-3 border-t border-sage-100">
      {!confirming ? (
        <button
          type="button" onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-sage-500 hover:text-red-600"
        >
          <Ban size={13} /> Void / pull this agreement
        </button>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] text-sage-700">Withdraw this copy so it can’t be signed?</span>
          <button type="button" disabled={isPending} onClick={doVoid}
            className={clsx('text-[12px] font-semibold text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded', isPending && 'opacity-60')}>
            {isPending ? '…' : 'Yes, void it'}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="text-[12px] text-sage-500 hover:text-sage-700">Cancel</button>
        </div>
      )}
      <p className="text-[11px] text-sage-400 mt-1.5">Use this if the terms changed. Sending a new link re-activates it.</p>
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
    </div>
  )
}
