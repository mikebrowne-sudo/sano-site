'use client'

// Automatic payments (NZ direct debit) for one customer: status, the setup link
// to send them, and pause/resume. Invoices sent to an 'active' customer are
// collected from their bank account automatically.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Landmark, Copy, Check, Loader2, Link2 } from 'lucide-react'
import clsx from 'clsx'
import { createClientAutopayLink, setClientAutopayPaused } from '../_actions-autopay'

const STATUS: Record<string, { label: string; tone: string; help: string }> = {
  none:   { label: 'Not set up', tone: 'bg-gray-100 text-gray-600', help: 'Send the customer a setup link. Once they save their bank account, each invoice you send them is collected automatically.' },
  active: { label: 'Active', tone: 'bg-emerald-50 text-emerald-700', help: 'Every invoice sent to this customer is collected by direct debit. It shows as paid once the money clears (usually 2–4 working days).' },
  paused: { label: 'Paused', tone: 'bg-amber-50 text-amber-700', help: 'Their bank account is saved, but nothing is collected until you resume.' },
  failed: { label: 'Needs attention', tone: 'bg-red-50 text-red-700', help: 'A debit failed. Check with the customer, then send a fresh setup link if their account changed.' },
}

export function ClientAutopayCard({ clientId, status, setupAt }: { clientId: string; status: string; setupAt: string | null }) {
  const router = useRouter()
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const s = STATUS[status] ?? STATUS.none

  function makeLink() {
    setErr(null)
    start(async () => {
      const res = await createClientAutopayLink(clientId)
      if ('error' in res) setErr(res.error)
      else setLink(res.url)
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
  async function copy() {
    if (!link) return
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* select manually */ }
  }

  return (
    <div className="mt-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Landmark size={16} className="text-sage-500" />
          <h2 className="text-base font-semibold text-sage-800">Automatic payments (direct debit)</h2>
        </div>
        <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-semibold', s.tone)}>{s.label}</span>
      </div>
      <p className="mt-2 text-sm text-sage-600">{s.help}</p>
      {setupAt && status !== 'none' && (
        <p className="mt-1 text-xs text-sage-500">Bank account saved {new Date(setupAt).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}.</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={makeLink} disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sage-200 px-3 py-1.5 text-sm font-medium text-sage-700 hover:bg-sage-50 disabled:opacity-50">
          {pending && !link ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
          {status === 'none' ? 'Create setup link' : 'New setup link'}
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

      {link && (
        <div className="mt-3 rounded-lg bg-sage-50 p-3">
          <p className="text-xs text-sage-600">Send this link to the customer (it works for 24 hours). They enter their bank account and accept the direct debit authority on Stripe&apos;s secure page.</p>
          <div className="mt-2 flex items-center gap-2">
            <input readOnly value={link} onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded-md border border-sage-200 bg-white px-2 py-1 text-xs text-sage-700" />
            <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-md bg-sage-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sage-700">
              {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  )
}
