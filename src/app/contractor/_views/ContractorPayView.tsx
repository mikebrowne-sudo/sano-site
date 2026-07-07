// Presentational body of the contractor pay statement. Shared by the
// live page and the staff preview (fed by loadContractorPayStatement).
//
// Pending = approved, unpaid payables (contractor_invoices). Paid = one
// row per payment batch (remittance or legacy pay run); tapping a batch
// with a document opens its remittance advice. Totals come straight from
// the canonical payable model.

import { formatCurrency, formatDate } from '@/lib/format'
import { Wallet, ChevronRight, Clock } from 'lucide-react'
import { contractorJobTitle } from '../_lib/job-title'
import type { ContractorPayData } from '../_lib/contractor-pay-data'

export function ContractorPayView({ data }: { data: ContractorPayData }) {
  const { pending, pendingBatches, pendingTotal, paidBatches, paidTotal } = data

  return (
    <div className="tnum">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-sage-800">Pay</h1>
        <p className="text-sm text-sage-500 mt-0.5">Your approved pay and what you&apos;ve been paid.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl border border-sage-200 bg-white p-4">
          <div className="text-xs text-sage-500 font-medium">Pending pay</div>
          <div className="text-2xl font-bold text-sage-800 mt-1">{formatCurrency(pendingTotal)}</div>
          <div className="text-[11px] text-sage-400 mt-0.5">Approved, not yet paid</div>
        </div>
        <div className="rounded-2xl border border-sage-200 bg-white p-4">
          <div className="text-xs text-sage-500 font-medium">Paid to date</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(paidTotal)}</div>
          <div className="text-[11px] text-sage-400 mt-0.5">{paidBatches.length} payment{paidBatches.length === 1 ? '' : 's'}</div>
        </div>
      </div>

      {/* Pending — approved, unpaid payables */}
      {pending.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-sage-500 mb-2 px-1">Approved — pending pay</h2>
          <div className="rounded-2xl border border-sage-200 bg-white overflow-hidden">
            <ul className="divide-y divide-sage-50">
              {pending.map((l) => (
                <li key={l.ciId} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-sage-800 truncate">{contractorJobTitle(l.title) || l.jobNumber || 'Job'}</div>
                    <div className="text-[11px] text-sage-500 mt-0.5 flex items-center gap-x-2">
                      {l.jobNumber && <span>{l.jobNumber}</span>}
                      {l.date && <span>{formatDate(l.date)}</span>}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-sage-800 shrink-0">{formatCurrency(l.amount)}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Pending payment — approved jobs on a remittance that isn't paid yet */}
      {pendingBatches.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 mb-2 px-1">Pending payment</h2>
          <div className="rounded-2xl border border-amber-200 bg-white overflow-hidden">
            <ul className="divide-y divide-amber-50">
              {pendingBatches.map((b) => {
                const inner = (
                  <>
                    <div>
                      <div className="text-sm font-medium text-sage-800 flex items-center gap-1.5">
                        <Clock size={13} className="text-amber-600" /> Awaiting payment
                      </div>
                      <div className="text-[11px] text-sage-500">
                        {b.jobCount} job{b.jobCount === 1 ? '' : 's'}{b.payDate && ` · expected ${formatDate(b.payDate)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-sage-800">{formatCurrency(b.total)}</span>
                      {b.docHref && <ChevronRight size={16} className="text-sage-300" />}
                    </div>
                  </>
                )
                return b.docHref ? (
                  <li key={b.id}>
                    <a href={b.docHref} target="_blank" rel="noopener noreferrer"
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-amber-50/60 transition-colors">
                      {inner}
                    </a>
                  </li>
                ) : (
                  <li key={b.id} className="px-4 py-3 flex items-center justify-between gap-3">{inner}</li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Paid history — one row per payment batch */}
      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-sage-500 mb-2 px-1">Paid</h2>
        {paidBatches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sage-200 bg-sage-50/50 p-8 text-center">
            <Wallet size={26} className="text-sage-300 mx-auto mb-2" />
            <p className="text-sm text-sage-600 font-medium">No payments yet</p>
            <p className="text-xs text-sage-400 mt-1">Payments will appear here, newest first.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-sage-200 bg-white overflow-hidden">
            <ul className="divide-y divide-sage-50">
              {paidBatches.map((b) => {
                const inner = (
                  <>
                    <div>
                      <div className="text-sm font-medium text-sage-800">Paid {formatDate(b.payDate)}</div>
                      <div className="text-[11px] text-sage-500">{b.jobCount} job{b.jobCount === 1 ? '' : 's'}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-sage-800">{formatCurrency(b.total)}</span>
                      {b.docHref && <ChevronRight size={16} className="text-sage-300" />}
                    </div>
                  </>
                )
                return b.docHref ? (
                  <li key={b.id}>
                    <a href={b.docHref} target="_blank" rel="noopener noreferrer"
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-sage-50 transition-colors">
                      {inner}
                    </a>
                  </li>
                ) : (
                  <li key={b.id} className="px-4 py-3 flex items-center justify-between gap-3">{inner}</li>
                )
              })}
            </ul>
          </div>
        )}
      </section>

      <p className="text-[11px] text-sage-400 text-center mt-6">
        Amounts are the total paid; you handle your own GST and tax. Questions? Contact the Sano office.
      </p>
    </div>
  )
}
