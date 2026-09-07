'use client'

// One-click: pull newly-approved mileage into this DRAFT pay run.
//
// Replaces the old advice to delete and recreate the run (or raise a separate
// mileage-only catch-up run) — the operator just wants the mileage in the pay
// run they are already looking at.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus } from 'lucide-react'
import { refreshPayRunMileage } from '../_actions-refresh-mileage'

export function AddMileageToRunButton({ payRunId }: { payRunId: string }) {
  const router = useRouter()
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function run() {
    setErr(null)
    startTransition(async () => {
      const res = await refreshPayRunMileage(payRunId)
      if ('error' in res) { setErr(res.error); return }
      router.refresh()
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
        Add this mileage to the pay run
      </button>
      {err && <p className="mt-1.5 text-xs text-red-700">{err}</p>}
    </div>
  )
}
