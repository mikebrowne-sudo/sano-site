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

/** Format an ISO yyyy-mm-dd as d Mon (compact, no year) for the preview lines. */
function shortDate(iso: string | null): string {
  if (!iso) return '—'
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${Number(m[3])} ${months[Number(m[2]) - 1]}`
}

export function ContractorRemittanceBuilder({ contractors }: { contractors: ContractorRow[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [paymentDate, setPaymentDate] = useState(today())
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTo, setPeriodTo] = useState('')
  const [markPaid, setMarkPaid] = useState(false)
  const [plan, setPlan] = useState<GroupPlan[] | null>(null)
  const [result, setResult] = useState<BuildResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Only send a period when at least one bound is set; empty string = open bound.
  const period = periodFrom || periodTo ? { from: periodFrom || undefined, to: periodTo || undefined } : undefined

  function invalidatePreview() { setPlan(null); setResult(null) }

  function toggle(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
    invalidatePreview()
  }

  function preview() {
    setErr(null); setResult(null)
    if (periodFrom && periodTo && periodFrom > periodTo) { setErr('Period "from" is after "to".'); return }
    startTransition(async () => {
      const res = await previewRemittancesForContractors(Array.from(selected), paymentDate, period)
      if (res.error) { setErr(res.error); return }
      setPlan(res.groups ?? [])
    })
  }

  function create() {
    setErr(null)
    if (selected.size === 0) { setErr('Select at least one contractor.'); return }
    if (periodFrom && periodTo && periodFrom > periodTo) { setErr('Period "from" is after "to".'); return }
    startTransition(async () => {
      const res = await createRemittancesForContractors({ contractorIds: Array.from(selected), paymentDate, markPaid, period })
      if (res.error) { setErr(res.error); return }
      setResult(res); setPlan(null)
      router.refresh()
    })
  }

  const input = 'rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'
  const totalUndated = plan ? plan.reduce((s, g) => s + g.undatedCount, 0) : 0

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Payment date *</span>
          <input type="date" value={paymentDate} onChange={(e) => { setPaymentDate(e.target.value); invalidatePreview() }} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Period from</span>
          <input type="date" value={periodFrom} onChange={(e) => { setPeriodFrom(e.target.value); invalidatePreview() }} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Period to</span>
          <input type="date" value={periodTo} onChange={(e) => { setPeriodTo(e.target.value); invalidatePreview() }} className={input} />
        </label>
        {period && (
          <button type="button" onClick={() => { setPeriodFrom(''); setPeriodTo(''); invalidatePreview() }} className="text-[11px] text-sage-500 underline underline-offset-2 hover:text-sage-700 pb-2.5">Clear period</button>
        )}
        <label className="flex items-center gap-2 text-sm text-sage-700">
          <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} className="rounded border-sage-300" />
          <span>Mark paid now <span className="block text-[11px] text-sage-400">Leave off to send first, then mark paid once the money leaves the bank.</span></span>
        </label>
        <span className="text-xs text-sage-500 ml-auto">{selected.size} selected</span>
        <p className="w-full text-[11px] text-sage-400 -mt-1">
          Leave the period blank to include all approved, unpaid jobs. Set a period to build one pay run for jobs done in that date range
          (e.g. 1–15 with one payment date, then 16–end of month on a separate, earlier-paid run). Jobs with no service date are never
          swept into a dated run — they&apos;re counted separately in the preview.
        </p>
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
          <p className="text-sm font-semibold text-sage-800 mb-1">Will create {plan.filter((g) => g.ciCount > 0).length} remittance(s){period ? ' for the selected period' : ''}:</p>
          {period && (
            <p className="text-[11px] text-sage-400 mb-3">
              Jobs with a service date {periodFrom ? `on/after ${shortDate(periodFrom)}` : ''}{periodFrom && periodTo ? ' and ' : ''}{periodTo ? `on/before ${shortDate(periodTo)}` : ''}. Payment date {shortDate(paymentDate)}.
            </p>
          )}
          <ul className="space-y-3 text-sm">
            {plan.map((g) => (
              <li key={g.key} className={clsx(g.ciCount === 0 && 'text-sage-400')}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sage-800">{g.payeeName}{g.combined ? ' (combined)' : ''} · <span className="font-mono text-xs">{g.reference}</span></span>
                  <span className="font-semibold">{g.ciCount === 0 ? 'no jobs in range' : formatCurrency(g.total)}</span>
                </div>
                {g.ciCount > 0 && (
                  <>
                    <div className="text-[11px] text-sage-500 mt-0.5">
                      {g.ciCount} job{g.ciCount === 1 ? '' : 's'}
                      {g.hoursTotal > 0 && ` · ${g.hoursTotal}h`}
                      {g.gstTotal > 0 && ` · incl. ${formatCurrency(g.gstTotal)} GST`}
                    </div>
                    <ul className="mt-1 ml-1 border-l border-sage-100 pl-3 space-y-0.5 text-[11px] text-sage-500">
                      {g.lines.map((ln) => (
                        <li key={ln.ciId} className="flex items-center justify-between gap-3">
                          <span className="truncate">
                            <span className="font-mono">{ln.invoiceNumber || '—'}</span>
                            <span className="text-sage-400"> · {shortDate(ln.serviceDate)}</span>
                            {ln.hours != null && <span className="text-sage-400"> · {ln.hours}h</span>}
                          </span>
                          <span className="shrink-0">{formatCurrency(ln.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {g.undatedCount > 0 && (
                  <div className="text-[11px] text-amber-600 mt-1">
                    {g.undatedCount} approved job{g.undatedCount === 1 ? '' : 's'} with no service date — not included in this dated run.
                  </div>
                )}
              </li>
            ))}
          </ul>
          {period && totalUndated > 0 && (
            <p className="mt-3 text-[11px] text-amber-600 border-t border-sage-50 pt-2">
              {totalUndated} approved job{totalUndated === 1 ? '' : 's'} across the selection have no service date and were left out of this period run. Clear the period to include them, or set their service date first.
            </p>
          )}
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
