'use client'

// Custom review request — a standalone box to send the Google review link to
// anyone (past client, someone met in person): their name, phone and/or email,
// and an editable message. Not tied to a job.

import { useState, useTransition } from 'react'
import { Send, Check, X, MinusCircle, UserPlus } from 'lucide-react'
import { requestCustomReview, type CustomReviewResult } from '../_actions'
import { reviewDefaultMessage } from '@/lib/review-request'

export function CustomReviewRequest() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState(() => reviewDefaultMessage('recent', null))
  const [edited, setEdited] = useState(false)
  const [viaSms, setViaSms] = useState(false)
  const [viaEmail, setViaEmail] = useState(true)
  const [result, setResult] = useState<CustomReviewResult | null>(null)
  const [isPending, startTransition] = useTransition()

  // Keep the greeting in sync with the name until the staffer edits the message.
  function onName(v: string) {
    setName(v)
    if (!edited) setMessage(reviewDefaultMessage('recent', v.trim() || null))
  }

  function send() {
    setResult(null)
    startTransition(async () => {
      const r = await requestCustomReview({ name, phone, email, message, viaSms, viaEmail })
      setResult(r)
      if (r.ok) {
        // Clear the recipient fields for the next send; keep channel prefs.
        setName(''); setPhone(''); setEmail(''); setEdited(false)
        setMessage(reviewDefaultMessage('recent', null))
      }
    })
  }

  const line = (label: string, r?: { status: 'sent' | 'skipped' | 'failed'; detail: string }) => {
    if (!r) return null
    const icon = r.status === 'sent' ? <Check size={12} className="text-emerald-600" />
      : r.status === 'failed' ? <X size={12} className="text-red-600" />
        : <MinusCircle size={12} className="text-sage-400" />
    return <div className="flex items-center gap-1.5 text-[12px] text-sage-600">{icon}<span className="font-medium">{label}:</span> {r.detail}</div>
  }

  const field = 'w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500'

  return (
    <div className="mb-6 rounded-2xl border border-sage-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <UserPlus size={17} className="text-sage-500" />
        <h2 className="text-base font-semibold text-sage-800">Send a custom review request</h2>
      </div>
      <p className="text-[13px] text-sage-500 mb-4">
        For a past client or someone you met in person — enter their details and we&rsquo;ll text or email them your Google review link.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <label className="block">
          <span className="block text-[11px] font-medium text-sage-500 mb-1">Name</span>
          <input value={name} onChange={(e) => onName(e.target.value)} placeholder="First name" className={field} />
        </label>
        <label className="block">
          <span className="block text-[11px] font-medium text-sage-500 mb-1">Phone (for text)</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="021 123 4567" className={field} />
        </label>
        <label className="block">
          <span className="block text-[11px] font-medium text-sage-500 mb-1">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" placeholder="name@email.com" className={field} />
        </label>
      </div>

      <label className="block mb-1">
        <span className="block text-[11px] font-medium text-sage-500 mb-1">Message</span>
        <textarea
          value={message}
          onChange={(e) => { setMessage(e.target.value); setEdited(true) }}
          rows={5}
          className={`${field} resize-y`}
        />
      </label>
      <p className="text-[10px] text-sage-400 mb-3">The Google review link is added automatically — text appends it; email shows a &ldquo;Leave a Google review&rdquo; button.</p>

      <div className="flex items-center gap-4 mb-3">
        <label className="inline-flex items-center gap-1.5 text-sm text-sage-700"><input type="checkbox" checked={viaSms} onChange={(e) => setViaSms(e.target.checked)} className="rounded border-sage-300" /> Text</label>
        <label className="inline-flex items-center gap-1.5 text-sm text-sage-700"><input type="checkbox" checked={viaEmail} onChange={(e) => setViaEmail(e.target.checked)} className="rounded border-sage-300" /> Email</label>
      </div>

      {result?.error && <p className="text-[12px] text-red-600 mb-2">{result.error}</p>}
      {(result?.sms || result?.email) && <div className="space-y-1 mb-3">{line('Text', result?.sms)}{line('Email', result?.email)}</div>}
      {result?.ok && <p className="text-[12px] text-emerald-700 font-medium mb-3">Sent ✓ — ready for the next one.</p>}

      <button type="button" onClick={send} disabled={isPending || (!viaSms && !viaEmail)}
        className="inline-flex items-center gap-1.5 bg-sage-500 text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
        <Send size={14} /> {isPending ? 'Sending…' : 'Send review request'}
      </button>
    </div>
  )
}
