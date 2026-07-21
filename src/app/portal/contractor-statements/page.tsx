import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { FileText, ArrowRight, AlertTriangle, CornerDownRight } from 'lucide-react'
import {
  mostRecentlyClosedPeriod,
  previousPeriod,
  periodLabel,
  toNzCalendarDate,
  type StatementPeriod,
} from '@/lib/contractor-statement-period'
import { listStatementsForPeriod } from '@/lib/contractor-statement-data'
import { GeneratePanel } from './_components/GeneratePanel'

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

export default async function ContractorStatementsPage({
  searchParams,
}: {
  searchParams: { ps?: string; pe?: string }
}) {
  const supabase = createClient()

  // Recent closed periods for the selector (most recent first).
  const nzToday = toNzCalendarDate(new Date().toISOString()) as string
  const recent: StatementPeriod[] = []
  let p = mostRecentlyClosedPeriod(nzToday)
  for (let i = 0; i < 8; i++) {
    recent.push(p)
    p = previousPeriod(p)
  }

  const selected: StatementPeriod =
    searchParams.ps && searchParams.pe
      ? { period_start: searchParams.ps, period_end: searchParams.pe }
      : recent[0]

  const options = recent.map((r) => ({ value: `${r.period_start}|${r.period_end}`, label: periodLabel(r) }))
  const selectedValue = `${selected.period_start}|${selected.period_end}`

  const cards = await listStatementsForPeriod(supabase, selected)
  const totalPayable = cards.reduce((s, c) => s + c.total_payable, 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-sage-800">Contractor statements</h1>
        <p className="text-sm text-sage-500 mt-1">
          Staff-only draft statements — a per-contractor grouping of approved payables for a closed period.
          Not a tax invoice; nothing here is issued to contractors yet.
        </p>
      </div>

      <GeneratePanel periods={options} selected={selectedValue} />

      {cards.length === 0 ? (
        <div className="bg-white rounded-xl border border-sage-100 p-8 text-center text-sage-500 text-sm">
          No draft statements for {periodLabel(selected)} yet. Use “Generate / refresh drafts” to prepare them.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3 text-sm text-sage-600">
            <span>{cards.length} draft{cards.length === 1 ? '' : 's'} · {periodLabel(selected)}</span>
            <span className="font-semibold text-sage-800">{fmtCurrency(totalPayable)} total payable</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {cards.map((c) => (
              <Link
                key={c.id}
                href={`/portal/contractor-statements/${c.id}`}
                className="block bg-white rounded-xl border border-sage-100 shadow-sm p-5 hover:border-sage-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-sage-400" />
                      <span className="font-semibold text-sage-800">{c.contractor_name ?? 'Unknown contractor'}</span>
                    </div>
                    <span className="text-xs text-sage-400">{c.statement_number} · {c.status}</span>
                  </div>
                  <ArrowRight size={16} className="text-sage-300 mt-1" />
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
                  <div>
                    <span className="text-sage-400 text-xs">Lines</span>
                    <p className="text-sage-800 font-medium">{c.line_count}</p>
                  </div>
                  <div>
                    <span className="text-sage-400 text-xs">Confirmed GST</span>
                    <p className="text-sage-800 font-medium">{fmtCurrency(c.gst_total)}</p>
                  </div>
                  <div>
                    <span className="text-sage-400 text-xs">Total payable</span>
                    <p className="text-sage-800 font-semibold">{fmtCurrency(c.total_payable)}</p>
                  </div>
                </div>

                {(c.carried_lines > 0 || c.gst_review_lines > 0) && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {c.carried_lines > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs">
                        <CornerDownRight size={11} /> {c.carried_lines} carried forward
                      </span>
                    )}
                    {c.gst_review_lines > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs">
                        <AlertTriangle size={11} /> {c.gst_review_lines} GST review
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
