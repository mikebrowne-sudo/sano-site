'use client'

// Contractor Pay workspace (Phase 3).
//
// One screen that answers "what do we owe right now?" and "what needs approving
// before we can pay it?" — in that order of prominence.
//
//   Summary  ->  Ready to pay (dominant)  ->  Awaiting approval  ->  Pay Run
//
// Design notes:
//  * DEFAULT IS EVERYTHING OWED. The pay period is an optional filter. A
//    service-date filter hides real money — undated payables match no period,
//    and one contractor's work can straddle months — so the default must be the
//    full picture. Filtering warns about exactly what it hid.
//  * Contractor grouping comes from the planner's company-groups (a shared GST
//    number collapses a couple into one payee), so what's shown here is exactly
//    what would be paid.
//  * Multi-cleaner jobs are CONTEXT, not a warning. Two cleaners on one job
//    legitimately produce two payables; the authoritative duplicate guard is the
//    job_id + contractor_id check in approveContractorPay.
//  * "Pay Run" is UI terminology for the canonical
//    contractor_invoices -> contractor_remittances flow. The legacy
//    pay_runs.kind='contractor' system is retired and never written here.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import clsx from 'clsx'
import { AlertTriangle, ChevronDown, ChevronRight, Users, Search, X } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/format'
import { createRemittancesForContractors, type GroupPlan } from '../../remittances/_actions-by-contractor'
import { PendingApprovalsList, type ApprovalRow } from '../../pending-approvals/_components/PendingApprovalsList'
import { AwaitingPaymentSection } from './AwaitingPaymentSection'
import type { AwaitingPaymentSummary } from '@/lib/awaiting-payment-data'

function money(n: number) { return formatCurrency(n) }

/** Undated payables stay visible — they're real money — with an honest label. */
function serviceDateLabel(iso: string | null): string {
  return iso ? formatDate(iso) : 'Date unavailable'
}

export function PayRunView({
  periods, selectedKey, periodStart, periodEnd, payDate, groups, grandTotal, planError, awaiting,
  awaitingPayment,
}: {
  periods: { key: string; label: string; payDateLabel: string }[]
  selectedKey: string
  /** null in all-owed mode — the period filter is off. */
  periodStart: string | null
  periodEnd: string | null
  payDate: string
  groups: GroupPlan[]
  grandTotal: number
  planError: string | null
  awaiting: ApprovalRow[]
  /** Remittances created but not yet paid out — never period-filtered. */
  awaitingPayment: AwaitingPaymentSummary
}) {
  const router = useRouter()
  const [markPaid, setMarkPaid] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [isPending, startTransition] = useTransition()

  const showingAll = selectedKey === 'all'

  function changePeriod(key: string) {
    router.push(`/portal/contractor-invoices/pay-run?period=${key}`)
  }

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  // Client-side search across payee, job number and address. Filters only what
  // is DISPLAYED — the payment itself always uses the full server-built plan for
  // the current period filter, so search can never narrow what gets paid.
  const needle = q.trim().toLowerCase()
  const visibleGroups = needle
    ? groups.filter((g) =>
        g.payeeName.toLowerCase().includes(needle) ||
        g.lines.some((l) =>
          (l.jobNumber ?? '').toLowerCase().includes(needle) ||
          (l.jobAddress ?? '').toLowerCase().includes(needle) ||
          (l.invoiceNumber ?? '').toLowerCase().includes(needle)),
      )
    : groups

  const payeeCount = groups.length
  const itemCount = groups.reduce((s, g) => s + g.ciCount, 0)
  const undated = groups.reduce((s, g) => s + g.undatedCount, 0)
  const hasAwaitingPayment = awaitingPayment.remittanceCount > 0
  // Only a GENUINE disagreement blocks. 'missing'/'unreadable' are shown per
  // group but don't stop the run — the remittance itself carries no bank
  // details, so creating it is still safe; the payment is the human step.
  const bankConflicts = groups.filter((g) => g.bank?.status === 'conflict')

  function createAll() {
    setErr(null); setResult(null)
    startTransition(async () => {
      const res = await createRemittancesForContractors({
        // Always the FULL plan, never the search-filtered view.
        contractorIds: groups.flatMap((g) => g.contractorIds),
        paymentDate: payDate,
        markPaid,
        // Must mirror the filter used to BUILD this plan, or the server would
        // bundle a different set than the one shown. Empty = everything owed.
        period: periodStart && periodEnd ? { from: periodStart, to: periodEnd } : {},
      })
      if (res.error) { setErr(res.error); setConfirming(false); return }
      setResult(`Created ${res.created} remittance${res.created === 1 ? '' : 's'}${res.skipped ? `, ${res.skipped} skipped` : ''}${res.failed ? `, ${res.failed} failed` : ''}.`)
      setConfirming(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Stage totals — a restrained strip, not dashboard cards. The three
          stages read left to right in the order money moves. */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-xl border border-gray-100 bg-white px-5 py-3 text-sm">
        {hasAwaitingPayment && (
          <span className="text-sage-600">
            Awaiting payment{' '}
            <span className="font-semibold text-sage-800 tabular-nums">{money(awaitingPayment.total)}</span>
            <span className="text-sage-400"> · {awaitingPayment.remittanceCount} remittance{awaitingPayment.remittanceCount === 1 ? '' : 's'}</span>
          </span>
        )}
        <span className="text-sage-600">
          Ready to pay{' '}
          <span className="font-semibold text-sage-800 tabular-nums">{money(grandTotal)}</span>
          <span className="text-sage-400"> · {payeeCount} payee{payeeCount === 1 ? '' : 's'}, {itemCount} item{itemCount === 1 ? '' : 's'}</span>
        </span>
        <span className="text-sage-600">
          Awaiting approval{' '}
          <span className={clsx('font-semibold tabular-nums', awaiting.length > 0 ? 'text-amber-700' : 'text-sage-800')}>
            {awaiting.length}
          </span>
          <span className="text-sage-400"> job{awaiting.length === 1 ? '' : 's'}</span>
        </span>
      </div>

      {/* ── Controls ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search contractor, job number or address…"
            className="w-full rounded-lg border border-sage-200 pl-8 pr-8 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500"
          />
          {q && (
            <button type="button" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sage-600" aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={selectedKey}
          onChange={(e) => changePeriod(e.target.value)}
          className="rounded-lg border border-sage-200 px-3 py-2 text-sm bg-white text-sage-700"
        >
          <option value="all">Everything owed</option>
          {periods.map((p) => <option key={p.key} value={p.key}>Period · {p.label}</option>)}
        </select>
        {!showingAll && (
          <button type="button" onClick={() => changePeriod('all')} className="text-xs text-sage-500 underline hover:text-sage-700">
            Clear filter
          </button>
        )}
      </div>

      {!showingAll && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <strong>Filtered to one pay period.</strong> Payables dated outside it
          {undated > 0 && <> — and {undated} with no service date</>} are hidden, so the
          total above is not everything owed. Choose <strong>Everything owed</strong> to see the full amount.
        </p>
      )}

      {/* ── Awaiting payment — prepared, not yet transferred ────────────── */}
      <AwaitingPaymentSection
        remittances={awaitingPayment.remittances}
        total={awaitingPayment.total}
        payeeCount={awaitingPayment.payeeCount}
      />

      {/* ── Ready to pay ────────────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <h2 className="text-[11px] uppercase tracking-wide text-sage-500 font-semibold">Ready to pay</h2>
          <span className="text-sm text-sage-600 tabular-nums">
            {needle && visibleGroups.length !== groups.length && <span className="text-sage-400">{visibleGroups.length} of {groups.length} shown · </span>}
            <span className="font-semibold text-sage-800">{money(grandTotal)}</span>
          </span>
        </div>
        <p className="text-[13px] text-sage-500 mb-3">
          Approved work not yet placed on a remittance.
          {hasAwaitingPayment && <> Does not include the {money(awaitingPayment.total)} already prepared above.</>}
        </p>

        {planError ? (
          <p className="text-sm text-red-600">{planError}</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-sage-400">
            {showingAll
              ? 'Nothing is currently owed — every approved job has been paid.'
              : 'No authorised, unpaid jobs in this period.'}
            {awaiting.length > 0 ? ' Approve the jobs below to add them here.' : ''}
          </p>
        ) : visibleGroups.length === 0 ? (
          <p className="text-sm text-sage-400">No contractor or job matches “{q}”.</p>
        ) : (
          <div className="space-y-2">
            {visibleGroups.map((g) => {
              const open = expanded.has(g.key)
              return (
                <div key={g.key} className="rounded-xl border border-sage-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggle(g.key)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-sage-50/60 transition-colors"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {open ? <ChevronDown size={16} className="text-sage-400 shrink-0" /> : <ChevronRight size={16} className="text-sage-400 shrink-0" />}
                      <span className="min-w-0">
                        <span className="block font-semibold text-sage-800 truncate">
                          {g.payeeName}
                          {g.combined && <span className="ml-2 text-[10px] uppercase tracking-wide text-sage-400">combined</span>}
                        </span>
                        <span className="block text-xs text-sage-500">
                          {g.ciCount} job{g.ciCount === 1 ? '' : 's'} · Ready to pay
                        </span>
                      </span>
                    </span>
                    <span className="text-lg font-bold text-sage-800 tabular-nums shrink-0">{money(g.total)}</span>
                  </button>

                  {open && (
                    <div className="border-t border-sage-100 bg-sage-50/40 px-4 py-3">
                      <ul className="space-y-2">
                        {g.lines.map((l) => (
                          <li key={l.ciId} className="flex items-start justify-between gap-3 text-sm">
                            <div className="min-w-0">
                              <div className="text-sage-800 font-medium truncate">
                                {l.jobNumber ?? l.invoiceNumber}
                                {l.jobAddress && <span className="font-normal text-sage-500"> — {l.jobAddress}</span>}
                              </div>
                              <div className="text-xs text-sage-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                <span className={clsx(!l.serviceDate && 'text-amber-700')}>{serviceDateLabel(l.serviceDate)}</span>
                                {l.hours != null && <span>· {l.hours} hr{l.hours === 1 ? '' : 's'}</span>}
                                {l.workersOnJob > 1 && (
                                  <span className="inline-flex items-center gap-1 text-sage-600 bg-sage-100 rounded-full px-1.5 py-0.5 text-[10px]">
                                    <Users size={9} /> {l.workersOnJob} cleaners on this job
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-sage-800 font-medium tabular-nums shrink-0">{money(l.amount)}</div>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 pt-2 border-t border-sage-200/70 flex items-center justify-between text-sm">
                        <span className="text-sage-500">Reference <span className="font-mono text-xs">{g.reference}</span></span>
                        <span className="font-semibold text-sage-800 tabular-nums">{money(g.total)}</span>
                      </div>
                      {/* Where the money actually goes. Shown before payment so
                          staff verify the recipient — remittances store no bank
                          details, so this is the only place it surfaces. */}
                      <div className="mt-2 text-xs">
                        {g.bank.status === 'ok' ? (
                          <div className="text-sage-500">
                            Pay to <span className="font-medium text-sage-700">{g.bank.accountName ?? g.payeeName}</span>
                            {' · '}<span className="font-mono text-sage-700">{g.bank.formatted}</span>
                            {g.bank.accountNameDiffersFromWorker && (
                              <span className="ml-1.5 text-sage-400">(company account)</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                            <AlertTriangle size={11} className="inline mr-1 -mt-0.5" />
                            {g.bank.message}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Pay Run action ──────────────────────────────────────────── */}
        {groups.length > 0 && !confirming && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <label className="flex items-center gap-2 text-sm text-sage-600">
              <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} />
              Mark paid now (only if the money has already left the bank)
            </label>
            <button
              type="button" onClick={() => { setErr(null); setResult(null); setConfirming(true) }}
              className="bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700"
            >
              Pay Run — review {payeeCount} payment{payeeCount === 1 ? '' : 's'}
            </button>
          </div>
        )}

        {/* Confirm step — exactly what is about to happen, before anything is created. */}
        {confirming && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <h3 className="font-semibold text-sage-800 mb-1">Confirm this pay run</h3>
            {/* Fail closed on a GENUINE bank-detail conflict. Formatting-only
                differences normalise away and never reach here. A payee whose
                account name differs from the worker's name is NOT blocked —
                a company account is legitimate. */}
            {bankConflicts.length > 0 && (
              <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Bank details need review
                </p>
                <ul className="mt-1 space-y-0.5 text-[13px]">
                  {bankConflicts.map((g) => (
                    <li key={g.key}><span className="font-medium">{g.payeeName}</span> — {g.bank.message}</li>
                  ))}
                </ul>
                <p className="mt-1.5 text-[12px]">
                  Fix the affected contractor profiles before creating these remittances.
                </p>
              </div>
            )}
            <p className="text-sm text-sage-500 mb-3">
              This creates one remittance per contractor for the {itemCount} pay item{itemCount === 1 ? '' : 's'} listed above.
              {markPaid
                ? ' They will be marked PAID immediately.'
                : ' They will be created unpaid — mark them paid once the money has left the bank.'}
            </p>
            <div className="rounded-xl border border-sage-200 overflow-hidden mb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-sage-500 bg-sage-50/70 border-b border-sage-100">
                    <th className="px-4 py-2 font-semibold">Contractor</th>
                    <th className="px-4 py-2 font-semibold">Reference</th>
                    <th className="px-4 py-2 font-semibold text-right">Items</th>
                    <th className="px-4 py-2 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.key} className="border-b border-sage-50 last:border-0">
                      <td className="px-4 py-2 text-sage-800 font-medium">
                        {g.payeeName}
                        <span className="block text-[11px] font-normal text-sage-500">
                          {g.bank?.status === 'ok'
                            ? <>{g.bank.accountName ?? ''} <span className="font-mono">{g.bank.formatted}</span></>
                            : <span className="text-amber-700">{g.bank?.message ?? 'No bank account on file'}</span>}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-sage-500">{g.reference}</td>
                      <td className="px-4 py-2 text-right text-sage-600 tabular-nums">{g.ciCount}</td>
                      <td className="px-4 py-2 text-right font-medium text-sage-800 tabular-nums">{money(g.total)}</td>
                    </tr>
                  ))}
                  <tr className="bg-sage-50/70">
                    <td className="px-4 py-2 font-semibold text-sage-800" colSpan={3}>
                      Total · payment date {formatDate(payDate)}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-sage-800 tabular-nums">{money(grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button" onClick={createAll} disabled={isPending || bankConflicts.length > 0}
                title={bankConflicts.length > 0 ? 'Resolve the bank-detail conflicts above first.' : undefined}
                className="bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50"
              >
                {isPending ? 'Creating…' : `Create ${payeeCount} remittance${payeeCount === 1 ? '' : 's'} · ${money(grandTotal)}`}
              </button>
              <button
                type="button" onClick={() => setConfirming(false)} disabled={isPending}
                className="text-sm text-sage-500 hover:text-sage-700 underline disabled:opacity-50"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        {result && (
          <p className="mt-3 text-sm text-emerald-700">
            {result} <Link href="/portal/contractor-invoices/remittances" className="underline">View remittances →</Link>
          </p>
        )}
      </section>

      {/* ── Awaiting approval ───────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <h2 className="text-[11px] uppercase tracking-wide text-sage-500 font-semibold">Awaiting approval</h2>
          <span className={clsx('text-sm tabular-nums', awaiting.length > 0 ? 'text-amber-700 font-semibold' : 'text-sage-500')}>
            {awaiting.length > 0
              ? `${awaiting.length} job${awaiting.length === 1 ? '' : 's'}${showingAll ? '' : ' this period'}`
              : 'None'}
          </span>
        </div>
        <p className="text-[13px] text-sage-500 mb-3">
          {awaiting.length > 0
            ? 'Approve these first so they’re included — approving creates the payable and it moves straight into “ready to pay” above.'
            : `Every completed job${showingAll ? '' : ' in this period'} has an approved payable.`}
        </p>
        {awaiting.length > 0 && (
          <PendingApprovalsList
            rows={awaiting}
            contractors={Array.from(new Map(awaiting.map((r) => [r.contractorId, r.contractorName])).entries()).map(([id, name]) => ({ id, name }))}
          />
        )}
      </section>
    </div>
  )
}
