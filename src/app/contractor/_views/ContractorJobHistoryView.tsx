// Presentational body of the contractor "Completed" job history — jobs
// grouped by month, each with its pay status and (when paid/remitted) a link
// to the advice. Pure + server-safe; shared with the staff preview.

import Link from 'next/link'
import { CalendarCheck, ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import { contractorJobTitle } from '../_lib/job-title'
import { CONTRACTOR_PAY_STATUS_META } from '../_lib/contractor-pay-status'
import type { HistoryMonth } from '../_lib/contractor-job-history'
import { formatCurrency, formatDate } from '@/lib/format'

export function ContractorJobHistoryView({
  months,
  jobHref,
}: {
  months: HistoryMonth[]
  jobHref: (id: string) => string
}) {
  if (months.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-sage-100 p-10 text-center">
        <div className="inline-flex w-12 h-12 items-center justify-center rounded-full bg-sage-50 mb-3">
          <CalendarCheck size={22} className="text-sage-400" />
        </div>
        <p className="text-sage-800 font-medium mb-1">No completed jobs yet</p>
        <p className="text-sage-500 text-sm">Jobs you&apos;ve finished will appear here, grouped by month.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {months.map((m) => (
        <section key={m.key}>
          <div className="flex items-baseline justify-between mb-2 px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-sage-500">{m.label}</h2>
            <span className="text-[11px] text-sage-500 tnum">
              {m.entries.length} job{m.entries.length === 1 ? '' : 's'} · {formatCurrency(m.total)}
            </span>
          </div>
          <div className="rounded-2xl border border-sage-100 bg-white overflow-hidden divide-y divide-sage-50 tnum">
            {m.entries.map((e) => {
              const meta = CONTRACTOR_PAY_STATUS_META[e.payStatus]
              return (
                <div key={e.jobId} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={jobHref(e.jobId)} className="min-w-0 group">
                      <div className="text-sm font-medium text-sage-800 truncate group-hover:text-sage-600">
                        {contractorJobTitle(e.title) || e.jobNumber || 'Job'}
                      </div>
                      <div className="text-[11px] text-sage-500 mt-0.5 flex items-center gap-x-2 flex-wrap">
                        {e.date && <span>{formatDate(e.date)}</span>}
                        {e.jobNumber && <span>{e.jobNumber}</span>}
                      </div>
                      {e.address && <div className="text-[11px] text-sage-400 mt-0.5 truncate">{e.address}</div>}
                    </Link>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {e.amount != null && <span className="text-sm font-semibold text-sage-800">{formatCurrency(e.amount)}</span>}
                      <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full font-medium', meta.chip)}>{meta.label}</span>
                    </div>
                  </div>
                  {e.docHref && (
                    <a
                      href={e.docHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] text-sage-500 hover:text-sage-700"
                    >
                      <ExternalLink size={11} /> View remittance advice
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
