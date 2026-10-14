'use client'

// The Alerts overdue-invoice list, with a tick box on every row so staff can
// pick exactly which invoices get a reminder and send them together. Each row
// still opens the invoice. Quick-select chips tick everything due, or only
// 1st / 2nd / final reminders; nothing is ticked until you choose.
//
// Ticked invoices are grouped by the address they go to: each customer gets
// ONE email (several invoices → the combined reminder). Sends one customer at
// a time so progress shows on each row and a failure only affects that
// customer.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BellRing, CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import type { ReminderCandidate } from '@/lib/invoice-reminder-candidates'
import { reminderGroupKey, REMINDER_LABEL } from '@/lib/invoice-reminders'
import { sendCustomerReminders } from '../_actions-bulk-reminders'

type Quick = 'due' | 1 | 2 | 3
const QUICK: { key: Quick; label: string }[] = [
  { key: 'due', label: 'All due' },
  { key: 1, label: '1st reminders' },
  { key: 2, label: '2nd reminders' },
  { key: 3, label: 'Final reminders' },
]
const matches = (c: ReminderCandidate, q: Quick) =>
  !!c.to && c.status.kind === 'due' && (q === 'due' || c.stage === q)

type SendState = { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }
type GroupState = { kind: 'sending' } | { kind: 'error'; message: string }

const money = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export function OverdueRemindersList({ candidates }: { candidates: ReminderCandidate[] }) {
  const router = useRouter()
  // Snapshot so rows don't reshuffle while reminders go out.
  const [items] = useState(candidates)
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [states, setStates] = useState<Record<string, GroupState>>({}) // in-flight / failed, by customer
  const [sentIds, setSentIds] = useState<Set<string>>(new Set()) // invoices reminded this session
  const [running, setRunning] = useState(false)

  const chosen = useMemo(() => items.filter((c) => ticked.has(c.invoiceId)), [items, ticked])
  const groups = useMemo(() => {
    const m = new Map<string, ReminderCandidate[]>()
    for (const c of chosen) {
      const k = reminderGroupKey(c.to)
      m.set(k, [...(m.get(k) ?? []), c])
    }
    return Array.from(m.entries()).map(([key, invoices]) => ({ key, invoices }))
  }, [chosen])
  const pending = groups
  const total = chosen.reduce((s, c) => s + c.amountDue, 0)

  function toggle(id: string) {
    setTicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const quickSelect = (q: Quick) => setTicked(new Set(items.filter((c) => matches(c, q)).map((c) => c.invoiceId)))

  async function send() {
    if (pending.length === 0) return
    const n = pending.reduce((s, g) => s + g.invoices.length, 0)
    if (!window.confirm(`Send reminders for ${n} invoice${n === 1 ? '' : 's'} as ${pending.length} email${pending.length === 1 ? '' : 's'}?`)) return
    setRunning(true)
    for (const g of pending) {
      setStates((s) => ({ ...s, [g.key]: { kind: 'sending' } }))
      try {
        const res = await sendCustomerReminders(g.invoices.map((i) => i.invoiceId))
        if ('error' in res) setStates((s) => ({ ...s, [g.key]: { kind: 'error', message: res.error } }))
        else {
          setStates((s) => { const n = { ...s }; delete n[g.key]; return n })
          setSentIds((prev) => new Set([...Array.from(prev), ...g.invoices.map((i) => i.invoiceId)]))
          setTicked((prev) => { const n = new Set(prev); g.invoices.forEach((i) => n.delete(i.invoiceId)); return n })
        }
      } catch (e) {
        setStates((s) => ({ ...s, [g.key]: { kind: 'error', message: e instanceof Error ? e.message : 'Something went wrong.' } }))
      }
    }
    setRunning(false)
    router.refresh()
  }

  return (
    <div>
      {/* Quick select */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-sage-500">Tick:</span>
        {QUICK.map((q) => {
          const n = items.filter((c) => matches(c, q.key)).length
          return (
            <button key={String(q.key)} type="button" disabled={running || n === 0} onClick={() => quickSelect(q.key)}
              className="rounded-full bg-sage-50 px-3 py-1 text-xs font-medium text-sage-700 ring-1 ring-sage-100 transition-colors hover:bg-white disabled:opacity-40">
              {q.label} ({n})
            </button>
          )
        })}
        {ticked.size > 0 && (
          <button type="button" disabled={running} onClick={() => setTicked(new Set())}
            className="rounded-full px-3 py-1 text-xs font-medium text-sage-500 hover:text-sage-800">
            Clear
          </button>
        )}
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {items.map((c) => {
          const isTicked = ticked.has(c.invoiceId)
          const rowState: SendState | undefined = sentIds.has(c.invoiceId) ? { kind: 'sent' } : isTicked ? states[reminderGroupKey(c.to)] : undefined
          const locked = running || sentIds.has(c.invoiceId)
          return (
            <div key={c.invoiceId} className={clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
              isTicked ? 'bg-red-100/70 ring-1 ring-red-200' : 'bg-red-50',
            )}>
              <input
                type="checkbox"
                aria-label={`Send a reminder for ${c.invoiceNumber}`}
                title={c.to ? `Goes to ${c.to}` : 'No email on file. Open the invoice to send'}
                className="h-4 w-4 shrink-0 rounded border-sage-300 text-sage-600"
                checked={isTicked}
                disabled={!c.to || locked}
                onChange={() => toggle(c.invoiceId)}
              />
              <Link href={`/portal/invoices/${c.invoiceId}`} className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 hover:opacity-80">
                <div className="min-w-0">
                  <span className="font-medium text-sage-800">{c.invoiceNumber}</span>
                  <span className="ml-2 text-sage-600">{c.clientName}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {rowState ? <RowState state={rowState} />
                    : c.status.kind === 'due' ? <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">{REMINDER_LABEL[c.status.stage]} due</span>
                    : c.status.kind === 'call' ? <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">3 sent · call</span>
                    : c.sentCount > 0 ? <span className="rounded-full bg-white px-2 py-0.5 text-sage-600 ring-1 ring-sage-100">{c.sentCount} reminder{c.sentCount === 1 ? '' : 's'} sent</span>
                    : null}
                  <span className="font-medium text-red-600">Due {fmtDate(c.dueDate)}{c.daysOverdue > 0 ? ` · ${c.daysOverdue}d over` : ''}</span>
                  <span className="w-20 text-right font-medium tabular-nums text-sage-800">{money(c.amountDue)}</span>
                </div>
              </Link>
            </div>
          )
        })}
      </div>

      {/* Send bar */}
      {(chosen.length > 0 || sentIds.size > 0) && (
        <div className="sticky bottom-3 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sage-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
          <p className="text-sm text-sage-700">
            {running ? 'Sending… keep this page open.'
              : chosen.length === 0 ? `${sentIds.size} reminder${sentIds.size === 1 ? '' : 's'} sent.`
              : <>
                  <span className="font-semibold">{chosen.length} invoice{chosen.length === 1 ? '' : 's'}</span>
                  {' · '}{groups.length} email{groups.length === 1 ? '' : 's'}{' · '}<span className="tabular-nums">{money(total)}</span>
                  <span className="ml-2 text-xs text-sage-500">Same customer = one email</span>
                </>}
          </p>
          <button type="button" onClick={send} disabled={running || pending.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sage-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sage-700 disabled:opacity-50">
            {running ? <Loader2 size={15} className="animate-spin" /> : <BellRing size={15} />}
            {Object.values(states).some((s) => s.kind === 'error') && !running ? 'Retry failed' : 'Send reminders'}
          </button>
        </div>
      )}
    </div>
  )
}

function RowState({ state }: { state: SendState }) {
  if (state.kind === 'sending') return <span className="inline-flex items-center gap-1 text-sage-600"><Loader2 size={12} className="animate-spin" /> Sending…</span>
  if (state.kind === 'sent') return <span className="inline-flex items-center gap-1 font-medium text-emerald-700"><CheckCircle size={12} /> Reminder sent</span>
  return <span className="inline-flex items-center gap-1 text-red-700" title={state.message}><AlertTriangle size={12} /> Failed: {state.message}</span>
}
