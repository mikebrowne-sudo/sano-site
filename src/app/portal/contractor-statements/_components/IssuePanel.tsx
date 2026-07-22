'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send, RefreshCw, AlertTriangle, Mail, CalendarClock, UserCheck, CheckCircle2 } from 'lucide-react'
import { issueContractorStatement, resendStatementIssueEmail } from '../_actions-issue'
import { supersedeContractorStatement } from '../_actions-supersede'
import { confirmStatementOnBehalf, extendReviewDeadline } from '../_actions-confirm'

function plusDaysDate(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Pacific/Auckland' })
}

type ActionResult = { error?: string; ok?: boolean; issued?: boolean; emailSent?: boolean; emailError?: string }

export function IssuePanel({
  statementId,
  status,
  lineCount,
  gstReviewCount,
  emailSent,
  reviewDueAt,
  confirmedSource,
}: {
  statementId: string
  status: string
  lineCount: number
  gstReviewCount: number
  emailSent: boolean | null
  reviewDueAt: string | null
  confirmedSource: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [reviewDue, setReviewDue] = useState(plusDaysDate(5))
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [supersedeOpen, setSupersedeOpen] = useState(false)
  const [extendOpen, setExtendOpen] = useState(false)
  const [extendDate, setExtendDate] = useState(plusDaysDate(5))
  const [extendReason, setExtendReason] = useState('')
  const [behalfOpen, setBehalfOpen] = useState(false)
  const [behalfReason, setBehalfReason] = useState('')
  const [behalfOverride, setBehalfOverride] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const pastDeadline = !!reviewDueAt && Date.now() > new Date(reviewDueAt).getTime()

  function reset() { setMsg(null); setErr(null) }
  function run(fn: () => Promise<ActionResult>, onOk: (r: ActionResult) => void) {
    reset()
    startTransition(async () => {
      const res = await fn()
      if (res.error) { setErr(res.error); return }
      onOk(res)
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
              <p className="text-sm text-sage-700">Issue this statement with a review deadline of <strong>{reviewDue}</strong>? This locks its contents and emails the contractor.</p>
              {gstReviewCount > 0 && (
                <p className="mt-2 flex items-start gap-2 text-sm text-amber-800">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span><strong>{gstReviewCount}</strong> line(s) have no confirmed GST amount (the contractor sees no GST on those lines). Issue anyway?</span>
                </p>
              )}
              <div className="flex items-center gap-3 mt-3">
                <button onClick={() => run(() => issueContractorStatement({ id: statementId, review_due_at: reviewDue }), (r) => { setConfirming(false); setMsg(r.emailSent ? 'Issued and emailed.' : `Issued — email not sent${r.emailError ? ` (${r.emailError})` : ''}. Use Resend.`) })} disabled={isPending} className="bg-sage-600 text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">{isPending ? 'Issuing…' : 'Confirm issue'}</button>
                <button onClick={() => setConfirming(false)} className="text-sm text-sage-600 hover:text-sage-800">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {status === 'issued' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-sage-800">Issued</h2>
              <p className={`text-sm mt-0.5 ${emailSent ? 'text-sage-500' : 'text-amber-700'}`}>
                {emailSent ? 'Contractor emailed.' : 'Issued — email not sent.'} · Review by {fmtDate(reviewDueAt)}{pastDeadline ? ' (overdue)' : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => run(() => resendStatementIssueEmail(statementId), (r) => setMsg(r.emailSent ? 'Email re-sent.' : `Still could not send${r.emailError ? ` (${r.emailError})` : ''}.`))} disabled={isPending} className="inline-flex items-center gap-2 bg-white border border-sage-200 text-sage-700 font-medium px-3 py-2 rounded-lg text-sm hover:bg-sage-50 disabled:opacity-50"><Mail size={14} /> {emailSent ? 'Resend' : 'Send email'}</button>
              <button onClick={() => setExtendOpen((v) => !v)} disabled={isPending} className="inline-flex items-center gap-2 bg-white border border-sage-200 text-sage-700 font-medium px-3 py-2 rounded-lg text-sm hover:bg-sage-50 disabled:opacity-50"><CalendarClock size={14} /> Extend</button>
              <button onClick={() => setBehalfOpen((v) => !v)} disabled={isPending || !pastDeadline} title={pastDeadline ? '' : 'Available after the review deadline'} className="inline-flex items-center gap-2 bg-white border border-emerald-300 text-emerald-800 font-medium px-3 py-2 rounded-lg text-sm hover:bg-emerald-50 disabled:opacity-50"><UserCheck size={14} /> Confirm on behalf</button>
              <button onClick={() => setSupersedeOpen((v) => !v)} disabled={isPending} className="inline-flex items-center gap-2 bg-white border border-amber-300 text-amber-800 font-medium px-3 py-2 rounded-lg text-sm hover:bg-amber-50 disabled:opacity-50"><RefreshCw size={14} /> Supersede</button>
            </div>
          </div>

          {extendOpen && (
            <div className="rounded-lg border border-sage-200 bg-sage-50 p-4">
              <p className="text-sm text-sage-700 mb-2">Extend the review deadline (reminders stay anchored to the original issue date):</p>
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <input type="date" value={extendDate} onChange={(e) => setExtendDate(e.target.value)} className="rounded-lg border border-sage-200 px-4 py-2.5 text-sage-800 text-sm" />
                <input value={extendReason} onChange={(e) => setExtendReason(e.target.value)} placeholder="Reason" className="flex-1 rounded-lg border border-sage-200 px-4 py-2.5 text-sage-800 text-sm" />
                <button onClick={() => run(() => extendReviewDeadline({ id: statementId, review_due_at: extendDate, reason: extendReason }), () => { setExtendOpen(false); setMsg('Deadline extended.') })} disabled={isPending} className="bg-sage-600 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">Extend</button>
              </div>
            </div>
          )}

          {behalfOpen && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-900 mb-2">Confirm on the contractor’s behalf (deadline passed, no response). Records who confirmed and why.</p>
              <input value={behalfReason} onChange={(e) => setBehalfReason(e.target.value)} placeholder="Reason (e.g. no response by the deadline)" className="w-full rounded-lg border border-sage-200 px-4 py-2.5 text-sage-800 text-sm mb-2" />
              {!emailSent && (
                <label className="flex items-center gap-2 text-sm text-amber-800 mb-2">
                  <input type="checkbox" checked={behalfOverride} onChange={(e) => setBehalfOverride(e.target.checked)} />
                  The issue email was not sent — I acknowledge and override.
                </label>
              )}
              <div className="flex items-center gap-3">
                <button onClick={() => run(() => confirmStatementOnBehalf({ id: statementId, reason: behalfReason, email_override: behalfOverride }), () => { setBehalfOpen(false); setMsg('Confirmed on the contractor’s behalf.') })} disabled={isPending} className="bg-emerald-600 text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50">Confirm on behalf</button>
                <button onClick={() => setBehalfOpen(false)} className="text-sm text-sage-600 hover:text-sage-800">Cancel</button>
              </div>
            </div>
          )}

          {supersedeOpen && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800 mb-2">Superseding preserves this issued statement as a record, releases its payables, and lets you regenerate a corrected draft. Give a reason:</p>
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. missed a late-approved job" className="flex-1 rounded-lg border border-sage-200 px-4 py-2.5 text-sage-800 text-sm" />
                <button onClick={() => run(() => supersedeContractorStatement({ id: statementId, reason }), () => { setSupersedeOpen(false); setMsg('Superseded — regenerate the draft to re-issue.') })} disabled={isPending} className="bg-amber-600 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">Confirm supersede</button>
              </div>
            </div>
          )}
        </div>
      )}

      {status === 'confirmed' && (
        <div className="flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <p className="text-sm text-sage-700">
            <span className="font-semibold">{confirmedSource === 'sano' ? 'Confirmed by Sano' : 'Confirmed by contractor'}</span>. Eligible for remittance (later).
          </p>
        </div>
      )}

      {status === 'superseded' && (
        <p className="text-sm text-sage-500">This statement was superseded; its payables were released. Regenerate the period’s draft to re-issue.</p>
      )}

      {msg && <p className="text-sm text-sage-700 bg-sage-50 rounded-lg px-4 py-2 mt-3">{msg}</p>}
      {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 mt-3">{err}</p>}
    </div>
  )
}
