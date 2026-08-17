'use client'

// "Awaiting payment" — remittances prepared but not yet paid out.
//
// The most important number on the Pay Run screen: money already committed to
// a remittance document and waiting on an actual bank transfer. It sits ABOVE
// Ready to pay because it represents a nearer obligation — the paperwork is
// done, only the payment is outstanding.
//
// Period separation is deliberate. Remittances are listed by PAYMENT DATE and
// never grouped by payee: one payee can legitimately hold two remittances for
// different periods (VMK LTD holds the July run RA-0027 and the August
// RA-0023). Grouping them by name would imply they belong together and invite
// paying the wrong one. Each row shows its own service-date range so the
// period is unambiguous.
//
// Styling is calm — awaiting payment is a normal workflow state, not an error.
// Mark paid reuses the canonical RemittancePaidControl; no payment logic is
// duplicated here.

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Clock, ExternalLink, Users } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/format'
import { RemittancePaidControl } from '../../_components/RemittancePaidControl'
import type { AwaitingPaymentRemittance } from '@/lib/awaiting-payment-data'

/**
 * Human service-date range. Never invents a clean period — if no item resolved
 * to a date we say so, and a single date is shown once rather than as "x – x".
 */
function periodLabel(r: AwaitingPaymentRemittance): string {
  if (!r.serviceFrom || !r.serviceTo) return 'Service dates unavailable'
  if (r.serviceFrom === r.serviceTo) return formatDate(r.serviceFrom)
  return `${formatDate(r.serviceFrom)} – ${formatDate(r.serviceTo)}`
}

export function AwaitingPaymentSection({
  remittances, total, payeeCount,
}: {
  remittances: AwaitingPaymentRemittance[]
  total: number
  payeeCount: number
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  if (remittances.length === 0) return null

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-900">
          <Clock size={18} /> Awaiting payment
        </h2>
        <div className="text-right">
          <div className="text-2xl font-bold text-amber-900 tabular-nums">{formatCurrency(total)}</div>
          <div className="text-xs text-amber-700">
            {remittances.length} remittance{remittances.length === 1 ? '' : 's'} · {payeeCount} payee{payeeCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>
      <p className="text-[13px] text-amber-800/80 mb-4">
        Already prepared into remittances — the bank payment hasn&rsquo;t been recorded yet.
        This is separate from &ldquo;Ready to pay&rdquo; below.
      </p>

      <div className="space-y-2">
        {remittances.map((r) => {
          const open = expanded.has(r.id)
          return (
            <div key={r.id} className="rounded-xl border border-amber-200 bg-white overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggle(r.id)}
                  aria-expanded={open}
                  className="flex items-start gap-2 text-left min-w-0 flex-1"
                >
                  {open ? <ChevronDown size={16} className="text-sage-400 mt-0.5 shrink-0" /> : <ChevronRight size={16} className="text-sage-400 mt-0.5 shrink-0" />}
                  <span className="min-w-0">
                    <span className="block font-semibold text-sage-800">
                      {r.remittanceNumber} · {r.payeeLabel ?? 'Unknown payee'}
                    </span>
                    <span className="block text-xs text-sage-500 mt-0.5">
                      {r.jobCount > 0 && <>{r.jobCount} job{r.jobCount === 1 ? '' : 's'} · </>}
                      {periodLabel(r)}
                      {r.undatedCount > 0 && <span className="text-amber-700"> · {r.undatedCount} undated</span>}
                    </span>
                    <span className="block text-[11px] text-sage-400 mt-0.5">
                      {r.paymentDate && <>Payment date {formatDate(r.paymentDate)}</>}
                      {r.reference && <> · <span className="font-mono">{r.reference}</span></>}
                    </span>
                  </span>
                </button>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-lg font-bold text-sage-800 tabular-nums">{formatCurrency(r.total)}</span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                    <Clock size={11} /> Awaiting payment
                  </span>
                </div>
              </div>

              {open && (
                <div className="border-t border-amber-100 bg-sage-50/40 px-4 py-3">
                  <ul className="space-y-1.5 mb-3">
                    {r.lines.map((l) => (
                      <li key={l.itemId} className="flex items-start justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <div className="text-sage-800 truncate">
                            {l.isAdjustment ? (
                              <><span className="text-[10px] uppercase tracking-wide bg-sage-100 text-sage-600 rounded-full px-1.5 py-0.5 mr-1.5">Adjustment</span>{l.label ?? '—'}</>
                            ) : (
                              <>
                                <span className="font-medium">{l.jobNumber ?? '—'}</span>
                                {l.jobAddress && <span className="text-sage-500"> — {l.jobAddress}</span>}
                              </>
                            )}
                          </div>
                          {!l.isAdjustment && (
                            <div className="text-xs text-sage-500">
                              {l.serviceDate ? formatDate(l.serviceDate) : <span className="text-amber-700">Date unavailable</span>}
                              {l.contractorName && <> · {l.contractorName}</>}
                            </div>
                          )}
                        </div>
                        <span className="text-sage-800 font-medium tabular-nums shrink-0">{formatCurrency(l.amount)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sage-200/70 pt-3">
                    <Link
                      href={`/portal/contractor-invoices/remittances/${r.id}`}
                      className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 underline"
                    >
                      <ExternalLink size={13} /> View remittance
                    </Link>
                    {/* Canonical mark-paid — no payment logic duplicated here. */}
                    <RemittancePaidControl id={r.id} paidAt={null} paymentDate={r.paymentDate} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {remittances.length > 1 && (
        <p className="text-[11px] text-amber-800/70 mt-3 flex items-start gap-1.5">
          <Users size={12} className="mt-0.5 shrink-0" />
          <span>
            Listed by payment date. A payee can hold more than one remittance for
            different periods — check each service-date range before paying.
          </span>
        </p>
      )}
    </section>
  )
}
