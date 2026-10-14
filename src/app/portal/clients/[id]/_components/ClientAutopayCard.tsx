'use client'

// Automatic payments for one customer — only set up when the customer asks.
// "Email setup link" sends them a secure link where they choose bank account
// (direct debit, no fee) or card (2.5% fee) and enter it themselves on
// Stripe's page. Used on the client page and the recurring job page.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Landmark, Copy, Check, Loader2, Mail } from 'lucide-react'
import clsx from 'clsx'
import { emailClientAutopaySetup, getClientAutopayLink, setClientAutopayPaused } from '@/app/portal/_actions/autopay'

const STATUS: Record<string, { label: string; tone: string; help: string }> = {
  none:   { label: 'Not set up', tone: 'bg-gray-100 text-gray-600', help: 'Only if the customer asks: email them the setup link. They choose bank account (no fee) or card (2.5% fee) and enter it themselves. Never take bank or card numbers over the phone.' },
  active: { label: 'Active', tone: 'bg-emerald-50 text-emerald-700', help: 'Every invoice sent to this customer is collected automatically. It shows as paid once the money clears (bank debits take a few working days).' },
  paused: { label: 'Paused', tone: 'bg-amber-50 text-amber-700', help: 'Their payment details are saved, but nothing is collected until you resume.' },
  failed: { label: 'Needs attention', tone: 'bg-red-50 text-red-700', help: 'A payment failed. Check with the customer, then email them the setup link again if their details changed.' },
}

export function ClientAutopayCard({
  clientId, status, setupAt, email, className,
}: {
  clientId: string
  status: string
  setupAt: string | null
  /** Where the setup email goes (accounts email, else main email). */
  email: string | null
  className?: string
}) {
  const router = useRouter()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const s = STATUS[status] ?? STATUS.none

  function emailLink() {
    if (!email) return
    if (!window.confirm(`Email the automatic payments setup link to ${email}?`)) return
    setErr(null)
    start(async () => {
      const res = await emailClientAutopaySetup(clientId)
      if ('error' in res) setErr(res.error)
      else { setSentTo(res.to); router.refresh() }
    })
  }
  function copyLink() {
    setErr(null)
    start(async () => {
      const res = await getClientAutopayLink(clientId)
      if ('error' in res) { setErr(res.error); return }
      try { await navigator.clipboard.writeText(res.url); setCopied(true); setTimeout(() => setCopied(false), 2000) }
      catch { setErr(`Copy failed. The link is: ${res.url}`) }
    })
  }
  function setPaused(paused: boolean) {
    setErr(null)
    start(async () => {
      const res = await setClientAutopayPaused(clientId, paused)
      if ('error' in res) setErr(res.error)
      else router.refresh()
    })
  }

  return (
    <div className={clsx('rounded-xl border border-gray-100 bg-white p-5 shadow-sm', className ?? 'mt-6')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Landmark size={16} className="text-sage-500" />
          <h2 className="text-base font-semibold text-sage-800">Automatic payments</h2>
        </div>
        <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-semibold', s.tone)}>{s.label}</span>
      </div>
      <p className="mt-2 text-sm text-sage-600">{s.help}</p>
      {setupAt && status !== 'none' && (
        <p className="mt-1 text-xs text-sage-500">Payment details saved {new Date(setupAt).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}.</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={emailLink} disabled={pending || !email}
          title={email ? `Sends to ${email}` : 'No email address on file'}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sage-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sage-700 disabled:opacity-50">
          {pending && !copied ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
          {status === 'none' ? 'Email setup link' : 'Email setup link again'}
        </button>
        <button type="button" onClick={copyLink} disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sage-200 px-3 py-1.5 text-sm font-medium text-sage-700 hover:bg-sage-50 disabled:opacity-50">
          {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy link'}
        </button>
        {status === 'active' && (
          <button type="button" onClick={() => setPaused(true)} disabled={pending}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50">Pause</button>
        )}
        {status === 'paused' && (
          <button type="button" onClick={() => setPaused(false)} disabled={pending}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Resume</button>
        )}
      </div>
      {email && <p className="mt-2 text-xs text-sage-500">Setup email goes to {email}.</p>}
      {!email && <p className="mt-2 text-xs text-amber-700">No email address on this customer: add one, or use Copy link.</p>}
      {sentTo && <p className="mt-2 text-sm text-emerald-700">Sent to {sentTo}. Their status changes to Active once they finish.</p>}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  )
}
