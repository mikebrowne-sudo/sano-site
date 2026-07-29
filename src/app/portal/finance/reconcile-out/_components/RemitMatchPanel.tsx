'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, X, Search } from 'lucide-react'
import clsx from 'clsx'
import { formatCurrency } from '@/lib/format'
import { reconcileRemittancePayment } from '../_actions'

export interface MatchRemittance {
  id: string
  number: string
  payee: string
  reference: string
  paymentDate: string | null
  total: number
  allocated: number
  paidAt: string | null
  confirmed: boolean
}

/** Match one outgoing debit to one or more remittances. Defaults the suggested
 *  remittance in, full-amount; staff can add/remove and adjust split amounts.
 *  Searchable by number, contractor name, reference, amount. */
export function RemitMatchPanel({
  bankTxnId,
  debitAmount,
  remaining,
  suggestedId,
  remittances,
  triggerLabel = 'Match →',
}: {
  bankTxnId: string
  debitAmount: number
  remaining: number
  suggestedId?: string | null
  remittances: MatchRemittance[]
  triggerLabel?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<Map<string, number>>(() => {
    const m = new Map<string, number>()
    if (suggestedId) {
      const r = remittances.find((x) => x.id === suggestedId)
      if (r) m.set(suggestedId, round2(Math.min(remaining, r.total - r.allocated)))
    }
    return m
  })
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const amountQ = Number(needle.replace(/[^0-9.]/g, ''))
    return remittances
      .filter((r) => {
        const openBal = round2(r.total - r.allocated)
        if (openBal <= 0.005 && !picked.has(r.id)) return false // hide fully-allocated unless picked
        if (!needle) return true
        const hay = `${r.number} ${r.payee} ${r.reference}`.toLowerCase()
        if (hay.includes(needle)) return true
        if (amountQ && round2(r.total) === round2(amountQ)) return true
        return false
      })
      .slice(0, 30)
  }, [q, remittances, picked])

  const pickedSum = round2(Array.from(picked.values()).reduce((s, n) => s + n, 0))
  const leftover = round2(remaining - pickedSum)

  function toggle(r: MatchRemittance) {
    setErr(null)
    setPicked((prev) => {
      const m = new Map(prev)
      if (m.has(r.id)) m.delete(r.id)
      else m.set(r.id, round2(Math.min(round2(remaining - pickedSum), round2(r.total - r.allocated))))
      return m
    })
  }

  function setAmount(id: string, value: string) {
    const n = round2(Number(value))
    setPicked((prev) => { const m = new Map(prev); m.set(id, Number.isFinite(n) ? n : 0); return m })
  }

  function submit() {
    setErr(null)
    const allocations = Array.from(picked.entries()).filter(([, a]) => a > 0).map(([remittanceId, amount]) => ({ remittanceId, amount }))
    if (allocations.length === 0) { setErr('Pick at least one remittance and an amount.'); return }
    startTransition(async () => {
      const res = await reconcileRemittancePayment(bankTxnId, allocations)
      if (!res.ok) { setErr(res.error ?? 'Could not reconcile.'); return }
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sage-600 hover:text-sage-800 underline whitespace-nowrap inline-flex items-center gap-1">
        <Link2 size={13} /> {triggerLabel}
      </button>
    )
  }

  return (
    <div className="mt-2 w-full max-w-xl bg-white border border-sage-200 rounded-xl shadow-lg p-4 text-left">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-sage-800">Match {formatCurrency(Math.abs(debitAmount))} to remittance(s)</span>
        <button type="button" onClick={() => setOpen(false)} className="text-sage-400 hover:text-sage-600"><X size={16} /></button>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-sage-200 px-2.5 py-1.5 mb-3">
        <Search size={14} className="text-sage-400 shrink-0" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search remittance no., contractor, reference or amount"
          className="w-full text-sm text-sage-800 focus:outline-none"
        />
      </div>

      <ul className="max-h-64 overflow-y-auto divide-y divide-sage-50 border border-sage-100 rounded-lg">
        {results.map((r) => {
          const isPicked = picked.has(r.id)
          const openBal = round2(r.total - r.allocated)
          return (
            <li key={r.id} className={clsx('px-3 py-2', isPicked && 'bg-sage-50/60')}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={isPicked} onChange={() => toggle(r)} className="rounded border-sage-300" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-sage-800">
                    <span className="font-mono text-xs">{r.number}</span> · {r.payee || '—'}
                    {r.confirmed && <span className="ml-2 text-[10px] text-emerald-600 font-medium">confirmed</span>}
                    {!r.confirmed && r.paidAt && <span className="ml-2 text-[10px] text-amber-600 font-medium">paid, unconfirmed</span>}
                  </div>
                  <div className="text-[11px] text-sage-400">
                    {r.paymentDate ?? 'no date'} · total {formatCurrency(r.total)}
                    {r.allocated > 0 && ` · ${formatCurrency(openBal)} open`}
                  </div>
                </div>
                {isPicked ? (
                  <input
                    type="number" step="0.01" min="0"
                    value={picked.get(r.id) ?? 0}
                    onChange={(e) => setAmount(r.id, e.target.value)}
                    onClick={(e) => e.preventDefault()}
                    className="w-24 rounded border border-sage-200 px-2 py-1 text-sm text-right tabular-nums"
                  />
                ) : (
                  <span className="text-sm text-sage-500 tabular-nums shrink-0">{formatCurrency(r.total)}</span>
                )}
              </label>
            </li>
          )
        })}
        {results.length === 0 && <li className="px-3 py-4 text-center text-xs text-sage-400">No remittances match.</li>}
      </ul>

      <div className="flex items-center justify-between mt-3 text-xs">
        <span className={clsx('tabular-nums', Math.abs(leftover) < 0.005 ? 'text-emerald-600' : 'text-amber-600')}>
          Allocated {formatCurrency(pickedSum)} of {formatCurrency(remaining)}
          {Math.abs(leftover) >= 0.005 && ` · ${formatCurrency(leftover)} left`}
        </span>
        {err && <span className="text-red-600">{err}</span>}
      </div>

      <div className="flex items-center justify-end gap-2 mt-3">
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-sage-600 hover:text-sage-800 px-3 py-1.5">Cancel</button>
        <button type="button" onClick={submit} disabled={isPending} className="inline-flex items-center gap-1.5 bg-sage-500 text-white font-semibold px-4 py-1.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
          <Link2 size={14} /> {isPending ? 'Saving…' : 'Confirm match'}
        </button>
      </div>
    </div>
  )
}

function round2(n: number): number { return Math.round((n + Number.EPSILON) * 100) / 100 }
