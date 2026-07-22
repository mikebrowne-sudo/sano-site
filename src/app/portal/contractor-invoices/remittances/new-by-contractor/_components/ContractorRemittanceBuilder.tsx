'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet, Eye } from 'lucide-react'
import clsx from 'clsx'
import { formatCurrency } from '@/lib/format'
import {
  previewRemittancesForContractors, createRemittancesForContractors,
  type GroupPlan, type BuildResult,
} from '../../_actions-by-contractor'

export interface ContractorRow {
  id: string
  name: string
  company: string | null
  gstNumber: string | null
  unpaidCount: number
  unpaidTotal: number
}

function today() { return new Date().toISOString().slice(0, 10) }

export function ContractorRemittanceBuilder({ contractors }: { contractors: ContractorRow[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [paymentDate, setPaymentDate] = useState(today())
  const [markPaid, setMarkPaid] = useState(false)
  const [plan, setPlan] = useState<GroupPlan[] | null>(null)
  const [result, setResult] = useState<BuildResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
    setPlan(null); setResult(null)
  }

  function preview() {
    setErr(null); setResult(null)
    startTransition(async () => {
      const res = await previewRemittancesForContractors(Array.from(selected), paymentDate)
      if (res.error) { setErr(res.error); return }
      setPlan(res.groups ?? [])
    })
  }

  function create() {
    setErr(null)
    if (selected.size === 0) { setErr('Select at least one contractor.'); return }
    startTransition(async () => {
      const res = await createRemittancesForContractors({ contractorIds: Array.from(selected), paymentDate, markPaid })
      if (res.error) { setErr(res.error); return }
      setResult(res); setPlan(null)
      router.refresh()
    })
  }

  const input = 'rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Payment date *</span>
          <input type="date" value={paymentDate} onChange={(e) => { setPaymentDate(e.target.value); setPlan(null) }} className={input} />
        </label>
        <label className="flex items-center gap-2 text-sm text-sage-700">
          <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} className="rounded border-sage-300" />
          <span>Mark paid now <span className="block text-[11px] text-sage-400">Leave off to send first, then mark paid once the money leaves the bank.</span></span>
        </label>
        <span className="text-xs text-sage-500 ml-auto">{selected.size} selected</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <ul className="divide-y divide-sage-50 max-h-[26rem] overflow-y-auto">
          {contractors.map((c) => (
            <li key={c.id}>
              <label className="flex items-center gap-3 px-4 py-3 hover:bg-sage-50/50 cursor-pointer">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="rounded border-sage-300" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-sage-800 text-sm">{c.name}</span>
                  {c.company && <span className="text-xs text-sage-400 ml-2">{c.company}</span>}
                  <div className="text-xs text-sage-500">{c.unpaidCount} unpaid job{c.unpaidCount === 1 ? '' : 's'}</div>
                </div>
                <span className="font-semibold text-sage-800 text-sm shrink-0">{formatCurrency(c.unpaidTotal)}</span>
              </label>
            </li>
          ))}
          {contractors.length === 0 && <li className="px-4 py-6 text-center text-sm text-sage-400">No contractors with unpaid jobs.</li>}
        </ul>
      </div>

      {/* Preview plan */}
      {plan && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-sage-800 mb-2">Will create {plan.filter((g) => g.ciCount > 0).length} remittance(s):</p>
          <ul className="space-y-1 text-sm">
            {plan.map((g) => (
              <li key={g.key} className={clsx('flex items-center justify-between', g.ciCount === 0 && 'text-sage-400')}>
                <span>{g.payeeName}{g.combined ? ' (combined)' : ''} · <span className="font-mono text-xs">{g.reference}</span> · {g.ciCount} job{g.ciCount === 1 ? '' : 's'}</span>
                <span className="font-semibold">{g.ciCount === 0 ? 'no unpaid jobs' : formatCurrency(g.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-sm">
          <p className="font-semibold text-sage-800">{result.created} created · {result.skipped} skipped · {result.failed} failed</p>
          <ul className="mt-1 space-y-0.5 text-xs text-sage-600">
            {result.items.map((i, n) => (
              <li key={n}>{i.payee} · <span className="font-mono">{i.reference}</span> — {i.ok ? `${i.ci_count} job(s), ${formatCurrency(i.total)}` : `⚠ ${i.reason}`}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3">
        {err && <span className="text-xs text-red-600">{err}</span>}
        <button type="button" onClick={preview} disabled={isPending || selected.size === 0} className="inline-flex items-center gap-2 bg-white border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 disabled:opacity-50 ml-auto"><Eye size={15} /> Preview</button>
        <button type="button" onClick={create} disabled={isPending || selected.size === 0} className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50"><Wallet size={16} /> {isPending ? 'Creating…' : 'Create remittances'}</button>
      </div>
    </div>
  )
}
