'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check, Search } from 'lucide-react'
import { reconcileBankTransaction } from '../_actions'
import clsx from 'clsx'

export interface MatchInvoice {
  id: string
  number: string
  total: number
  status: string
  address: string
  client: string
  /** Amount already allocated to this invoice (live). Remaining = total − this. */
  allocated?: number
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}
function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
function remainingOf(c: MatchInvoice): number {
  return round2(c.total - (c.allocated ?? 0))
}

/** Trim a service address to street + suburb, dropping city/region/postcode. */
function shortAddr(addr: string): string {
  if (!addr) return ''
  const parts = addr.split(',').map((s) => s.trim()).filter(Boolean)
  const cleaned = parts.filter((p) => !/new zealand/i.test(p) && !/^\d{4}$/.test(p) && !/^auckland\b/i.test(p))
  return (cleaned.length ? cleaned : parts).slice(0, 2).join(', ')
}
function label(c: MatchInvoice): string {
  return shortAddr(c.address) || c.client || ''
}

export function MatchPanel({
  lineId,
  amount,
  date,
  payee,
  candidates,
  allCandidates,
  scoped = false,
  suggestions,
  triggerLabel = 'Match →',
}: {
  lineId: string
  amount: number
  date: string
  payee: string
  candidates: MatchInvoice[]
  /** Full, all-clients searchable candidate list (includes paid invoices). */
  allCandidates?: MatchInvoice[]
  scoped?: boolean
  suggestions: string[][]
  /** Trigger link text — "Match →" for unmatched, "Allocate →" for paid lines. */
  triggerLabel?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [query, setQuery] = useState('')
  // invoiceId → allocated amount (as string, for the editable inputs).
  const [selected, setSelected] = useState<Map<string, string>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const full = allCandidates ?? candidates
  const byId = useMemo(() => new Map(full.map((c) => [c.id, c])), [full])

  // Base list: scoped candidates, or the full pool when "show all" / searching.
  const q = query.trim().toLowerCase()
  const baseList = showAll || q ? full : candidates
  const shown = useMemo(() => {
    if (!q) return baseList
    return full.filter((c) =>
      c.number.toLowerCase().includes(q) ||
      c.client.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q),
    )
  }, [q, baseList, full])

  const canShowAll = scoped && full.length > candidates.length

  const allocatedTotal = useMemo(
    () => round2(Array.from(selected.values()).reduce((s, v) => s + (parseFloat(v) || 0), 0)),
    [selected],
  )
  const matches = Math.abs(allocatedTotal - amount) < 0.005
  const selectedUnpaid = Array.from(selected.keys()).filter((id) => byId.get(id)?.status !== 'paid')

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        // Default the amount to whatever of the payment is still unallocated,
        // capped at the invoice's own remaining balance.
        const inv = byId.get(id)
        const already = round2(Array.from(next.values()).reduce((s, v) => s + (parseFloat(v) || 0), 0))
        const payLeft = round2(amount - already)
        const invLeft = inv ? remainingOf(inv) : payLeft
        const suggest = Math.max(0, Math.min(payLeft, invLeft))
        next.set(id, suggest > 0 ? suggest.toFixed(2) : '')
      }
      return next
    })
  }
  function setAmount(id: string, value: string) {
    setSelected((prev) => {
      const next = new Map(prev)
      next.set(id, value)
      return next
    })
  }
  function applySuggestion(ids: string[]) {
    const next = new Map<string, string>()
    for (const id of ids) {
      const inv = byId.get(id)
      next.set(id, inv ? remainingOf(inv).toFixed(2) : '')
    }
    setSelected(next)
  }
  function submit() {
    setError(null)
    const allocations = Array.from(selected.entries())
      .map(([invoiceId, v]) => ({ invoiceId, amount: round2(parseFloat(v) || 0) }))
      .filter((a) => a.amount > 0)
    if (allocations.length === 0) { setError('Enter an amount for at least one invoice.'); return }
    startTransition(async () => {
      const r = await reconcileBankTransaction(lineId, allocations, date)
      if (!r.ok) { setError(r.error ?? 'Could not save.'); return }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sage-600 hover:text-sage-800 underline whitespace-nowrap">{triggerLabel}</button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 overflow-y-auto" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mt-12" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-sage-800">Allocate payment</h3>
                <p className="text-sm text-sage-500">{payee} · {fmt(amount)} · {date}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-sage-400 hover:text-sage-600"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {suggestions.length > 0 && !q && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sage-500 mb-2">Suggested {suggestions.length === 1 ? 'match' : 'matches'}</p>
                  <div className="space-y-2">
                    {suggestions.map((ids, i) => (
                      <button
                        key={i}
                        onClick={() => applySuggestion(ids)}
                        className="w-full text-left bg-sage-50 hover:bg-sage-100 border border-sage-100 rounded-lg px-3 py-2.5 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs font-semibold text-sage-600 mb-1">
                          <span>{ids.length} invoice{ids.length !== 1 ? 's' : ''}</span>
                          <span>{fmt(ids.reduce((s, id) => s + (byId.get(id)?.total ?? 0), 0))}</span>
                        </div>
                        {ids.map((id) => {
                          const inv = byId.get(id)
                          if (!inv) return null
                          return (
                            <div key={id} className="flex items-baseline justify-between gap-2 text-sm">
                              <span className="min-w-0 truncate"><span className="font-medium text-sage-800">{inv.number}</span> <span className="text-sage-400">{label(inv)}</span></span>
                              <span className="text-sage-500 tabular-nums shrink-0">{fmt(inv.total)}</span>
                            </div>
                          )
                        })}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Free-text search — find ANY invoice (including already-paid) by
                  number, client, or address. This is the fix for reaching a
                  paid manual invoice like INV-26022. */}
              <div>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search invoice number, client, or address (e.g. INV-26022, Bunce)"
                    className="w-full rounded-lg border border-sage-200 pl-9 pr-3 py-2 text-sm text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sage-500">
                    {shown.length ? (q ? 'Search results' : 'Or pick invoices') : 'No invoices found'}
                    {scoped && !showAll && !q && shown.length > 0 && <span className="ml-1 normal-case font-normal text-sage-400">(matched client only)</span>}
                  </p>
                  {canShowAll && !q && (
                    <button
                      type="button"
                      onClick={() => setShowAll((v) => !v)}
                      className="text-xs font-medium text-sage-600 hover:text-sage-800 underline underline-offset-2 shrink-0"
                    >
                      {showAll ? 'Show only matched client' : 'Show all clients'}
                    </button>
                  )}
                </div>
                <div className="divide-y divide-gray-50">
                  {shown.slice(0, 60).map((c) => {
                    const isSel = selected.has(c.id)
                    const rem = remainingOf(c)
                    return (
                      <div key={c.id} className="py-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={isSel} onChange={() => toggle(c.id)} className="h-4 w-4 rounded border-sage-300 text-sage-500 focus:ring-sage-500" />
                          <span className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-sage-800">{c.number}</span>
                            {c.status === 'paid' && <span className="ml-2 text-xs text-emerald-600">paid</span>}
                            {c.status === 'draft' && <span className="ml-2 text-xs text-gray-400">draft</span>}
                            {(c.allocated ?? 0) > 0 && <span className="ml-2 text-xs text-sage-400">{fmt(rem)} left</span>}
                            <span className="block text-xs text-sage-400 truncate">{label(c) || c.client}</span>
                          </span>
                          <span className="text-sm font-medium text-sage-700 tabular-nums">{fmt(c.total)}</span>
                        </label>
                        {isSel && (
                          <div className="mt-1.5 ml-7 flex items-center gap-2">
                            <span className="text-xs text-sage-500">Allocate</span>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-sage-400">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={selected.get(c.id) ?? ''}
                                onChange={(e) => setAmount(c.id, e.target.value)}
                                className="w-28 rounded-md border border-sage-200 pl-5 pr-2 py-1 text-sm text-sage-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-sage-500"
                                aria-label={`Amount allocated to ${c.number}`}
                              />
                            </div>
                            <button type="button" onClick={() => setAmount(c.id, rem.toFixed(2))} className="text-xs text-sage-500 hover:text-sage-700 underline">full</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100">
              {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="text-sage-500">Allocated total</span>
                <span className={clsx('font-bold tabular-nums', matches ? 'text-emerald-700' : 'text-sage-800')}>
                  {fmt(allocatedTotal)}{matches && <Check size={14} className="inline ml-1 -mt-0.5" />}
                  <span className="text-sage-400 font-normal"> / {fmt(amount)}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={submit}
                  disabled={isPending || selected.size === 0}
                  className="bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50 text-sm"
                >
                  {isPending ? 'Saving…' : selectedUnpaid.length > 0 ? `Allocate & mark ${selectedUnpaid.length} paid` : 'Allocate payment'}
                </button>
                <button onClick={() => setOpen(false)} className="text-sm text-sage-600 hover:text-sage-800">Cancel</button>
                {!matches && allocatedTotal > 0 && <span className="text-xs text-amber-600 ml-auto">Partial — {fmt(round2(amount - allocatedTotal))} of the payment left</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
