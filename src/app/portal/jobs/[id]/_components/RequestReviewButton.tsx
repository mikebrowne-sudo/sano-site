'use client'

// Staff control to send a customer a Google-review request (SMS and/or email),
// with an editable message and recent/previous templates. Shown on the job page
// and in the Reviews tab. Manual by design — staff choose who, when and how.

import { useState, useTransition } from 'react'
import { Star, Check, X, MinusCircle } from 'lucide-react'
import { requestReview, type RequestReviewResult } from '../_actions-review'
import { reviewDefaultMessage, type ReviewVariant } from '@/lib/review-request'

export function RequestReviewButton({
  jobId,
  clientName = null,
  defaultVariant = 'recent',
}: {
  jobId: string
  clientName?: string | null
  defaultVariant?: ReviewVariant
}) {
  const [open, setOpen] = useState(false)
  const [sms, setSms] = useState(false)
  const [email, setEmail] = useState(true)
  const [variant, setVariant] = useState<ReviewVariant>(defaultVariant)
  const [message, setMessage] = useState(() => reviewDefaultMessage(defaultVariant, clientName))
  const [edited, setEdited] = useState(false)
  const [result, setResult] = useState<RequestReviewResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function pickVariant(v: ReviewVariant) {
    setVariant(v)
    if (!edited) setMessage(reviewDefaultMessage(v, clientName))
  }

  function send(force = false) {
    setResult(null)
    startTransition(async () => {
      setResult(await requestReview({ jobId, sms, email, variant, message, force }))
    })
  }

  const line = (label: string, r?: { status: 'sent' | 'skipped' | 'failed'; detail: string }) => {
    if (!r) return null
    const icon = r.status === 'sent' ? <Check size={12} className="text-emerald-600" />
      : r.status === 'failed' ? <X size={12} className="text-red-600" />
        : <MinusCircle size={12} className="text-sage-400" />
    return <div className="flex items-center gap-1.5 text-[11px] text-sage-600">{icon}<span className="font-medium">{label}:</span> {r.detail}</div>
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-700 border border-sage-200 rounded-lg px-3 py-2 hover:bg-sage-50 hover:border-sage-300 transition-colors">
        <Star size={15} className="text-amber-500" /> Request a Google review
      </button>
    )
  }

  const sent = result?.ok

  return (
    <div className="bg-white border border-sage-200 rounded-xl p-4 w-full max-w-md shadow-sm">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-sage-800 mb-2">
        <Star size={15} className="text-amber-500" /> Request a Google review
      </div>

      <div className="inline-flex p-0.5 rounded-lg bg-sage-50 border border-sage-100 mb-3 text-xs">
        <button type="button" onClick={() => pickVariant('recent')} className={variant === 'recent' ? 'px-2.5 py-1 rounded-md bg-white shadow-sm font-medium text-sage-800' : 'px-2.5 py-1 text-sage-500'}>Recent clean</button>
        <button type="button" onClick={() => pickVariant('previous')} className={variant === 'previous' ? 'px-2.5 py-1 rounded-md bg-white shadow-sm font-medium text-sage-800' : 'px-2.5 py-1 text-sage-500'}>Previous client</button>
      </div>

      <label className="block mb-1">
        <span className="text-[11px] font-medium text-sage-500">Message (edit if you like)</span>
        <textarea
          value={message}
          onChange={(e) => { setMessage(e.target.value); setEdited(true) }}
          rows={5}
          className="w-full mt-1 rounded-lg border border-sage-200 px-3 py-2 text-[13px] text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 resize-y"
        />
      </label>
      <p className="text-[10px] text-sage-400 mb-3">{message.trim().length} chars. The Google link is added automatically — SMS appends it; email shows a &ldquo;Leave a Google review&rdquo; button.</p>

      <div className="flex items-center gap-4 mb-3">
        <label className="inline-flex items-center gap-1.5 text-sm text-sage-700"><input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} className="rounded border-sage-300" /> SMS</label>
        <label className="inline-flex items-center gap-1.5 text-sm text-sage-700"><input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="rounded border-sage-300" /> Email</label>
      </div>

      {result?.error && (
        <div className="mb-2">
          <p className="text-[11px] text-red-600">{result.error}</p>
          {result.alreadyRequested && (
            <button type="button" onClick={() => send(true)} disabled={isPending} className="mt-1 text-[11px] font-medium text-amber-700 underline">Send anyway</button>
          )}
        </div>
      )}
      {(result?.sms || result?.email) && <div className="space-y-1 mb-3">{line('SMS', result?.sms)}{line('Email', result?.email)}</div>}

      <div className="flex items-center gap-3">
        <button type="button" onClick={() => send(false)} disabled={isPending || (!sms && !email) || sent}
          className="inline-flex items-center gap-1 bg-sage-500 text-white font-medium px-3 py-1.5 rounded-md text-sm hover:bg-sage-700 disabled:opacity-50">
          {isPending ? 'Sending…' : sent ? 'Sent ✓' : 'Send request'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setResult(null) }} className="text-sm text-sage-500 hover:text-sage-700">Close</button>
      </div>
    </div>
  )
}
