'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { syncIrdLiabilityLines } from '../../_actions-ird-liability'

// Pulls any approved/paid pay run that never made it onto the ledger.
export function SyncIrdLedgerButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function run() {
    setMsg(null)
    startTransition(async () => {
      const res = await syncIrdLiabilityLines()
      if (res.error) { setMsg(res.error); return }
      const parts: string[] = []
      if (res.created) parts.push(`Added ${res.created} pay run${res.created === 1 ? '' : 's'}.`)
      if (res.skipped) parts.push(`${res.skipped} pay run(s) could not be added.`)
      if (res.paymentsRecorded) parts.push(`Recorded ${res.paymentsRecorded} IRD payment${res.paymentsRecorded === 1 ? '' : 's'} from the bank ($${(res.paymentsAmount ?? 0).toFixed(2)}).`)
      if (res.note) parts.push(res.note)
      setMsg(parts.length ? parts.join(' ') : 'Ledger is up to date.')
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3 mb-6">
      <button disabled={isPending} onClick={run} className="text-sm font-medium text-sage-700 border border-sage-200 rounded-lg px-3 py-1.5 hover:bg-sage-50 disabled:opacity-50">
        {isPending ? 'Checking…' : 'Sync with pay runs + bank'}
      </button>
      {msg && <span className="text-sm text-sage-600">{msg}</span>}
    </div>
  )
}
