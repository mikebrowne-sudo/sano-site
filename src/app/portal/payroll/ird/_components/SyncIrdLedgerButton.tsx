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
      setMsg(res.created
        ? `Added ${res.created} pay run${res.created === 1 ? '' : 's'} to the ledger.${res.skipped ? ` ${res.skipped} could not be added.` : ''}`
        : res.skipped ? `${res.skipped} pay run(s) could not be added.` : 'Ledger is up to date.')
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3 mb-6">
      <button disabled={isPending} onClick={run} className="text-sm font-medium text-sage-700 border border-sage-200 rounded-lg px-3 py-1.5 hover:bg-sage-50 disabled:opacity-50">
        {isPending ? 'Checking…' : 'Add missing pay runs'}
      </button>
      {msg && <span className="text-sm text-sage-600">{msg}</span>}
    </div>
  )
}
