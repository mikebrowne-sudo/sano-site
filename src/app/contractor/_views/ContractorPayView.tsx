// Presentational body of the contractor pay statement. Shared by the
// live page and the staff preview (fed by loadContractorPayStatement).

import { formatCurrency, formatDate } from '@/lib/format'
import { Wallet, CheckCircle2, Clock } from 'lucide-react'
import { contractorJobTitle } from '../_lib/job-title'
import type { ContractorPayData } from '../_lib/contractor-pay-data'

function statusPill(status: string) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        <CheckCircle2 size={11} /> Paid
      </span>
    )
  }
  if (status === 'included_in_pay_run') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sage-700 bg-sage-100 px-2 py-0.5 rounded-full">
        <Wallet size={11} /> In pay run
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      <Clock size={11} /> Upcoming
    </span>
  )
}

export function ContractorPayView({ data }: { data: ContractorPayData }) {
  const { periods, grandTotal, upcomingTotal, paidTotal } = data

  return (
    <div className="tnum">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-sage-800">Pay statement</h1>
        <p className="text-sm text-sage-500 mt-0.5">
          Your earnings by pay run. Jobs done 1st–15th are paid on the 30th; jobs done 16th–end are paid on the 15th of the next month.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl border border-sage-200 bg-white p-4">
          <div className="text-xs text-sage-500 font-medium">Upcoming</div>
          <div className="text-2xl font-bold text-sage-800 mt-1">{formatCurrency(upcomingTotal)}</div>
          <div className="text-[11px] text-sage-400 mt-0.5">Not yet paid</div>
        </div>
        <div className="rounded-2xl border border-sage-200 bg-white p-4">
          <div className="text-xs text-sage-500 font-medium">Paid to date</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(paidTotal)}</div>
          <div className="text-[11px] text-sage-400 mt-0.5">Across all pay runs</div>
        </div>
      </div>

      {periods.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sage-200 bg-sage-50/50 p-8 text-center">
          <Wallet size={28} className="text-sage-300 mx-auto mb-2" />
          <p className="text-sm text-sage-600 font-medium">No completed jobs yet</p>
          <p className="text-xs text-sage-400 mt-1">Your pay will appear here as you complete jobs.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {periods.map((g) => (
            <section key={g.period.payDate} className="rounded-2xl border border-sage-200 bg-white overflow-hidden">
              <div className="flex items-baseline justify-between px-4 py-3 bg-sage-50 border-b border-sage-100">
                <div>
                  <div className="text-sm font-semibold text-sage-800">{g.period.payDateLabel}</div>
                  <div className="text-[11px] text-sage-500">Work done {g.period.label}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-sage-800">{formatCurrency(g.subtotal)}</div>
                  <div className="text-[11px] text-sage-400">{g.lines.length} job{g.lines.length === 1 ? '' : 's'}</div>
                </div>
              </div>
              <ul className="divide-y divide-sage-50">
                {g.lines.map((l) => (
                  <li key={l.jobId} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-sage-800 truncate">
                        {contractorJobTitle(l.title) || l.jobNumber || 'Job'}
                      </div>
                      <div className="text-[11px] text-sage-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {l.jobNumber && <span>{l.jobNumber}</span>}
                        <span>{formatDate(l.completedAt)}</span>
                        <span>{l.hours.toFixed(1)}h</span>
                        {statusPill(l.payStatus)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-sage-800 shrink-0">{formatCurrency(l.amount)}</div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="text-[11px] text-sage-400 text-center mt-6">
        Total earned to date: <span className="font-medium text-sage-600">{formatCurrency(grandTotal)}</span>.
        Questions about your pay? Contact the Sano office.
      </p>
    </div>
  )
}
