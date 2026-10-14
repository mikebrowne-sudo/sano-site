'use client'

// "Match payment" — pick what a bank credit paid for.
//
// Built around the customer: the window opens scoped to whoever paid (from the
// payee / earlier matches; changeable), lists ALL their open work in one place
// — unpaid invoices, invoices marked paid with no bank money matched yet,
// drafts, and completed jobs not invoiced yet — and offers the combinations
// that add up to the payment exactly. Tap a combination (or tick items), watch
// the running total go green, Confirm. Ticked jobs are invoiced first, then
// everything is matched in one go. Any invoice anywhere is still reachable
// through search.

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check, Search, Sparkles, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { reconcileBankTransaction } from '../_actions'
import { findCombos, WORK_KIND_LABEL, type WorkItem, type WorkKind } from '@/lib/reconcile-combos'

export interface MatchInvoice {
  id: string
  number: string
  total: number
  status: string
  address: string
  client: string
  /** Amount already allocated to this invoice (live). Remaining = total − this. */
  allocated?: number
  /** The job's clean date, when known. */
  serviceDate?: string | null
}

/** A ranked suggestion from the bank reference / payer rules. */
export interface PanelSuggestion {
  label: string
  allocations: Array<{ invoiceId: string; amount: number }>
}

export interface PayerOption { id: string; label: string }

const fmt = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
function shortDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}
function shortAddr(addr?: string): string {
  if (!addr) return ''
  const parts = addr.split(',').map((s) => s.trim()).filter(Boolean)
  const cleaned = parts.filter((p) => !/new zealand/i.test(p) && !/^\d{4}$/.test(p) && !/^auckland\b/i.test(p))
  return (cleaned.length ? cleaned : parts).slice(0, 2).join(', ')
}

const KIND_ORDER: WorkKind[] = ['invoice', 'paid_unmatched', 'draft', 'job']
const KIND_TAG: Record<WorkKind, string> = {
  invoice: 'bg-sky-50 text-sky-700',
  paid_unmatched: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-gray-100 text-gray-600',
  job: 'bg-amber-50 text-amber-700',
}
const KIND_SHORT: Record<WorkKind, string> = { invoice: 'Unpaid', paid_unmatched: 'Marked paid', draft: 'Draft', job: 'Not invoiced' }
const keyOf = (w: Pick<WorkItem, 'kind' | 'id'>) => `${w.kind === 'job' ? 'job' : 'inv'}:${w.id}`

function invoiceToWork(c: MatchInvoice): WorkItem {
  const open = round2(c.total - (c.allocated ?? 0))
  return {
    id: c.id, number: c.number, amount: open > 0 ? open : c.total,
    kind: c.status === 'draft' ? 'draft' : c.status === 'paid' ? 'paid_unmatched' : 'invoice',
    date: c.serviceDate ?? null, clientId: null, clientLabel: c.client, address: c.address,
  }
}

export function MatchPanel({
  lineId,
  amount,
  date,
  payee,
  work,
  payers,
  defaultClientIds,
  allCandidates,
  suggestions,
  triggerLabel = 'Match',
  triggerClassName,
}: {
  lineId: string
  amount: number
  date: string
  payee: string
  /** Every customer's open work (unpaid / marked-paid-unmatched / draft invoices, un-invoiced jobs). */
  work: WorkItem[]
  /** Customers to choose from for "Who paid". */
  payers: PayerOption[]
  /** Who the payment resolved to (may be several linked clients, or none). */
  defaultClientIds: string[]
  /** Every invoice, for search (includes fully paid). */
  allCandidates: MatchInvoice[]
  suggestions: PanelSuggestion[]
  triggerLabel?: string
  triggerClassName?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [clientIds, setClientIds] = useState<string[]>(defaultClientIds)
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [moreCombos, setMoreCombos] = useState(false)
  // key → { item, amount (string for the input) }
  const [selected, setSelected] = useState<Map<string, { item: WorkItem; value: string }>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const invoiceById = useMemo(() => new Map(allCandidates.map((c) => [c.id, c])), [allCandidates])
  const theirWork = useMemo(
    () => (clientIds.length ? work.filter((w) => w.clientId && clientIds.includes(w.clientId)) : []),
    [work, clientIds],
  )
  const payerLabel = clientIds.length === 0 ? null
    : clientIds.length === 1 ? (payers.find((p) => p.id === clientIds[0])?.label ?? 'this customer')
    : `${clientIds.length} linked customers`

  const combos = useMemo(() => findCombos(theirWork, amount, { paymentDate: date, limit: 5 }), [theirWork, amount, date])

  const total = round2(Array.from(selected.values()).reduce((s, v) => s + (parseFloat(v.value) || 0), 0))
  const left = round2(amount - total)
  const exact = Math.abs(left) < 0.005 && selected.size > 0
  const jobsTicked = Array.from(selected.values()).filter((v) => v.item.kind === 'job').length

  const q = query.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!q) return []
    return allCandidates.filter((c) =>
      c.number.toLowerCase().includes(q) || c.client.toLowerCase().includes(q) || c.address.toLowerCase().includes(q),
    ).slice(0, 30)
  }, [q, allCandidates])

  function toggle(item: WorkItem) {
    setSelected((prev) => {
      const next = new Map(prev)
      const k = keyOf(item)
      if (next.has(k)) next.delete(k)
      else {
        const already = round2(Array.from(next.values()).reduce((s, v) => s + (parseFloat(v.value) || 0), 0))
        const share = Math.max(0, Math.min(round2(amount - already), item.amount))
        next.set(k, { item, value: (share > 0 ? share : item.amount).toFixed(2) })
      }
      return next
    })
  }
  function setValue(k: string, value: string) {
    setSelected((prev) => {
      const cur = prev.get(k)
      if (!cur) return prev
      const next = new Map(prev)
      next.set(k, { ...cur, value })
      return next
    })
  }
  function applyItems(items: WorkItem[]) {
    setSelected(new Map(items.map((i) => [keyOf(i), { item: i, value: i.amount.toFixed(2) }])))
  }
  function applySuggestion(sg: PanelSuggestion) {
    applyItems(sg.allocations.map((a) => {
      const inv = invoiceById.get(a.invoiceId)
      const w = inv ? invoiceToWork(inv) : { id: a.invoiceId, number: '?', amount: a.amount, kind: 'invoice' as const, date: null, clientId: null, clientLabel: '' }
      return { ...w, amount: a.amount }
    }))
  }

  function submit() {
    setError(null)
    const rows = Array.from(selected.values()).map((v) => ({ item: v.item, amount: round2(parseFloat(v.value) || 0) })).filter((r) => r.amount > 0)
    if (rows.length === 0) { setError('Tick at least one item.'); return }
    const allocations = rows.filter((r) => r.item.kind !== 'job').map((r) => ({ invoiceId: r.item.id, amount: r.amount }))
    const jobs = rows.filter((r) => r.item.kind === 'job').map((r) => ({ jobId: r.item.id, jobNumber: r.item.number, amount: r.amount }))
    startTransition(async () => {
      const r = await reconcileBankTransaction(lineId, allocations, date, jobs)
      if (!r.ok) { setError(r.error ?? 'Could not save.'); return }
      setOpen(false)
      setSelected(new Map())
      router.refresh()
    })
  }

  const renderRow = (item: WorkItem) => {
    const k = keyOf(item)
    const sel = selected.get(k)
    // An invoice whose whole amount is already matched to bank money can't take
    // more — say so up front instead of failing on Confirm.
    const inv = item.kind === 'job' ? null : invoiceById.get(item.id)
    const fullyMatched = !!inv && round2(inv.total - (inv.allocated ?? 0)) <= 0.004
    return (
      <div key={k} className={clsx('rounded-lg px-2.5 py-2 transition-colors', sel ? 'bg-sage-50' : 'hover:bg-gray-50')}>
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={!!sel} disabled={fullyMatched && !sel} onChange={() => toggle(item)} className="h-4 w-4 rounded border-sage-300 text-sage-500 focus:ring-sage-500 disabled:opacity-40" />
          <span className="min-w-0 flex-1">
            <span className="text-sm font-medium text-sage-800">{item.number}</span>
            <span className="block truncate text-xs text-sage-400">{[shortDate(item.date), shortAddr(item.address)].filter(Boolean).join(' · ')}</span>
            {fullyMatched && (
              <span className="mt-0.5 block text-[11px] text-amber-700">Already matched to an earlier bank payment. If that match was wrong, undo it on that bank line (⋯ → Matched to) first.</span>
            )}
          </span>
          <span className="text-sm font-medium tabular-nums text-sage-700">{fmt(item.amount)}</span>
        </label>
        {sel && Math.abs((parseFloat(sel.value) || 0) - item.amount) > 0.004 && (
          <p className="ml-7 mt-1 text-[11px] text-amber-700">Part of it: {fmt(parseFloat(sel.value) || 0)} of {fmt(item.amount)}</p>
        )}
        {sel && (
          <div className="ml-7 mt-1 flex items-center gap-2">
            <span className="text-[11px] text-sage-500">Amount</span>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-sage-400">$</span>
              <input type="number" step="0.01" min="0" value={sel.value} onChange={(e) => setValue(k, e.target.value)}
                aria-label={`Amount for ${item.number}`}
                className="w-24 rounded-md border border-sage-200 py-0.5 pl-5 pr-2 text-xs tabular-nums text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500" />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={triggerClassName ?? 'inline-flex h-7 items-center rounded-md border border-gray-200 px-2.5 text-xs font-semibold text-sage-700 hover:border-sage-300 hover:bg-sage-50 whitespace-nowrap'}>
        {triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4" onClick={() => setOpen(false)}>
          <div className="mt-10 flex w-full max-w-xl flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 pb-4 pt-5">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-sage-800">Match payment</h3>
                <p className="truncate text-sm text-sage-500">{payee} · {shortDate(date)}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold tabular-nums text-sage-800">{fmt(amount)}</p>
                <button onClick={() => setOpen(false)} className="mt-1 text-sage-400 hover:text-sage-600" aria-label="Close"><X size={18} /></button>
              </div>
            </div>

            {/* Running total */}
            <div className="border-b border-gray-100 px-5 py-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className={clsx('h-full rounded-full transition-all', exact ? 'bg-emerald-500' : left < 0 ? 'bg-red-400' : 'bg-sage-500')}
                  style={{ width: `${Math.min(100, amount > 0 ? (total / amount) * 100 : 0)}%` }} />
              </div>
              <p className={clsx('mt-1.5 text-sm', exact ? 'font-semibold text-emerald-700' : left < 0 ? 'text-red-600' : 'text-sage-600')}>
                {selected.size === 0 ? 'Tick what this payment covers'
                  : exact ? <><Check size={14} className="-mt-0.5 mr-1 inline" />Adds up exactly · {selected.size} item{selected.size === 1 ? '' : 's'}</>
                  : left > 0 ? <>{fmt(total)} of {fmt(amount)} · <span className="font-semibold">{fmt(left)} to go</span></>
                  : <>{fmt(total)} — {fmt(-left)} more than the payment</>}
              </p>
            </div>

            <div className="max-h-[58vh] space-y-5 overflow-y-auto px-5 py-4">
              {/* Who paid */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-sage-500">Who paid</span>
                <div className="relative min-w-0 flex-1">
                  <select
                    value={clientIds.length === 1 ? clientIds[0] : clientIds.length ? '__many' : ''}
                    onChange={(e) => { const v = e.target.value; setClientIds(v ? [v] : []); setSelected(new Map()) }}
                    className="w-full appearance-none rounded-lg border border-sage-200 bg-white py-1.5 pl-3 pr-8 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  >
                    {clientIds.length > 1 && <option value="__many">{payerLabel}</option>}
                    <option value="">Choose the customer…</option>
                    {payers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-400" />
                </div>
              </div>

              {/* From the bank reference */}
              {suggestions.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sage-500">From the bank details</p>
                  <div className="space-y-2">
                    {suggestions.map((sg, i) => (
                      <button key={i} type="button" onClick={() => applySuggestion(sg)}
                        className="w-full rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-left transition-colors hover:bg-sky-50">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-medium text-sage-800">{sg.label}</span>
                          <span className="shrink-0 tabular-nums text-sage-600">{fmt(sg.allocations.reduce((s, a) => s + a.amount, 0))}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Combinations */}
              {clientIds.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sage-500">
                    <Sparkles size={13} className="text-sage-400" /> Adds up to {fmt(amount)}
                  </p>
                  {combos.length === 0 ? (
                    <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-sage-500">
                      Nothing of {payerLabel}&apos;s open work adds up to exactly {fmt(amount)}. Tick items below for a part payment, or search.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {combos.length > 1 && (
                        <p className="text-xs text-sage-500">More than one combination fits. If you have their remittance advice, check which invoices it lists.</p>
                      )}
                      {combos.slice(0, moreCombos ? combos.length : 3).map((c, i) => {
                        const active = selected.size === c.items.length && c.items.every((it) => selected.has(keyOf(it)))
                        return (
                          <button key={i} type="button" onClick={() => applyItems(c.items)}
                            className={clsx('w-full rounded-xl border px-3 py-2.5 text-left transition-colors',
                              active ? 'border-emerald-300 bg-emerald-50' : 'border-sage-100 bg-white hover:border-sage-300 hover:bg-sage-50/60')}>
                            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-sage-500">
                              <span>{i === 0 ? 'Best match' : `Option ${i + 1}`} · {c.items.length} item{c.items.length === 1 ? '' : 's'}</span>
                              {active ? <span className="text-emerald-700"><Check size={13} className="-mt-0.5 inline" /> Selected</span> : <span className="text-sage-400">Tap to use</span>}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {c.items.map((it) => (
                                <span key={keyOf(it)} className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-1.5 py-0.5 text-xs text-sage-700 ring-1 ring-gray-100">
                                  <span className="font-medium">{it.number}</span>
                                  <span className="tabular-nums text-sage-500">{fmt(it.amount)}</span>
                                  {it.kind !== 'invoice' && <span className={clsx('rounded px-1 text-[10px] font-semibold', KIND_TAG[it.kind])}>{KIND_SHORT[it.kind]}</span>}
                                </span>
                              ))}
                            </div>
                          </button>
                        )
                      })}
                      {combos.length > 3 && !moreCombos && (
                        <button type="button" onClick={() => setMoreCombos(true)} className="text-xs font-medium text-sage-600 underline underline-offset-2 hover:text-sage-800">
                          Show {combos.length - 3} more
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* The customer's open work */}
              {clientIds.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sage-500">{payerLabel}&apos;s open work</p>
                  {theirWork.length === 0 && <p className="text-sm text-sage-400">Nothing open for this customer.</p>}
                  {KIND_ORDER.map((kind) => {
                    const items = theirWork.filter((w) => w.kind === kind)
                    if (items.length === 0) return null
                    return (
                      <div key={kind} className="mt-2">
                        <p className="mb-0.5 px-2.5 text-[11px] font-medium text-sage-400">{WORK_KIND_LABEL[kind]}</p>
                        {items.map((it) => renderRow(it))}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Search anything */}
              <div>
                {!showSearch && clientIds.length > 0 ? (
                  <button type="button" onClick={() => setShowSearch(true)} className="text-xs font-medium text-sage-600 underline underline-offset-2 hover:text-sage-800">
                    Can&apos;t find it? Search every invoice
                  </button>
                ) : (
                  <>
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
                      <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus={showSearch}
                        placeholder="Search invoice number, customer or address"
                        className="w-full rounded-lg border border-sage-200 py-2 pl-9 pr-3 text-sm text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500" />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="mt-2">
                        {searchResults.map((c) => renderRow({ ...invoiceToWork(c), clientLabel: c.client }))}
                      </div>
                    )}
                    {q && searchResults.length === 0 && <p className="mt-2 text-sm text-sage-400">No invoices found.</p>}
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-5 py-4">
              {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              {jobsTicked > 0 && (
                <p className="mb-2 text-xs text-amber-700">{jobsTicked} job{jobsTicked === 1 ? '' : 's'} not invoiced yet will be invoiced first, then marked paid.</p>
              )}
              <div className="flex items-center gap-3">
                <button onClick={submit} disabled={isPending || selected.size === 0 || left < -0.004}
                  className={clsx('rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50',
                    exact ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-sage-500 hover:bg-sage-700')}>
                  {isPending ? 'Matching…'
                    : selected.size === 0 ? 'Confirm match'
                    : exact ? `Confirm · ${selected.size} item${selected.size === 1 ? '' : 's'}`
                    : `Confirm part match · ${fmt(total)}`}
                </button>
                <button onClick={() => setOpen(false)} className="text-sm text-sage-600 hover:text-sage-800">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
