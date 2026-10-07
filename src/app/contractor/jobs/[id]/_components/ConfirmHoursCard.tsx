'use client'

// "Did this job go to plan?" — the contractor's one-tap confirmation.
//
// Deliberately NOT a timesheet. Under the allowed-hours model the hours were
// agreed when the job was created, so the contractor isn't computing anything —
// they're answering one question about a figure already shown to them.
//
// Yes → done in one tap. Took longer → a short form, and the overrun goes to
// Carol for sign-off (the contractor's figure never moves pay on its own).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Clock, Loader2, AlertTriangle } from 'lucide-react'
import { confirmJobHours } from '../_actions-confirm-hours'
import { formatHours, type HoursConfirmedStatus } from '@/lib/hours-confirmation'

export function ConfirmHoursCard({
  jobId,
  hours,
  status,
  note,
}: {
  jobId: string
  hours: number | null
  status: HoursConfirmedStatus
  note: string | null
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'ask' | 'over'>('ask')
  const [extraHours, setExtraHours] = useState('')
  const [reason, setReason] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Already answered — show it back, no further action.
  if (status === 'as_planned') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
        <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Hours confirmed</p>
          <p className="text-sm text-emerald-700 mt-0.5">
            You confirmed this job took {formatHours(hours)}. Thanks.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'took_longer') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Extra hours submitted</p>
          <p className="text-sm text-amber-800 mt-0.5">
            You&rsquo;ve told us this one ran over. Sano will review it before it&rsquo;s paid.
          </p>
          {note && <p className="text-xs text-amber-700 mt-1.5 italic">&ldquo;{note}&rdquo;</p>}
        </div>
      </div>
    )
  }

  function answer(kind: 'as_planned' | 'took_longer') {
    setErr(null)
    startTransition(async () => {
      const res = await confirmJobHours(
        kind === 'as_planned'
          ? { jobId, answer: 'as_planned' }
          : { jobId, answer: 'took_longer', extraHours: Number(extraHours), note: reason },
      )
      if ('error' in res) { setErr(res.error); return }
      router.refresh()
    })
  }

  return (
    <div className="bg-white border-2 border-sage-300 rounded-2xl p-4">
      <p className="text-base font-semibold text-sage-800">
        Did this job go to plan?
      </p>
      <p className="text-sm text-sage-600 mt-1">
        This job was set at <strong>{formatHours(hours)}</strong>. Confirm so we can pay it.
      </p>

      {mode === 'ask' ? (
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => answer('as_planned')}
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold px-6 py-4 rounded-2xl text-base hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 min-h-[52px]"
          >
            {pending ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            Yes, as planned
          </button>
          <button
            type="button"
            onClick={() => setMode('over')}
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 bg-white border-2 border-sage-300 text-sage-700 font-semibold px-6 py-4 rounded-2xl text-base hover:bg-sage-50 disabled:opacity-50 min-h-[52px]"
          >
            <Clock size={18} />
            It took longer
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="block text-sm font-semibold text-sage-700 mb-1.5">
              How many extra hours?
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.25"
              min="0"
              value={extraHours}
              onChange={(e) => setExtraHours(e.target.value)}
              placeholder="e.g. 1.5"
              className="w-full rounded-xl border-2 border-sage-300 px-4 py-3 text-base text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-sage-700 mb-1.5">
              What made it take longer?
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. oven needed a second pass, extra rubbish to remove"
              className="w-full rounded-xl border-2 border-sage-300 px-4 py-3 text-base text-sage-800 resize-y focus:outline-none focus:ring-2 focus:ring-sage-500"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => answer('took_longer')}
              disabled={pending}
              className="flex-1 flex items-center justify-center gap-2 bg-sage-700 text-white font-semibold px-4 py-4 rounded-2xl text-base hover:bg-sage-800 disabled:opacity-50 min-h-[52px]"
            >
              {pending ? <Loader2 size={18} className="animate-spin" /> : null}
              Submit
            </button>
            <button
              type="button"
              onClick={() => { setMode('ask'); setErr(null) }}
              disabled={pending}
              className="px-5 py-4 rounded-2xl border-2 border-sage-200 text-sage-600 font-semibold min-h-[52px]"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {err && (
        <p className="mt-3 flex items-start gap-1.5 text-sm text-red-700">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          {err}
        </p>
      )}
    </div>
  )
}
