'use client'

// Staff control to send the customer a Google-review request after a job
// (SMS and/or email). Wraps the requestReview server action and shows a
// per-channel result. Deliberately manual so staff choose who to ask and
// when.

import { useState, useTransition } from 'react'
import { Star, Check, X, MinusCircle } from 'lucide-react'
import { requestReview, type RequestReviewResult } from '../_actions-review'

export function RequestReviewButton({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false)
  const [sms, setSms] = useState(true)
  const [email, setEmail] = useState(true)
  const [result, setResult] = useState<RequestReviewResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function send() {
    setResult(null)
    startTransition(async () => {
      const res = await requestReview({ jobId, sms, email })
      setResult(res)
    })
  }

  const line = (label: string, r?: { status: 'sent' | 'skipped' | 'failed'; detail: string }) => {
    if (!r) return null
    const icon =
      r.status === 'sent' ? <Check size={12} className="text-emerald-600" />
      : r.status === 'failed' ? <X size={12} className="text-red-600" />
      : <MinusCircle size={12} className="text-sage-400" />
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-sage-600">
        {icon}<span className="font-medium">{label}:</span> {r.detail}
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-700 border border-sage-200 rounded-lg px-3 py-2 hover:bg-sage-50 hover:border-sage-300 transition-colors"
      >
        <Star size={15} className="text-amber-500" />
        Request a Google review
      </button>
    )
  }

  return (
    <div className="bg-white border border-sage-200 rounded-xl p-4 w-full max-w-sm shadow-sm">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-sage-800 mb-2">
        <Star size={15} className="text-amber-500" />
        Request a Google review
      </div>
      <p className="text-[11px] text-sage-500 mb-3">Sends the customer a friendly link to review Sano on Google.</p>
      <div className="flex items-center gap-4 mb-3">
        <label className="inline-flex items-center gap-1.5 text-sm text-sage-700">
          <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} className="rounded border-sage-300" />
          SMS
        </label>
        <label className="inline-flex items-center gap-1.5 text-sm text-sage-700">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="rounded border-sage-300" />
          Email
        </label>
      </div>

      {result?.error && <p className="text-[11px] text-red-600 mb-2">{result.error}</p>}
      {(result?.sms || result?.email) && (
        <div className="space-y-1 mb-3">
          {line('SMS', result?.sms)}
          {line('Email', result?.email)}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={isPending || (!sms && !email)}
          className="inline-flex items-center gap-1 bg-sage-500 text-white font-medium px-3 py-1.5 rounded-md text-sm hover:bg-sage-700 disabled:opacity-50"
        >
          {isPending ? 'Sending…' : 'Send request'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setResult(null) }} className="text-sm text-sage-500 hover:text-sage-700">
          Close
        </button>
      </div>
    </div>
  )
}
