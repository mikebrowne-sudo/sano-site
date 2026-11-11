'use client'

// Full-page "Send statement" form: tick the invoices, check who it goes to,
// optionally invite the customer to set up automatic payments, send. The
// subject and message follow the ticked total until staff edit them.

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle, FileText, Send } from 'lucide-react'
import clsx from 'clsx'
import { sendStatement } from '../_actions'
import { buildStatementEmail, fmtLongDate, fmtMoney, statementTotal, type StatementLine } from '@/lib/statements'

const INPUT = 'w-full rounded-lg border border-sage-200 px-4 py-3 text-sm text-sage-800 placeholder:text-sage-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sage-500'

export function SendStatementForm({
  clientId, lines, defaultTo, defaultAlsoTo, greeting, defaultSubject, defaultMessage, autopayStatus, past,
}: {
  clientId: string
  lines: StatementLine[]
  defaultTo: string
  defaultAlsoTo: string
  greeting: string
  defaultSubject: string
  defaultMessage: string
  autopayStatus: string
  past: Array<{ statement_number: string; sent_at: string; total: number; share_token: string }>
}) {
  const autopayActive = autopayStatus === 'active'
  const [picked, setPicked] = useState<Set<string>>(() => new Set(lines.map((l) => l.invoiceId)))
  const [to, setTo] = useState(defaultTo)
  const [alsoTo, setAlsoTo] = useState(defaultAlsoTo)
  const [includeAutopay, setIncludeAutopay] = useState(false)
  const [subject, setSubject] = useState(defaultSubject)
  const [message, setMessage] = useState(defaultMessage)
  const [edited, setEdited] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ statementNumber: string; to: string; cc: string[] } | null>(null)
  const [pending, start] = useTransition()

  const chosen = useMemo(() => lines.filter((l) => picked.has(l.invoiceId)), [lines, picked])
  const total = statementTotal(chosen)
  const drafts = chosen.filter((l) => l.status === 'draft').length

  function toggle(id: string) {
    const next = new Set(picked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setPicked(next)
    if (!edited) {
      const sel = lines.filter((l) => next.has(l.invoiceId))
      const d = buildStatementEmail({ greeting, total: statementTotal(sel), count: sel.length, autopayActive })
      setSubject(d.subject)
      setMessage(d.message)
    }
  }

  function send() {
    setError(null)
    if (!window.confirm(`Send statement for ${fmtMoney(total)} (${chosen.length} invoice${chosen.length === 1 ? '' : 's'}) to ${to}?`)) return
    start(async () => {
      const res = await sendStatement({
        clientId, invoiceIds: chosen.map((l) => l.invoiceId), to, alsoTo, subject, message,
        includeAutopay: includeAutopay && !autopayActive,
      })
      if ('error' in res) setError(res.error)
      else setDone(res)
    })
  }

  if (done) {
    return (
      <div className="max-w-2xl rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <CheckCircle size={18} /> Statement {done.statementNumber} sent to {done.to}
          {done.cc.length > 0 && <> · CC {done.cc.join(', ')}</>}
        </p>
        <p className="mt-2 text-sm text-emerald-700">
          {drafts > 0 ? `${drafts} draft invoice${drafts === 1 ? ' was' : 's were'} sent with it and now show as sent. ` : ''}
          A payment referenced {done.statementNumber} is matched to these invoices automatically when you import the bank statement.
        </p>
        <Link href={`/portal/clients/${clientId}`} className="mt-3 inline-block text-sm font-medium text-sage-700 hover:text-sage-900">Back to the client</Link>
      </div>
    )
  }

  if (lines.length === 0) {
    return <p className="max-w-2xl rounded-xl border border-sage-100 bg-sage-50 p-5 text-sm text-sage-700">Nothing outstanding: this client has no unpaid invoices.</p>
  }

  return (
    <div className="max-w-2xl space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-sage-800">Invoices on this statement</h2>
        <div className="divide-y divide-sage-50 rounded-xl border border-sage-100 bg-white">
          {lines.map((l) => {
            const on = picked.has(l.invoiceId)
            return (
              <label key={l.invoiceId} className="flex cursor-pointer items-start gap-3 px-4 py-3">
                <input type="checkbox" checked={on} onChange={() => toggle(l.invoiceId)} className="mt-1 h-4 w-4 rounded border-sage-300 text-sage-600 focus:ring-sage-500" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-sage-800">{l.invoiceNumber}</span>
                    {l.status === 'draft' && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">Draft: sent with this statement</span>
                    )}
                    {l.paid > 0 && <span className="rounded-full bg-sage-50 px-2 py-0.5 text-[11px] font-medium text-sage-700">Part paid</span>}
                  </span>
                  <span className="block text-xs text-sage-600">
                    {l.title}{l.dueDate ? ` · Due ${fmtLongDate(l.dueDate)}` : ''}
                  </span>
                </span>
                <span className={clsx('text-sm font-semibold tabular-nums', on ? 'text-sage-800' : 'text-sage-400')}>{fmtMoney(l.balance)}</span>
              </label>
            )
          })}
          <div className="flex items-center justify-between bg-sage-50 px-4 py-3">
            <span className="text-sm font-semibold text-sage-800">Total outstanding</span>
            <span className="text-base font-bold tabular-nums text-sage-800">{fmtMoney(total)}</span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-sage-800">Email</h2>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-sage-800">To</span>
          <input type="email" value={to} onChange={(e) => setTo(e.target.value)} className={INPUT} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-sage-800">Also send to</span>
          <input value={alsoTo} onChange={(e) => setAlsoTo(e.target.value)} placeholder="Optional: other emails, separated by commas" className={INPUT} />
        </label>

        {autopayActive ? (
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            This customer pays by automatic payments. The statement says the invoices will be collected, and shows no bank details.
          </p>
        ) : (
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-sage-100 bg-white px-4 py-3">
            <input type="checkbox" checked={includeAutopay} onChange={(e) => setIncludeAutopay(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-sage-300 text-sage-600 focus:ring-sage-500" />
            <span className="text-sm text-sage-800">
              <span className="font-semibold">Invite them to set up automatic payments</span>
              <span className="block text-xs text-sage-600">
                Adds a &ldquo;Set up automatic payments&rdquo; section with their secure link: bank direct debit (no fee) or card (2.5% fee). Invoices already on this statement are not collected automatically; use &ldquo;Collect by direct debit&rdquo; on each invoice once they&apos;re set up.
              </span>
            </span>
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-sage-800">Subject</span>
          <input value={subject} onChange={(e) => { setSubject(e.target.value); setEdited(true) }} className={INPUT} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-sage-800">Message</span>
          <textarea rows={9} value={message} onChange={(e) => { setMessage(e.target.value); setEdited(true) }} className={clsx(INPUT, 'resize-y leading-relaxed')} />
          <span className="mt-1 block text-[11px] text-sage-500">
            Added underneath automatically: the invoice list and total, bank details with the statement number as the reference, a link to view the statement, and the PDFs of the statement and each invoice.
          </span>
        </label>
      </section>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-4">
        <button type="button" onClick={send} disabled={pending || chosen.length === 0 || !to.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-sage-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-sage-700 disabled:opacity-50">
          <Send size={16} />
          {pending ? 'Sending… (making the PDFs takes a moment)' : `Send statement (${fmtMoney(total)})`}
        </button>
        <Link href={`/portal/clients/${clientId}`} className="text-sm text-sage-600 hover:text-sage-800">Cancel</Link>
      </div>

      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-sage-700">Recent statements</h2>
          <ul className="space-y-1 text-sm text-sage-700">
            {past.map((p) => (
              <li key={p.statement_number} className="flex items-center gap-2">
                <FileText size={14} className="text-sage-500" />
                <a href={`/share/statement/${p.share_token}`} target="_blank" rel="noreferrer" className="font-medium text-sage-700 hover:text-sage-900">{p.statement_number}</a>
                <span className="text-sage-500">· {new Date(p.sent_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Pacific/Auckland' })} · {fmtMoney(Number(p.total))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
