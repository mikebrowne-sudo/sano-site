'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check } from 'lucide-react'
import { matchCreditToInvoices } from '../_actions'
import clsx from 'clsx'

export interface MatchInvoice {
  id: string
  number: string
  total: number
  status: string
  address: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

export function MatchPanel({
  lineId,
  amount,
  date,
  payee,
  candidates,
  suggestions,
}: {
  lineId: string
  amount: number
  date: string
  payee: string
  candidates: MatchInvoice[]
  suggestions: string[][]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates])
  const selectedTotal = useMemo(
    () => Array.from(selected).reduce((s, id) => s + (byId.get(id)?.total ?? 0), 0),
    [selected, byId],
  )
  const matches = Math.abs(selectedTotal - amount) < 0.005
  const selectedUnpaid = Array.from(selected).filter((id) => byId.get(id)?.status !== 'paid')

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function applySuggestion(ids: string[]) {
    setSelected(new Set(ids))
  }
  function submit() {
    setError(null)
    startTransition(async () => {
      const r = await matchCreditToInvoices(lineId, Array.from(selected), date)
      if (!r.ok) { setError(r.error ?? 'Could not save.'); return }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sage-600 hover:text-sage-800 underline whitespace-nowrap">Match →</button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 overflow-y-auto" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mt-12" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-sage-800">Match payment</h3>
                <p className="text-sm text-sage-500">{payee} · {fmt(amount)} · {date}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-sage-400 hover:text-sage-600"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {suggestions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sage-500 mb-2">Suggested {suggestions.length === 1 ? 'match' : 'matches'}</p>
                  <div className="space-y-1.5">
                    {suggestions.map((ids, i) => (
                      <button
                        key={i}
                        onClick={() => applySuggestion(ids)}
                        className="w-full text-left text-sm bg-sage-50 hover:bg-sage-100 border border-sage-100 rounded-lg px-3 py-2 transition-colors"
                      >
                        {ids.map((id) => byId.get(id)?.number ?? id).join(' + ')}
                        <span className="text-sage-400"> = {fmt(ids.reduce((s, id) => s + (byId.get(id)?.total ?? 0), 0))}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-sage-500 mb-2">{candidates.length ? 'Or pick invoices' : 'No candidate invoices found'}</p>
                <div className="divide-y divide-gray-50">
                  {candidates.map((c) => (
                    <label key={c.id} className="flex items-center gap-3 py-2 cursor-pointer">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="h-4 w-4 rounded border-sage-300 text-sage-500 focus:ring-sage-500" />
                      <span className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-sage-800">{c.number}</span>
                        {c.status === 'paid' && <span className="ml-2 text-xs text-emerald-600">paid</span>}
                        {c.status === 'draft' && <span className="ml-2 text-xs text-gray-400">draft</span>}
                        <span className="block text-xs text-sage-400 truncate">{c.address}</span>
                      </span>
                      <span className="text-sm font-medium text-sage-700 tabular-nums">{fmt(c.total)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100">
              {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="text-sage-500">Selected total</span>
                <span className={clsx('font-bold tabular-nums', matches ? 'text-emerald-700' : 'text-sage-800')}>
                  {fmt(selectedTotal)}{matches && <Check size={14} className="inline ml-1 -mt-0.5" />}
                  <span className="text-sage-400 font-normal"> / {fmt(amount)}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={submit}
                  disabled={isPending || selected.size === 0}
                  className="bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50 text-sm"
                >
                  {isPending ? 'Saving…' : selectedUnpaid.length > 0 ? `Mark ${selectedUnpaid.length} paid & clear` : 'Confirm & clear line'}
                </button>
                <button onClick={() => setOpen(false)} className="text-sm text-sage-600 hover:text-sage-800">Cancel</button>
                {!matches && selected.size > 0 && <span className="text-xs text-amber-600 ml-auto">Total doesn’t equal the payment</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
