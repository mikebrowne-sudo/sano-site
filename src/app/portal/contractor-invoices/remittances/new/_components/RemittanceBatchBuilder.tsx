'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Wallet } from 'lucide-react'
import clsx from 'clsx'
import { formatCurrency } from '@/lib/format'
import { createContractorRemittance } from '../../../_actions-remittance-batch'

export interface BuilderCI {
  id: string
  number: string
  contractorId: string | null
  contractor: string
  jobNumber: string | null
  jobAddress: string | null
  note: string | null
  amount: number
  status: string
  datePaid: string | null
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  approved: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
}

export function RemittanceBatchBuilder({ cis, contractors }: { cis: BuilderCI[]; contractors: { id: string; name: string }[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [paymentDate, setPaymentDate] = useState('')
  const [reference, setReference] = useState('')
  const [payeeLabel, setPayeeLabel] = useState('')
  const [markPaid, setMarkPaid] = useState(true)
  const [adjustments, setAdjustments] = useState<{ label: string; amount: string }[]>([])
  const [contractorFilter, setContractorFilter] = useState('')
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cis.filter((c) => {
      if (contractorFilter && c.contractorId !== contractorFilter) return false
      if (q) {
        const hay = [c.number, c.contractor, c.jobNumber, c.jobAddress, c.note].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [cis, contractorFilter, search])

  const selectedCIs = useMemo(() => cis.filter((c) => selected.has(c.id)), [cis, selected])
  const ciTotal = selectedCIs.reduce((s, c) => s + c.amount, 0)
  const adjTotal = adjustments.reduce((s, a) => s + (Number.isFinite(Number(a.amount)) ? Number(a.amount) : 0), 0)
  const total = Math.round((ciTotal + adjTotal) * 100) / 100
  const suggestedPayee = Array.from(new Set(selectedCIs.map((c) => c.contractor))).join(' & ')
  const multiContractor = new Set(selectedCIs.map((c) => c.contractorId)).size > 1

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function create() {
    setErr(null)
    if (!paymentDate) { setErr('Set the payment date.'); return }
    if (selected.size === 0 && adjustments.length === 0) { setErr('Select at least one invoice or add an adjustment.'); return }
    const adj = adjustments
      .map((a) => ({ label: a.label.trim(), amount: Number(a.amount) }))
      .filter((a) => a.label && Number.isFinite(a.amount))
    startTransition(async () => {
      const res = await createContractorRemittance({
        paymentDate,
        reference: reference || null,
        payeeLabel: payeeLabel.trim() || suggestedPayee || null,
        ciIds: Array.from(selected),
        adjustments: adj,
        markPaid,
      })
      if ('error' in res && res.error) { setErr(res.error); return }
      if ('ok' in res) router.push(`/portal/contractor-invoices/remittances/${res.id}`)
    })
  }

  const input = 'rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'

  return (
    <div className="space-y-5 tnum">
      {/* Payment details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Payment date *</span>
          <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Bank / payment reference</span>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. KRITIKAPAYROLL08-05-26" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Payee label</span>
          <input value={payeeLabel} onChange={(e) => setPayeeLabel(e.target.value)} placeholder={suggestedPayee || 'Contractor name'} className={input} />
        </label>
        <label className="flex items-center gap-2 mt-5 text-sm text-sage-700">
          <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} className="rounded border-sage-300" />
          Mark selected invoices paid on this date
        </label>
      </div>

      {/* Invoice picker */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-gray-100">
          <select value={contractorFilter} onChange={(e) => setContractorFilter(e.target.value)} className={input}>
            <option value="">All contractors</option>
            {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search job # / address / note…" className={clsx(input, 'flex-1 min-w-[180px]')} />
          <span className="text-xs text-sage-500 ml-auto">{selected.size} selected</span>
        </div>
        <ul className="divide-y divide-sage-50 max-h-[28rem] overflow-y-auto">
          {filtered.map((c) => (
            <li key={c.id}>
              <label className="flex items-start gap-3 px-4 py-3 hover:bg-sage-50/50 cursor-pointer">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="mt-1 rounded border-sage-300" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sage-800 text-sm">{c.number}</span>
                    <span className="text-xs text-sage-500">{c.contractor}</span>
                    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize', STATUS_STYLES[c.status] ?? STATUS_STYLES.pending)}>{c.status}</span>
                  </div>
                  <div className="text-xs text-sage-600">
                    {c.jobNumber ?? <span className="text-amber-700">No job</span>}{c.jobAddress && ` — ${c.jobAddress}`}
                  </div>
                  {c.note && <div className="text-[11px] text-sage-400 italic">Note: {c.note}</div>}
                </div>
                <span className="font-semibold text-sage-800 text-sm shrink-0">{formatCurrency(c.amount)}</span>
              </label>
            </li>
          ))}
          {filtered.length === 0 && <li className="px-4 py-6 text-center text-sm text-sage-400">No invoices match.</li>}
        </ul>
      </div>

      {/* Adjustments */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-sage-800">Adjustment / top-up lines</span>
          <button type="button" onClick={() => setAdjustments((a) => [...a, { label: '', amount: '' }])} className="inline-flex items-center gap-1 text-xs font-medium text-sage-600 hover:text-sage-800">
            <Plus size={13} /> Add line
          </button>
        </div>
        {adjustments.length === 0 ? (
          <p className="text-xs text-sage-400">None. Add a line for a top-up or correction (e.g. &quot;Adjustment / top-up&quot;).</p>
        ) : (
          <div className="space-y-2">
            {adjustments.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={a.label} onChange={(e) => setAdjustments((arr) => arr.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder="Label, e.g. Adjustment / top-up" className={clsx(input, 'flex-1')} />
                <input type="number" step="0.01" value={a.amount} onChange={(e) => setAdjustments((arr) => arr.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} placeholder="0.00" className={clsx(input, 'w-28 text-right')} />
                <button type="button" onClick={() => setAdjustments((arr) => arr.filter((_, j) => j !== i))} className="text-sage-400 hover:text-red-600"><X size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total + create */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-center gap-4">
        <div>
          <div className="text-[11px] text-sage-500 font-medium">Total to remit</div>
          <div className="text-2xl font-bold text-sage-800">{formatCurrency(total)}</div>
          <div className="text-[11px] text-sage-400">{selected.size} invoice{selected.size === 1 ? '' : 's'} {adjustments.length > 0 && `+ ${adjustments.length} adjustment${adjustments.length === 1 ? '' : 's'}`}{multiContractor && ' · multiple contractors'}</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {err && <span className="text-xs text-red-600 max-w-[220px] text-right">{err}</span>}
          <button type="button" onClick={create} disabled={isPending}
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50">
            <Wallet size={16} /> {isPending ? 'Creating…' : 'Create remittance'}
          </button>
        </div>
      </div>
    </div>
  )
}
