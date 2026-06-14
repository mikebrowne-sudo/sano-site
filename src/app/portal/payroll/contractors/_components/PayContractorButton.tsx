'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet } from 'lucide-react'
import { payContractor } from '../../_actions-pay-contractor'

export function PayContractorButton({ contractorId, name, total }: { contractorId: string; name: string; total: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function pay() {
    setErr(null)
    startTransition(async () => {
      const res = await payContractor(contractorId)
      if ('error' in res && res.error) { setErr(res.error); setConfirming(false); return }
      setConfirming(false)
      router.refresh()
    })
  }

  if (!confirming) {
    return (
      <div className="inline-flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          <Wallet size={15} /> Pay
        </button>
        {err && <span className="text-[11px] text-red-600 max-w-[200px] text-right">{err}</span>}
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs text-sage-600">Pay {name.split(/\s+/)[0]} {total}?</span>
      <button type="button" onClick={pay} disabled={isPending}
        className="bg-sage-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs hover:bg-sage-700 disabled:opacity-50">
        {isPending ? 'Paying…' : 'Confirm'}
      </button>
      <button type="button" onClick={() => setConfirming(false)} disabled={isPending}
        className="text-xs text-sage-500 hover:text-sage-700">Cancel</button>
    </div>
  )
}
