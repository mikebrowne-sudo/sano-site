'use client'

// "Send reminders" for every overdue customer in one go. Lists the overdue
// invoices grouped by the address they'd go to; invoices due a reminder on the
// 3 / 10 / 21-day schedule are ticked, the rest (reminded recently, or three
// already sent — call instead) are left unticked but can be added. Each
// customer gets ONE email for their ticked invoices. Sends one customer at a
// time so progress shows and a failure only affects that customer.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BellRing, CheckCircle, Loader2, AlertTriangle, X } from 'lucide-react'
import clsx from 'clsx'
import type { ReminderCandidate } from '@/lib/invoice-reminder-candidates'
import { buildCombinedReminderEmail, buildReminderEmail, reminderGroupKey, REMINDER_LABEL, type ReminderStage } from '@/lib/invoice-reminders'
import { sendCustomerReminders } from '../_actions-bulk-reminders'

/** Which reminders to work on: everything due, one stage only, or every overdue invoice. */
type Filter = 'due' | 1 | 2 | 3 | 'all'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'due', label: 'All due' },
  { key: 1, label: '1st reminders' },
  { key: 2, label: '2nd reminders' },
  { key: 3, label: 'Final reminders' },
  { key: 'all', label: 'Everything overdue' },
]
function inFilter(c: ReminderCandidate, f: Filter): boolean {
  if (f === 'all') return true
  if (f === 'due') return c.status.kind === 'due'
  // A stage filter shows invoices whose NEXT reminder is that stage (due or
  // not yet), never ones already past three ("call" list).
  return c.status.kind !== 'call' && c.stage === f
}
const defaultTicks = (items: ReminderCandidate[], f: Filter) =>
  new Set(items.filter((c) => inFilter(c, f) && c.status.kind === 'due' && c.to).map((c) => c.invoiceId))

type GroupState = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent'; count: number } | { kind: 'error'; message: string }

const money = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)

function statusText(c: ReminderCandidate): { text: string; tone: 'amber' | 'sage' | 'red' } {
  const s = c.status
  if (s.kind === 'due') return { text: `${REMINDER_LABEL[s.stage]} due`, tone: 'amber' }
  if (s.kind === 'call') return { text: '3 sent · call instead', tone: 'red' }
  if (s.kind === 'waiting') return { text: c.sentCount > 0 ? `${c.sentCount} sent · next in ${s.dueInDays}d` : `Suggested in ${s.dueInDays}d`, tone: 'sage' }
  return { text: 'Not due yet', tone: 'sage' }
}

export function BulkRemindersPanel({ candidates }: { candidates: ReminderCandidate[] }) {
  const router = useRouter()
  // Snapshot: the page refreshes as reminders go out; the list on screen
  // shouldn't reshuffle mid-send.
  const [items] = useState(candidates)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('due')
  const [ticked, setTicked] = useState<Set<string>>(() => defaultTicks(candidates, 'due'))
  const [states, setStates] = useState<Record<string, GroupState>>({})
  const [running, setRunning] = useState(false)

  const groups = useMemo(() => {
    const m = new Map<string, ReminderCandidate[]>()
    for (const c of items) {
      if (!inFilter(c, filter)) continue
      const k = c.to ? reminderGroupKey(c.to) : `__none__${c.invoiceId}`
      m.set(k, [...(m.get(k) ?? []), c])
    }
    return Array.from(m.entries()).map(([key, invoices]) => ({ key, invoices }))
  }, [items, filter])

  function chooseFilter(f: Filter) {
    setFilter(f)
    setTicked(defaultTicks(items, f))
  }
  const dueAt = (f: Filter) => items.filter((c) => inFilter(c, f) && c.status.kind === 'due' && c.to).length

  const selectedGroups = groups
    .map((g) => ({ ...g, chosen: g.invoices.filter((i) => ticked.has(i.invoiceId)) }))
    .filter((g) => g.chosen.length > 0)
  const dueCount = items.filter((c) => c.status.kind === 'due' && c.to).length
  const selectedTotal = selectedGroups.reduce((s, g) => s + g.chosen.reduce((t, i) => t + i.amountDue, 0), 0)

  function toggle(id: string) {
    setTicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function subjectFor(chosen: ReminderCandidate[]): string {
    if (chosen.length === 1) {
      const i = chosen[0]
      return buildReminderEmail({
        stage: i.stage, greeting: i.greeting, invoiceNumber: i.invoiceNumber, amountDue: i.amountDue,
        dueDate: i.dueDate, daysOverdue: i.daysOverdue, cardAvailable: i.cardAvailable, clientReference: i.clientReference,
      }).subject
    }
    const stage = Math.max(...chosen.map((i) => i.stage)) as ReminderStage
    return buildCombinedReminderEmail({ stage, greeting: 'Hi there,', invoices: chosen }).subject
  }

  async function sendAll() {
    const todo = selectedGroups.filter((g) => states[g.key]?.kind !== 'sent')
    if (todo.length === 0) return
    if (!window.confirm(`Send ${todo.length} reminder email${todo.length === 1 ? '' : 's'} (${money(selectedTotal)} outstanding)?`)) return
    setRunning(true)
    for (const g of todo) {
      setStates((s) => ({ ...s, [g.key]: { kind: 'sending' } }))
      try {
        const res = await sendCustomerReminders(g.chosen.map((i) => i.invoiceId))
        setStates((s) => ({ ...s, [g.key]: 'error' in res ? { kind: 'error', message: res.error } : { kind: 'sent', count: res.sent.length } }))
      } catch (e) {
        setStates((s) => ({ ...s, [g.key]: { kind: 'error', message: e instanceof Error ? e.message : 'Something went wrong.' } }))
      }
    }
    setRunning(false)
    router.refresh()
  }

  const remaining = selectedGroups.filter((g) => states[g.key]?.kind !== 'sent').length
  const sentEmails = Object.values(states).filter((s) => s.kind === 'sent').length
  const failed = Object.values(states).filter((s) => s.kind === 'error').length

  if (!open) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sage-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sage-600"
        >
          <BellRing size={14} />
          Send reminders{dueCount > 0 ? ` (${dueCount} due)` : ''}
        </button>
      </div>
    )
  }

  return (
    <div className="mb-5 rounded-xl border border-sage-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-sage-800">Send overdue reminders</p>
          <p className="mt-0.5 text-xs text-sage-500">
            Each customer gets one email for their ticked invoices, with the PDFs attached and bank details first.
            The wording follows the 3 / 10 / 21-day schedule. Invoices due a reminder are ticked for you.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(false)} disabled={running} className="text-sage-400 hover:text-sage-600" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Which reminders">
        {FILTERS.map((f) => {
          const n = f.key === 'all' ? items.length : dueAt(f.key)
          return (
            <button
              key={String(f.key)}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              disabled={running}
              onClick={() => chooseFilter(f.key)}
              className={clsx(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                filter === f.key ? 'bg-sage-500 text-white' : 'bg-sage-50 text-sage-600 ring-1 ring-sage-100 hover:text-sage-800',
              )}
            >
              {f.label}{n > 0 ? ` (${n})` : ''}
            </button>
          )
        })}
      </div>

      {groups.length === 0 && (
        <p className="rounded-lg bg-sage-50 px-3 py-4 text-center text-sm text-sage-500">Nothing in this group right now.</p>
      )}

      <div className="space-y-3">
        {groups.map((g) => {
          const first = g.invoices[0]
          const chosen = g.invoices.filter((i) => ticked.has(i.invoiceId))
          const st = states[g.key] ?? { kind: 'idle' }
          const names = Array.from(new Set(g.invoices.map((i) => i.clientName))).join(', ')
          return (
            <div key={g.key} className={clsx('rounded-lg border px-3 py-2.5', st.kind === 'sent' ? 'border-emerald-200 bg-emerald-50/50' : st.kind === 'error' ? 'border-red-200 bg-red-50/50' : 'border-sage-100')}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-sm">
                  <span className="font-semibold text-sage-800">{names}</span>
                  <span className="ml-2 text-xs text-sage-500">{first.to || 'No email on file — send from the invoice instead'}</span>
                </div>
                <GroupStatus state={st} />
              </div>
              <ul className="mt-1.5 space-y-1">
                {g.invoices.map((i) => {
                  const s = statusText(i)
                  return (
                    <li key={i.invoiceId}>
                      <label className={clsx('flex items-center gap-2.5 text-sm', !i.to || running || st.kind === 'sent' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-sage-300 text-sage-600"
                          checked={ticked.has(i.invoiceId)}
                          disabled={!i.to || running || st.kind === 'sent'}
                          onChange={() => toggle(i.invoiceId)}
                        />
                        <span className="font-medium text-sage-800">{i.invoiceNumber}</span>
                        <span className="tabular-nums text-sage-700">{money(i.amountDue)}</span>
                        <span className="text-xs text-red-600">{i.daysOverdue}d over</span>
                        <span className={clsx('ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium',
                          s.tone === 'amber' ? 'bg-amber-100 text-amber-800' : s.tone === 'red' ? 'bg-red-100 text-red-700' : 'bg-sage-50 text-sage-600')}>
                          {s.text}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
              {chosen.length > 0 && st.kind !== 'sent' && (
                <p className="mt-1.5 text-xs text-sage-500">Subject: <span className="text-sage-700">{subjectFor(chosen)}</span></p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-sage-100 pt-3">
        <p className="text-sm text-sage-600">
          {running ? 'Sending… keep this page open.'
            : sentEmails > 0 ? `${sentEmails} email${sentEmails === 1 ? '' : 's'} sent${failed ? `, ${failed} failed` : ''}.`
            : `${selectedGroups.length} email${selectedGroups.length === 1 ? '' : 's'} · ${money(selectedTotal)} outstanding`}
        </p>
        <button
          type="button"
          onClick={sendAll}
          disabled={running || remaining === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sage-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sage-600 disabled:opacity-50"
        >
          {running ? <Loader2 size={15} className="animate-spin" /> : <BellRing size={15} />}
          {failed > 0 && !running ? 'Retry failed' : `Send ${remaining} email${remaining === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  )
}

function GroupStatus({ state }: { state: GroupState }) {
  if (state.kind === 'sending') return <span className="inline-flex items-center gap-1 text-xs text-sage-600"><Loader2 size={13} className="animate-spin" /> Sending…</span>
  if (state.kind === 'sent') return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle size={13} /> Sent</span>
  if (state.kind === 'error') return <span className="inline-flex items-center gap-1 text-xs text-red-700"><AlertTriangle size={13} /> {state.message}</span>
  return null
}
