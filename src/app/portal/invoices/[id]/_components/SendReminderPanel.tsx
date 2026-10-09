'use client'

// "Send reminder" for a sent, unpaid invoice. The wording steps up with each
// reminder (friendly → second → final) and is fully editable before sending.
// Shows the reminder history and where the invoice sits on the 3/10/21-day
// schedule. Manual only — nothing is sent without a click here.

import { useState, useTransition } from 'react'
import { BellRing, CheckCircle, Phone, X } from 'lucide-react'
import { sendInvoiceReminder } from '../_actions-reminder'
import { buildReminderEmail, nextReminderStage, reminderStatus, REMINDER_LABEL } from '@/lib/invoice-reminders'

export interface ReminderHistoryRow {
  stage: number
  sent_at: string
  to_email: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Pacific/Auckland' })
}

export function SendReminderPanel({
  invoiceId,
  invoiceNumber,
  greeting,
  defaultTo,
  primaryContactEmail,
  amountDue,
  dueDate,
  daysOverdue,
  cardAvailable,
  clientReference,
  history,
}: {
  invoiceId: string
  invoiceNumber: string
  greeting: string
  defaultTo: string
  primaryContactEmail: string
  amountDue: number
  dueDate: string | null
  daysOverdue: number
  cardAvailable: boolean
  clientReference: string | null
  history: ReminderHistoryRow[]
}) {
  const stage = nextReminderStage(history.length)
  const status = reminderStatus(daysOverdue, history.length)
  const draft = buildReminderEmail({ stage, greeting, invoiceNumber, amountDue, dueDate, daysOverdue, cardAvailable, clientReference })

  const [open, setOpen] = useState(false)
  const [to, setTo] = useState(defaultTo)
  const [ccPrimary, setCcPrimary] = useState(false)
  const [subject, setSubject] = useState(draft.subject)
  const [message, setMessage] = useState(draft.message)
  const [error, setError] = useState<string | null>(null)
  const [sentStage, setSentStage] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  const primary = primaryContactEmail.trim()
  const showCc = primary.length > 0 && primary.toLowerCase() !== to.trim().toLowerCase()
  const money = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(amountDue)

  function send() {
    setError(null)
    startTransition(async () => {
      const res = await sendInvoiceReminder({
        invoice_id: invoiceId,
        to,
        cc: ccPrimary && showCc ? [primary] : undefined,
        subject,
        message,
      })
      if ('error' in res) setError(res.error)
      else {
        setSentStage(res.stage)
        setOpen(false)
      }
    })
  }

  const hint =
    status.kind === 'due' ? { tone: 'amber', text: `${REMINDER_LABEL[status.stage]} due — ${daysOverdue} days overdue` }
    : status.kind === 'waiting' ? { tone: 'sage', text: `${REMINDER_LABEL[status.stage]} suggested in ${status.dueInDays} day${status.dueInDays === 1 ? '' : 's'}` }
    : status.kind === 'call' ? { tone: 'red', text: 'All three reminders sent — time for a phone call' }
    : null

  return (
    <section className="mb-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-sage-800">
            <BellRing size={15} className="text-sage-600" /> Payment reminders
          </h2>
          <p className="mt-0.5 text-xs text-sage-600">
            {money} outstanding{daysOverdue > 0 ? ` · ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue` : ''}
            {hint && (
              <span
                className={
                  'ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ' +
                  (hint.tone === 'amber' ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                    : hint.tone === 'red' ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                    : 'bg-sage-50 text-sage-700 ring-1 ring-sage-100')
                }
              >
                {status.kind === 'call' && <Phone size={11} />}
                {hint.text}
              </span>
            )}
          </p>
        </div>
        {sentStage ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
            <CheckCircle size={16} /> {REMINDER_LABEL[sentStage as 1 | 2 | 3]} sent to {to}
          </span>
        ) : !open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-sage-200 px-4 py-2.5 text-sm font-medium text-sage-700 transition-colors hover:bg-sage-50"
          >
            <BellRing size={16} />
            Send {REMINDER_LABEL[stage].toLowerCase()}
          </button>
        ) : null}
      </div>

      {open && !sentStage && (
        <div className="space-y-4 border-t border-gray-100 px-5 py-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-sage-800">{REMINDER_LABEL[stage]} ({stage} of 3)</h3>
            <button type="button" onClick={() => setOpen(false)} className="text-sage-400 hover:text-sage-600" aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-sage-800">To</span>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sm text-sage-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sage-500"
            />
          </label>
          {showCc && (
            <label className="flex items-center gap-2 text-sm text-sage-700">
              <input type="checkbox" checked={ccPrimary} onChange={(e) => setCcPrimary(e.target.checked)} className="h-4 w-4 rounded border-sage-300" />
              CC {primary}
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-sage-800">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sm text-sage-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sage-500"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-sage-800">Message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={11}
              className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sm leading-relaxed text-sage-800 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sage-500"
            />
            <span className="mt-1 block text-[11px] text-sage-500">
              A &ldquo;View &amp; pay invoice&rdquo; button and the invoice PDF are added automatically.
            </span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2.5 text-sm text-sage-600 hover:bg-sage-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={send}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-sage-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sage-700 disabled:opacity-50"
            >
              <BellRing size={16} />
              {isPending ? 'Sending…' : `Send ${REMINDER_LABEL[stage].toLowerCase()}`}
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <ul className="border-t border-gray-100 px-5 py-3 text-xs text-sage-600">
          {history.map((h) => (
            <li key={h.sent_at} className="flex items-center justify-between gap-3 py-1">
              <span>{REMINDER_LABEL[(Math.min(3, Math.max(1, h.stage)) as 1 | 2 | 3)]} · {h.to_email}</span>
              <span className="tabular-nums">{fmtDate(h.sent_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
