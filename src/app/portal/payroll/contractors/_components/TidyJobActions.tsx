'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { excludeFromPay } from '../../_actions-tidy-pay'

export function TidyJobActions({ jobId, contractorId }: { jobId: string; contractorId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function exclude() {
    setErr(null)
    startTransition(async () => {
      const res = await excludeFromPay(jobId, contractorId)
      if ('error' in res && res.error) { setErr(res.error); setConfirming(false); return }
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Link href={`/portal/jobs/${jobId}`} className="inline-flex items-center gap-1 text-xs font-medium text-sage-700 border border-sage-200 px-2.5 py-1 rounded-md hover:bg-sage-50">
        <Pencil size={12} /> Fix
      </Link>
      {confirming ? (
        <span className="inline-flex items-center gap-1.5 text-xs">
          <button type="button" onClick={exclude} disabled={isPending}
            className="font-medium text-red-700 hover:text-red-800 disabled:opacity-50">{isPending ? 'Excluding…' : 'Write off'}</button>
          <button type="button" onClick={() => setConfirming(false)} disabled={isPending} className="text-sage-500 hover:text-sage-700">Cancel</button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirming(true)}
          className="text-xs font-medium text-sage-500 hover:text-red-600">Exclude</button>
      )}
      {err && <span className="text-[10px] text-red-600">{err}</span>}
    </div>
  )
}
