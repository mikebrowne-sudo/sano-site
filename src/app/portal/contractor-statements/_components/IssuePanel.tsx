'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send, RefreshCw, AlertTriangle, Mail } from 'lucide-react'
import { issueContractorStatement, resendStatementIssueEmail } from '../_actions-issue'
import { supersedeContractorStatement } from '../_actions-supersede'

function defaultReviewDue() {
  const d = new Date(Date.now() + 5 * 86400000)
  return d.toISOString().slice(0, 10)
}

export function IssuePanel({
  statementId,
  status,
  lineCount,
  gstReviewCount,
  emailSent,
}: {
  statementId: string
  status: string
  lineCount: number
  gstReviewCount: number
  emailSent: boolean | null // null = n/a (draft); true/false once issued
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [reviewDue, setReviewDue] = useState(defaultReviewDue())
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [supersedeOpen, setSupersedeOpen] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  function reset() { setMsg(null); setErr(null) }

  function issue() {
    reset()
    startTransition(async () => {
      const res = await issueContractorStatement({ id: statementId, review_due_at: reviewDue })
      if (res.error) { setErr(res.error); return }
      setConfirming(false)
      setMsg(res.emailSent ? 'Issued and emailed to the contractor.' : `Issued — but the email did not send${res.emailError ? ` (${res.emailError})` : ''}. Use Resend.`)
      router.refresh()
    })
  }

  function resend() {
    reset()
    startTransition(async () => {
      const res = await resendStatementIssueEmail(statementId)
      if (res.error) { setErr(res.error); return }
      setMsg(res.emailSent ? 'Email re-sent.' : `Still could not send${res.emailError ? ` (${res.emailError})` : ''}.`)
      router.refresh()
    })
  }

  function supersede() {
    reset()
    if (!reason.trim()) { setErr('A reason is required to supersede.'); return }
    startTransition(async () => {
      const res = await supersedeContractorStatement({ id: statementId, reason: reason.trim() })
      if (res.error) { setErr(res.error); return }
      setMsg(`Superseded. ${res.released_ci_ids?.length ?? 0} payable(s) released — regenerate the draft to re-issue.`)
      setSupersedeOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-xl border border-sage-100 shadow-sm p-5 mb-6 max-w-2xl">
      {status === 'draft' && (
        <div>
          <h2 className="text-lg font-semibold text-sage-800 mb-3">Issue to contractor</h2>
          {!confirming ? (
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <label className="block">
                <span className="block text-sm font-semibold text-sage-800 mb-1.5">Review deadline</span>
                <input type="date" value={reviewDue} onChange={(e) => setReviewDue(e.target.value)} className="rounded-lg border border-sage-200 px-4 py-2.5 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
              </label>
              <button onClick={() => setConfirming(true)} disabled={isPending || lineCount === 0} className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
                <Send size={14} /> Issue
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-sage-200 bg-sage-50 p-4">
              <p className="text-sm text-sage-700">Issue this statement to the contractor with a review deadline of <strong>{reviewDue}</strong>? This locks its contents and emails the contractor.</p>
              {gstReviewCount > 0 && (
                <p className="mt-2 flex items-start gap-2 text-sm text-amber-800">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span><strong>{gstReviewCount}</strong> line(s) have GST treatment still awaiting verification. They will show &ldquo;awaiting verification&rdquo; to the contractor. Issue anyway?</span>
                </p>
              )}
              <div className="flex items-center gap-3 mt-3">
                <button onClick={issue} disabled={isPending} className="bg-sage-600 text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">{isPending ? 'Issuing…' : 'Confirm issue'}</button>
                <button onClick={() => setConfirming(false)} className="text-sm text-sage-600 hover:text-sage-800">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {status === 'issued' && (
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-sage-800">Issued</h2>
              <p className={`text-sm mt-0.5 ${emailSent ? 'text-sage-500' : 'text-amber-700'}`}>
                {emailSent ? 'Contractor emailed.' : 'Issued — email not sent.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={resend} disabled={isPending} className="inline-flex items-center gap-2 bg-white border border-sage-200 text-sage-700 font-medium px-4 py-2 rounded-lg text-sm hover:bg-sage-50 disabled:opacity-50">
                <Mail size={14} /> {emailSent ? 'Resend' : 'Send email'}
              </button>
              <button onClick={() => setSupersedeOpen((v) => !v)} disabled={isPending} className="inline-flex items-center gap-2 bg-white border border-amber-300 text-amber-800 font-medium px-4 py-2 rounded-lg text-sm hover:bg-amber-50 disabled:opacity-50">
                <RefreshCw size={14} /> Supersede
              </button>
            </div>
          </div>
          {supersedeOpen && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800 mb-2">Superseding preserves this issued statement as a record, releases its payables, and lets you regenerate a corrected draft. Give a reason:</p>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. missed a late-approved job" className="w-full rounded-lg border border-sage-200 px-4 py-2.5 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
              <div className="flex items-center gap-3 mt-3">
                <button onClick={supersede} disabled={isPending} className="bg-amber-600 text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">{isPending ? 'Superseding…' : 'Confirm supersede'}</button>
                <button onClick={() => setSupersedeOpen(false)} className="text-sm text-sage-600 hover:text-sage-800">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {status === 'superseded' && (
        <p className="text-sm text-sage-500">This statement was superseded. Its payables have been released; regenerate the period&rsquo;s draft to re-issue.</p>
      )}

      {msg && <p className="text-sm text-sage-700 bg-sage-50 rounded-lg px-4 py-2 mt-3">{msg}</p>}
      {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 mt-3">{err}</p>}
    </div>
  )
}
