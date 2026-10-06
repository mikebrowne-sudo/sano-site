'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Wand2 } from 'lucide-react'
import { autoReconcileBank } from '../_actions'
import type { AutoReconcileSummary } from '../_auto'

export function autoSummaryText(s: AutoReconcileSummary): string {
  const parts: string[] = []
  if (s.matched > 0) {
    parts.push(`Auto-reconciled ${s.matched} payment${s.matched !== 1 ? 's' : ''} ($${s.matchedAmount.toLocaleString('en-NZ', { minimumFractionDigits: 2 })})`
      + (s.markedPaid > 0 ? `, marking ${s.markedPaid} invoice${s.markedPaid !== 1 ? 's' : ''} paid` : ''))
  } else {
    parts.push('No new payments could be matched automatically')
  }
  if (s.backfilled > 0) parts.push(`linked ${s.backfilled} earlier payment${s.backfilled !== 1 ? 's' : ''} to their invoices`)
  parts.push(s.needsReview > 0 ? `${s.needsReview} left for you to check` : 'nothing left to check')
  return parts.join(' · ') + '.'
}

export function AutoReconcileButton() {
  const router = useRouter()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function run() {
    setMsg(null)
    setErr(null)
    startTransition(async () => {
      const r = await autoReconcileBank()
      if (!r.ok || !r.summary) { setErr(r.error ?? 'Auto-reconcile failed.'); return }
      setMsg(autoSummaryText(r.summary) + (r.summary.failures.length ? ` ${r.summary.failures.length} could not be saved: ${r.summary.failures.join('; ')}` : ''))
      router.refresh()
    })
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={run}
        disabled={isPending}
        className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50 text-sm"
      >
        <Wand2 size={16} /> {isPending ? 'Reconciling…' : 'Auto-reconcile now'}
      </button>
      <p className="text-xs text-sage-400 mt-1.5">
        Matches payments by invoice reference, known payer (incl. recurring clients) and exact bundles. Anything uncertain is left for you. Runs automatically after every import; every match can be reversed.
      </p>
      {msg && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 mt-2">{msg}</p>}
      {err && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3 mt-2">{err}</p>}
    </div>
  )
}
