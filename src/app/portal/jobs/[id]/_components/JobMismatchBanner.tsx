'use client'

// Phase 5.5.10 — Job ↔ quote client mismatch banner.
//
// Renders only when the parent passes `mismatch=true`. Offers two
// recoveries: copy the quote's client onto the job, or unlink the
// quote and mark the job as manual.

import { useState, useTransition } from 'react'
import { AlertTriangle } from 'lucide-react'
import { fixJobClientToMatchQuote, unlinkJobQuote } from '../../../clients/_actions-cleanup'

export function JobMismatchBanner({ jobId, quoteNumber }: { jobId: string; quoteNumber: string | null }) {
  const [pending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')
  const [done, setDone] = useState<null | 'fixed' | 'unlinked'>(null)

  function doFix() {
    setErrorMessage('')
    startTransition(async () => {
      const r = await fixJobClientToMatchQuote(jobId)
      if ('error' in r) { setErrorMessage(r.error); return }
      setDone('fixed')
    })
  }
  function doUnlink() {
    setErrorMessage('')
    startTransition(async () => {
      const r = await unlinkJobQuote(jobId)
      if ('error' in r) { setErrorMessage(r.error); return }
      setDone('unlinked')
    })
  }

  if (done) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-4 py-3 mb-4 text-sm">
        {done === 'fixed' ? 'Job client now matches the quote.' : 'Quote unlinked. Job marked as manual.'} Refresh to see the update.
      </div>
    )
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={18} className="text-red-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-800">Client mismatch with linked quote</p>
          <p className="text-xs text-red-700 mt-0.5">
            This job&apos;s client does not match the client on quote {quoteNumber ?? '—'}. Pick one fix:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={doFix}
              disabled={pending}
              className="inline-flex items-center text-xs font-semibold bg-sage-500 text-white px-3 py-1.5 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50"
            >
              {pending ? 'Working…' : 'Set client to match quote'}
            </button>
            <button
              type="button"
              onClick={doUnlink}
              disabled={pending}
              className="inline-flex items-center text-xs font-semibold bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Unlink quote
            </button>
          </div>
          {errorMessage && <p className="text-xs text-red-700 mt-2">{errorMessage}</p>}
        </div>
      </div>
    </div>
  )
}
