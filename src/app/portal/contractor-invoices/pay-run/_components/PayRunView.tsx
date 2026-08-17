'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import clsx from 'clsx'
import { AlertTriangle, CheckCircle2, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { createRemittancesForContractors, type GroupPlan } from '../../remittances/_actions-by-contractor'
import { PendingApprovalsList, type ApprovalRow } from '../../pending-approvals/_components/PendingApprovalsList'

export function PayRunView({
  periods, selectedKey, periodStart, periodEnd, payDate, payDateLabel, groups, grandTotal, planError, awaiting,
}: {
  periods: { key: string; label: string; payDateLabel: string }[]
  selectedKey: string
  /** null in all-owed mode — the period filter is off. */
  periodStart: string | null
  periodEnd: string | null
  payDate: string
  payDateLabel: string
  groups: GroupPlan[]
  grandTotal: number
  planError: string | null
  awaiting: ApprovalRow[]
}) {
  const router = useRouter()
  const [markPaid, setMarkPaid] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const showingAll = selectedKey === 'all'

  function changePeriod(key: string) {
    router.push(`/portal/contractor-invoices/pay-run?period=${key}`)
  }

  function createAll() {
    setErr(null); setResult(null)
    startTransition(async () => {
      const res = await createRemittancesForContractors({
        contractorIds: groups.flatMap((g) => g.contractorIds),
        paymentDate: payDate,
        markPaid,
        // Must mirror the filter used to BUILD this plan, or the server would
        // bundle a different set than the one shown. Empty = everything owed.
        period: periodStart && periodEnd ? { from: periodStart, to: periodEnd } : {},
      })
      if (res.error) { setErr(res.error); return }
      setResult(`Created ${res.created} remittance${res.created === 1 ? '' : 's'}${res.skipped ? `, ${res.skipped} skipped` : ''}${res.failed ? `, ${res.failed} failed` : ''}.`)
      router.refresh()
    })
  }

  const undated = groups.reduce((s, g) => s + g.undatedCount, 0)

  return (
    <div className="space-y-6">
      {/* Period filter — OPTIONAL. Defaults to everything owed, because a
          period-scoped view hides undated payables entirely and splits one
          contractor's outstanding work across several selections. */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[11px] uppercase tracking-wide text-sage-400">Show</label>
        <select value={selectedKey} onChange={(e) => changePeriod(e.target.value)} className="rounded-lg border border-sage-200 px-3 py-2 text-sm bg-white text-sage-700">
          <option value="all">Everything owed</option>
          {periods.map((p) => <option key={p.key} value={p.key}>Period · {p.label}</option>)}
        </select>
        <span className="text-sm font-medium text-sage-600">{payDateLabel}</span>
        {!showingAll && (
          <button
            type="button"
            onClick={() => changePeriod('all')}
            className="text-xs text-sage-500 underline hover:text-sage-700"
          >
            Clear filter
          </button>
        )}
      </div>

      {!showingAll && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Filtered to one pay period. Payables dated outside it — and any with no
          service date at all — are hidden. Switch to <strong>Everything owed</strong> to see the full amount outstanding.
        </p>
      )}

      {/* ── Awaiting authorisation (do this FIRST) ─────────────────────── */}
      <section className={clsx('rounded-2xl border p-5', awaiting.length > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-emerald-100 bg-emerald-50/40')}>
        <h2 className={clsx('flex items-center gap-2 font-semibold mb-1', awaiting.length > 0 ? 'text-amber-800' : 'text-emerald-800')}>
          {awaiting.length > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          {awaiting.length > 0
            ? `${awaiting.length} completed job${awaiting.length === 1 ? '' : 's'} awaiting authorisation${showingAll ? '' : ' this period'}`
            : `Nothing awaiting authorisation${showingAll ? '' : ' for this period'}`}
        </h2>
        <p className="text-[13px] text-sage-500 mb-3">
          {awaiting.length > 0
            ? 'Approve these first so they’re included in the pay run — approving creates the payable and it moves into “ready to pay”.'
            : `Every completed job${showingAll ? '' : ' in this period'} has an approved payable.`}
        </p>
        {awaiting.length > 0 && (
          <PendingApprovalsList rows={awaiting} contractors={Array.from(new Map(awaiting.map((r) => [r.contractorId, r.contractorName])).entries()).map(([id, name]) => ({ id, name }))} />
        )}
      </section>

      {/* ── Ready to pay ───────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-sage-800"><Users size={18} /> Ready to pay</h2>
          <span className="text-sm text-sage-600 tabular-nums">{groups.length} payee{groups.length === 1 ? '' : 's'} · {formatCurrency(grandTotal)}</span>
        </div>

        {planError ? (
          <p className="text-sm text-red-600">{planError}</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-sage-400">
            {showingAll
              ? 'Nothing is currently owed — every authorised job has been paid.'
              : 'No authorised, unpaid jobs in this period.'}
            {awaiting.length > 0 ? ' Approve the jobs above to add them here.' : ''}
          </p>
        ) : (
          <>
            {/* Only meaningful when a period filter is on — in all-owed mode
                undated payables are INCLUDED, so there is nothing to warn about. */}
            {!showingAll && undated > 0 && (
              <p className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                {undated} approved job{undated === 1 ? ' has' : 's have'} no service date, so {undated === 1 ? 'it is' : 'they are'} excluded from this dated run.
                Switch to <strong>Everything owed</strong> to include {undated === 1 ? 'it' : 'them'}.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-sage-500 border-b border-gray-100">
                    <th className="py-2 pr-3 font-semibold">Payee</th>
                    <th className="py-2 pr-3 font-semibold">Reference</th>
                    <th className="py-2 pr-3 font-semibold text-right">Jobs</th>
                    <th className="py-2 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.key} className="border-b border-gray-50">
                      <td className="py-2 pr-3 text-sage-800 font-medium">{g.payeeName}{g.combined && <span className="ml-1 text-[10px] uppercase tracking-wide text-sage-400">combined</span>}</td>
                      <td className="py-2 pr-3 font-mono text-xs text-sage-500">{g.reference}</td>
                      <td className="py-2 pr-3 text-right text-sage-600 tabular-nums">{g.ciCount}</td>
                      <td className="py-2 text-right font-medium text-sage-800 tabular-nums">{formatCurrency(g.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <label className="flex items-center gap-2 text-sm text-sage-600">
                <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} />
                Mark paid now (only if the money has already left the bank)
              </label>
              <button
                type="button" onClick={createAll} disabled={isPending || groups.length === 0}
                className="bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50"
              >
                {isPending ? 'Creating…' : `Create ${groups.length} remittance${groups.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </>
        )}

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        {result && (
          <p className="mt-3 text-sm text-emerald-700">
            {result} <Link href="/portal/contractor-invoices/remittances" className="underline">View remittances →</Link>
          </p>
        )}
      </section>
    </div>
  )
}
