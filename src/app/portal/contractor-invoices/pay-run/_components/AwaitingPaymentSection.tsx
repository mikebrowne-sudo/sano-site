'use client'

// "Awaiting payment" — remittances prepared but not yet paid out.
//
// Standard Sano list-table treatment (design system §2.3/§2.4): Panel chrome,
// eyebrow section title, plain table rows. Deliberately NOT dashboard cards —
// this is a worklist, and it should read like every other list in the portal.
//
// Rows are ordered by PAYMENT DATE and never grouped by payee. One payee can
// legitimately hold two remittances for different periods — VMK LTD holds the
// July run (RA-0027) and the August RA-0023. Grouping by name would imply they
// belong together and invite paying the wrong one. Each row carries its own
// service-date range so the period is unambiguous.
//
// Mark paid reuses the canonical RemittancePaidControl; no payment logic here.

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/format'
import { Panel } from '../../../_components/Panel'
import { RemittancePaidControl } from '../../_components/RemittancePaidControl'
import type { AwaitingPaymentRemittance } from '@/lib/awaiting-payment-data'

/**
 * Human service-date range. Never invents a period — a single date renders
 * once rather than as "x – x", and an unresolved range says so.
 */
function periodLabel(r: AwaitingPaymentRemittance): string {
  if (!r.serviceFrom || !r.serviceTo) return 'Dates unavailable'
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
    <Panel variant="plain" padding="sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 className="text-[11px] uppercase tracking-wide text-sage-500 font-semibold">Awaiting payment</h2>
        <span className="text-sm text-sage-600 tabular-nums">
          {remittances.length} remittance{remittances.length === 1 ? '' : 's'} · {payeeCount} payee{payeeCount === 1 ? '' : 's'} ·{' '}
          <span className="font-semibold text-sage-800">{formatCurrency(total)}</span>
        </span>
      </div>
      <p className="text-[13px] text-sage-500 mb-3">
        Already on a remittance — the bank transfer hasn&rsquo;t been recorded yet.
        Separate from &ldquo;Ready to pay&rdquo; below.
      </p>

      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm tnum">
          <thead>
            <tr className="text-left text-sage-500 border-b border-sage-200">
              <th className="py-2 pr-3 font-semibold">Remittance</th>
              <th className="py-2 pr-3 font-semibold">Payee</th>
              <th className="py-2 pr-3 font-semibold">Service period</th>
              <th className="py-2 pr-3 font-semibold">Payment date</th>
              <th className="py-2 pr-3 font-semibold">Reference</th>
              <th className="py-2 pr-3 font-semibold text-right">Jobs</th>
              <th className="py-2 pr-3 font-semibold text-right">Total</th>
              <th className="py-2 pr-3 font-semibold">Status</th>
              <th className="py-2 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {remittances.map((r) => {
              const open = expanded.has(r.id)
              return (
                <tr key={r.id} className="border-b border-sage-50 last:border-0 align-top">
                  <td className="py-2.5 pr-3">
                    <button
                      type="button"
                      onClick={() => toggle(r.id)}
                      aria-expanded={open}
                      className="inline-flex items-center gap-1 font-semibold text-sage-800 hover:underline"
                    >
                      {open ? <ChevronDown size={13} className="text-sage-400" /> : <ChevronRight size={13} className="text-sage-400" />}
                      {r.remittanceNumber}
                    </button>
                    {open && (
                      <div className="mt-2 mb-1 rounded-lg border border-sage-100 bg-sage-50/50 p-3">
                        <ul className="space-y-1.5">
                          {r.lines.map((l) => (
                            <li key={l.itemId} className="flex items-start justify-between gap-4 text-[13px]">
                              <span className="min-w-0">
                                {l.isAdjustment ? (
                                  <><span className="text-[10px] uppercase tracking-wide text-sage-500">Adjustment</span> {l.label ?? '—'}</>
                                ) : (
                                  <>
                                    <span className="font-medium text-sage-800">{l.jobNumber ?? '—'}</span>
                                    {l.jobAddress && <span className="text-sage-500"> — {l.jobAddress}</span>}
                                    <span className="block text-xs text-sage-400">
                                      {l.serviceDate ? formatDate(l.serviceDate) : 'Date unavailable'}
                                      {l.contractorName && <> · {l.contractorName}</>}
                                    </span>
                                  </>
                                )}
                              </span>
                              <span className="text-sage-800 font-medium tabular-nums shrink-0">{formatCurrency(l.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-sage-800">{r.payeeLabel ?? '—'}</td>
                  <td className="py-2.5 pr-3 text-sage-600 whitespace-nowrap">
                    {periodLabel(r)}
                    {r.undatedCount > 0 && <span className="block text-[11px] text-amber-700">{r.undatedCount} undated</span>}
                  </td>
                  <td className="py-2.5 pr-3 text-sage-600 whitespace-nowrap">{formatDate(r.paymentDate)}</td>
                  <td className="py-2.5 pr-3 text-sage-500 font-mono text-xs">{r.reference ?? '—'}</td>
                  <td className="py-2.5 pr-3 text-right text-sage-600">{r.jobCount || '—'}</td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-sage-800">{formatCurrency(r.total)}</td>
                  <td className="py-2.5 pr-3">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 whitespace-nowrap">
                      Awaiting payment
                    </span>
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-3">
                      <Link
                        href={`/portal/contractor-invoices/remittances/${r.id}`}
                        className="text-sage-600 hover:text-sage-800 font-medium"
                      >
                        View
                      </Link>
                      <RemittancePaidControl id={r.id} paidAt={null} paymentDate={r.paymentDate} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {remittances.length > 1 && (
        <p className="text-[11px] text-sage-400 mt-2">
          Listed by payment date. A payee can hold more than one remittance for different
          periods — check the service period before paying.
        </p>
      )}
    </Panel>
  )
}
