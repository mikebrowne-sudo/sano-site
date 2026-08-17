'use client'

// Contractor Pay workspace.
//
//   Pay period -> Awaiting payment -> Ready to pay -> Review -> Awaiting approval
//
// Design notes:
//  * EVERYTHING OWED IS ALWAYS LISTED. The pay period SUGGESTS what to tick; it
//    never hides a payable. It used to filter the plan server-side, which meant
//    choosing "16-31 Jul" physically removed May and June work — overdue backlog
//    vanished instead of being offered as "Older unpaid". The question a period
//    answers is "what should normally be paid in this run?", not "hide the rest".
//  * SELECTION IS AUTHORITATIVE. What is ticked is exactly what is paid; the
//    server intersects it with its own eligibility check so the tick-set can
//    only ever narrow the run. See lib/pay-run-selection.ts.
//  * Contractor grouping comes from the planner's company-groups (a shared GST
//    number collapses a couple into one payee), so what's shown here is exactly
//    what would be paid.
//  * Multi-cleaner jobs are CONTEXT, not a warning. Two cleaners on one job
//    legitimately produce two payables; the authoritative duplicate guard is the
//    job_id + contractor_id check in approveContractorPay.
//  * "Pay Run" is UI terminology for the canonical
//    contractor_invoices -> contractor_remittances flow. The legacy
//    pay_runs.kind='contractor' system is retired and never written here.

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import clsx from 'clsx'
import { AlertTriangle, ChevronDown, ChevronRight, Users, Search, X } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/format'
import { createRemittancesForContractors, type GroupPlan } from '../../remittances/_actions-by-contractor'
import { PendingApprovalsList, type ApprovalRow } from '../../pending-approvals/_components/PendingApprovalsList'
import { AwaitingPaymentSection } from './AwaitingPaymentSection'
import type { AwaitingPaymentSummary } from '@/lib/awaiting-payment-data'
import { classifyPayable, defaultSelection, REASON_LABEL } from '@/lib/pay-run-selection'

function money(n: number) { return formatCurrency(n) }

/** Undated payables stay visible — they're real money — with an honest label. */
function serviceDateLabel(iso: string | null): string {
  return iso ? formatDate(iso) : 'Date unavailable'
}

export function PayRunView({
  periods, selectedKey, periodStart, periodEnd, payDate, groups, planError, awaiting,
  awaitingPayment,
}: {
  periods: { key: string; label: string; payDateLabel: string }[]
  selectedKey: string
  /** null in all-owed mode — the period filter is off. */
  periodStart: string | null
  periodEnd: string | null
  payDate: string
  groups: GroupPlan[]
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

  // A period filter can leave a payee group with NOTHING visible — the planner
  // still returns it so its undated/out-of-period count can drive the "hidden
  // items" notice. Counting those groups made the summary read
  // "$0.00 · 1 payee, 0 items", which doesn't reconcile.
  //
  // The summary and the list therefore count only groups with at least one
  // visible payable item, so payees shown === payees with something payable.
  // Presentation only: `groups` (the full plan) is still what gets submitted,
  // so what Pay Run would actually pay is unchanged.
  const payableGroups = groups.filter((g) => g.ciCount > 0)

  // ── Explicit payable selection ───────────────────────────────────────
  // What staff tick is exactly what gets paid. Selection is seeded from the
  // period rule (current period + older unpaid backlog, excluding later work
  // and undated items) and then belongs to the user — it is NOT recomputed on
  // search or re-render, only when the PERIOD changes, which is a deliberate
  // act. See lib/pay-run-selection.ts.
  const allPayables = useMemo(
    () => payableGroups.flatMap((g) => g.lines.map((l) => ({ ciId: l.ciId, serviceDate: l.serviceDate }))),
    [payableGroups],
  )
  const [selectedCiIds, setSelectedCiIds] = useState<Set<string>>(
    () => defaultSelection(allPayables, periodStart, periodEnd),
  )
  // Re-seed ONLY when the period changes (or the payable set itself does).
  const seedKey = `${selectedKey}::${allPayables.map((p) => p.ciId).join(',')}`
  const seededRef = useRef(seedKey)
  useEffect(() => {
    if (seededRef.current === seedKey) return
    seededRef.current = seedKey
    setSelectedCiIds(defaultSelection(allPayables, periodStart, periodEnd))
  }, [seedKey, allPayables, periodStart, periodEnd])

  function toggleCi(ciId: string) {
    setSelectedCiIds((prev) => {
      const next = new Set(prev)
      if (next.has(ciId)) next.delete(ciId); else next.add(ciId)
      return next
    })
  }
  const selectAll = () => setSelectedCiIds(new Set(allPayables.map((p) => p.ciId)))
  const clearAll = () => setSelectedCiIds(new Set())
  const selectDue = () => setSelectedCiIds(defaultSelection(allPayables, periodStart, periodEnd))

  /** Selected lines + total for one group — drives display, review and payment. */
  const groupSelection = (g: GroupPlan) => {
    const lines = g.lines.filter((l) => selectedCiIds.has(l.ciId))
    return { lines, count: lines.length, total: Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100 }
  }

  // Only groups with something ticked are payable / reviewable.
  const selectedGroups = payableGroups.filter((g) => groupSelection(g).count > 0)
  const payeeCount = selectedGroups.length
  const itemCount = payableGroups.reduce((s, g) => s + groupSelection(g).count, 0)
  const selectedTotal = payableGroups.reduce((s, g) => s + groupSelection(g).total, 0)
  // Undated is counted across ALL groups — including ones with nothing visible,
  // since that is exactly what the notice needs to report.
  const undated = groups.reduce((s, g) => s + g.undatedCount, 0)

  // Client-side search across payee, job number and address. Filters only what
  // is DISPLAYED — the payment itself always uses the full server-built plan for
  // the current period filter, so search can never narrow what gets paid.
  const needle = q.trim().toLowerCase()
  const visibleGroups = needle
    ? payableGroups.filter((g) =>
        g.payeeName.toLowerCase().includes(needle) ||
        g.lines.some((l) =>
          (l.jobNumber ?? '').toLowerCase().includes(needle) ||
          (l.jobAddress ?? '').toLowerCase().includes(needle) ||
          (l.invoiceNumber ?? '').toLowerCase().includes(needle)),
      )
    : payableGroups
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
        // THE invariant: what was ticked and reviewed is exactly what is paid.
        // The server intersects this with its own eligibility check, so this
        // can only ever narrow the set.
        selectedCiIds: Array.from(selectedCiIds),
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
          <span className="font-semibold text-sage-800 tabular-nums">{money(selectedTotal)}</span>
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
        {/* The period SUGGESTS what to pay; it never hides anything. */}
        <label className="flex items-center gap-2 text-sm text-sage-600 whitespace-nowrap">
          Pay period
          <select
            value={selectedKey}
            onChange={(e) => changePeriod(e.target.value)}
            className="rounded-lg border border-sage-200 px-3 py-2 text-sm bg-white text-sage-700"
          >
            <option value="all">No period — nothing preselected</option>
            {periods.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </label>
      </div>

      <p className="text-xs text-sage-500">
        {showingAll ? (
          <>Showing everything owed. Choose a pay period to preselect the jobs due in that run.</>
        ) : (
          <>
            Everything owed is listed. The pay period preselects work up to the end of
            it — including older unpaid jobs — and leaves later work unticked.
            {undated > 0 && <> {undated} payable{undated === 1 ? ' has' : 's have'} no service date and need{undated === 1 ? 's' : ''} a look.</>}
          </>
        )}
      </p>

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
            {needle && visibleGroups.length !== payableGroups.length && <span className="text-sage-400">{visibleGroups.length} of {payableGroups.length} shown · </span>}
            <span className="font-semibold text-sage-800">{money(selectedTotal)}</span>
          </span>
        </div>
        <p className="text-[13px] text-sage-500 mb-3">
          Tick the jobs to pay in this run.
          {hasAwaitingPayment && <> Does not include the {money(awaitingPayment.total)} already prepared above.</>}
        </p>

        {payableGroups.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
            <button type="button" onClick={selectDue} className="text-sage-600 hover:text-sage-800 underline">
              Select due for this run
            </button>
            <button type="button" onClick={selectAll} className="text-sage-500 hover:text-sage-700 underline">Select all</button>
            <button type="button" onClick={clearAll} className="text-sage-500 hover:text-sage-700 underline">Clear all</button>
            <span className="text-sage-400">
              &ldquo;Due for this run&rdquo; = work up to the end of the selected period, including older unpaid jobs.
            </span>
          </div>
        )}

        {planError ? (
          <p className="text-sm text-red-600">{planError}</p>
        ) : payableGroups.length === 0 ? (
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
              const sel = groupSelection(g)
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
                          {/* Selected count leads — it's what will be paid. */}
                          {sel.count} of {g.ciCount} job{g.ciCount === 1 ? '' : 's'} selected
                        </span>
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-lg font-bold text-sage-800 tabular-nums">{money(sel.total)}</span>
                      {sel.count !== g.ciCount && (
                        <span className="block text-[11px] text-sage-400 tabular-nums">of {money(g.total)} owed</span>
                      )}
                    </span>
                  </button>

                  {open && (
                    <div className="border-t border-sage-100 bg-sage-50/40 px-4 py-3">
                      <ul className="space-y-2">
                        {g.lines.map((l) => {
                          const cls = classifyPayable({ ciId: l.ciId, serviceDate: l.serviceDate }, periodStart, periodEnd)
                          const badge = REASON_LABEL[cls.reason]
                          const ticked = selectedCiIds.has(l.ciId)
                          return (
                          <li key={l.ciId} className="flex items-start gap-3 text-sm">
                            <input
                              type="checkbox"
                              checked={ticked}
                              onChange={() => toggleCi(l.ciId)}
                              aria-label={`Include ${l.jobNumber ?? l.invoiceNumber} in this pay run`}
                              className="mt-1 rounded border-sage-300 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className={clsx('font-medium truncate', ticked ? 'text-sage-800' : 'text-sage-400')}>
                                {l.jobNumber ?? l.invoiceNumber}
                                {l.jobAddress && <span className="font-normal text-sage-500"> — {l.jobAddress}</span>}
                              </div>
                              <div className="text-xs text-sage-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                <span className={clsx(!l.serviceDate && 'text-amber-700')}>{serviceDateLabel(l.serviceDate)}</span>
                                {l.hours != null && <span>· {l.hours} hr{l.hours === 1 ? '' : 's'}</span>}
                                {badge && (
                                  <span className={clsx(
                                    'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px]',
                                    cls.reason === 'overdue' ? 'bg-blue-50 text-blue-700'
                                      : cls.reason === 'undated' ? 'bg-amber-50 text-amber-800'
                                      : 'bg-sage-100 text-sage-600',
                                  )}>
                                    {badge}
                                  </span>
                                )}
                                {l.workersOnJob > 1 && (
                                  <span className="inline-flex items-center gap-1 text-sage-600 bg-sage-100 rounded-full px-1.5 py-0.5 text-[10px]">
                                    <Users size={9} /> {l.workersOnJob} cleaners on this job
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={clsx('font-medium tabular-nums shrink-0', ticked ? 'text-sage-800' : 'text-sage-400')}>{money(l.amount)}</div>
                          </li>
                          )
                        })}
                      </ul>
                      <div className="mt-3 pt-2 border-t border-sage-200/70 flex items-center justify-between text-sm">
                        <span className="text-sage-500">Reference <span className="font-mono text-xs">{g.reference}</span></span>
                        <span className="font-semibold text-sage-800 tabular-nums">
                          {sel.count} selected · {money(sel.total)}
                        </span>
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
        {selectedGroups.length > 0 && !confirming && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <label className="flex items-center gap-2 text-sm text-sage-600">
              <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} />
              Mark paid now (only if the money has already left the bank)
            </label>
            <button
              type="button" onClick={() => { setErr(null); setResult(null); setConfirming(true) }}
              className="bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700"
            >
              Review Pay Run — {payeeCount} payment{payeeCount === 1 ? '' : 's'}
            </button>
          </div>
        )}

        {/* Confirm step — exactly what is about to happen, before anything is created. */}
        {confirming && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <h3 className="font-semibold text-sage-800 mb-1">Review Pay Run</h3>
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
                  {/* Counts and amounts are the SELECTED subset, never the
                      whole group — the review must show exactly what will be
                      paid. */}
                  {selectedGroups.map((g) => {
                    const sel = groupSelection(g)
                    return (
                    <tr key={g.key} className="border-b border-sage-50 last:border-0 align-top">
                      <td className="px-4 py-2 text-sage-800 font-medium">
                        {g.payeeName}
                        <span className="block text-[11px] font-normal text-sage-500">
                          {g.bank?.status === 'ok'
                            ? <>{g.bank.accountName ?? ''} <span className="font-mono">{g.bank.formatted}</span></>
                            : <span className="text-amber-700">{g.bank?.message ?? 'No bank account on file'}</span>}
                        </span>
                        <span className="block text-[11px] font-normal text-sage-400 mt-0.5">
                          {sel.lines.map((l) => l.jobNumber ?? l.invoiceNumber).join(', ')}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-sage-500">{g.reference}</td>
                      <td className="px-4 py-2 text-right text-sage-600 tabular-nums">{sel.count}</td>
                      <td className="px-4 py-2 text-right font-medium text-sage-800 tabular-nums">{money(sel.total)}</td>
                    </tr>
                    )
                  })}
                  <tr className="bg-sage-50/70">
                    <td className="px-4 py-2 font-semibold text-sage-800" colSpan={3}>
                      Total · payment date {formatDate(payDate)}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-sage-800 tabular-nums">{money(selectedTotal)}</td>
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
                {isPending ? 'Creating…' : `Create Payments · ${money(selectedTotal)}`}
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
          {/* Never period-scoped — unapproved work is a backlog, not a
              per-period concern. */}
          <span className={clsx('text-sm tabular-nums', awaiting.length > 0 ? 'text-amber-700 font-semibold' : 'text-sage-500')}>
            {awaiting.length > 0 ? `${awaiting.length} completed job${awaiting.length === 1 ? '' : 's'}` : 'None'}
          </span>
        </div>
        <p className="text-[13px] text-sage-500 mb-3">
          {awaiting.length > 0
            ? 'These jobs are not eligible for payment until approved. Approving creates the payable and it moves straight into “Ready to pay” above.'
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
