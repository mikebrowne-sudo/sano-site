import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { ArrowRight, AlertTriangle, CornerDownRight } from 'lucide-react'
import {
  mostRecentlyClosedPeriod, previousPeriod, periodLabel, toNzCalendarDate, type StatementPeriod,
} from '@/lib/contractor-statement-period'
import { listStatementsForPeriod, type StatementCardRow } from '@/lib/contractor-statement-data'
import { statementDisplayStatus, STATEMENT_STATUS_LABEL } from '@/lib/contractor-statement-status'
import { statementBucket, BUCKET_LABEL, BUCKET_ORDER, type StatementBucket } from '@/lib/contractor-statement-bucket'

const STATUS_CHIP: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', not_viewed: 'bg-blue-50 text-blue-700', viewed: 'bg-violet-50 text-violet-700',
  overdue: 'bg-red-50 text-red-700', confirmed_contractor: 'bg-emerald-100 text-emerald-800',
  confirmed_sano: 'bg-emerald-50 text-emerald-700', superseded: 'bg-amber-50 text-amber-700', paid: 'bg-sage-100 text-sage-700',
}
const BUCKET_ACCENT: Record<StatementBucket, string> = {
  needs_attention: 'text-red-700', ready_to_issue: 'text-blue-700', awaiting_review: 'text-violet-700',
  ready_to_pay: 'text-emerald-700', remittance_unpaid: 'text-amber-700', paid: 'text-sage-700',
}
function fmt(n: number) { return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n) }

export default async function ContractorStatementsPage({ searchParams }: { searchParams: { ps?: string; pe?: string } }) {
  const supabase = createClient()
  const nzToday = toNzCalendarDate(new Date().toISOString()) as string
  const recent: StatementPeriod[] = []
  let p = mostRecentlyClosedPeriod(nzToday)
  for (let i = 0; i < 8; i++) { recent.push(p); p = previousPeriod(p) }
  const selected: StatementPeriod = searchParams.ps && searchParams.pe ? { period_start: searchParams.ps, period_end: searchParams.pe } : recent[0]

  const cards = await listStatementsForPeriod(supabase, selected)
  const nowIso = new Date().toISOString()

  // Bucket every card.
  const grouped = new Map<StatementBucket, StatementCardRow[]>()
  for (const c of cards) {
    const b = statementBucket(c, nowIso)
    const arr = grouped.get(b) ?? []
    if (!grouped.has(b)) grouped.set(b, arr)
    arr.push(c)
  }
  const count = (b: StatementBucket) => grouped.get(b)?.length ?? 0
  const total = (b: StatementBucket) => (grouped.get(b) ?? []).reduce((s, c) => s + c.total_payable, 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-sage-800">Contractor statements <span className="align-middle ml-2 text-[11px] uppercase tracking-wide bg-sage-100 text-sage-600 px-2 py-0.5 rounded-full">Historical</span></h1>
        <p className="text-sm text-sage-500 mt-1">Read-only records. Not tax invoices.</p>
      </div>

      <div className="rounded-xl border border-sage-200 bg-sage-50 p-4 mb-6 text-sm text-sage-700">
        <p>
          <span className="font-semibold">This workflow is retired.</span> Contractor pay
          runs entirely through{' '}
          <Link href="/portal/contractor-invoices/pay-run" className="underline hover:text-sage-900">Pay run</Link>
          {' '}— approved payables become a remittance directly, with no statement to
          generate, issue or have confirmed.
        </p>
        <p className="mt-2 text-xs text-sage-500">
          Existing statements below stay viewable as records. New ones can no longer be created.
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="bg-white rounded-xl border border-sage-100 p-8 text-center text-sage-500 text-sm">
          No statements for {periodLabel(selected)}.
        </div>
      ) : (
        BUCKET_ORDER.filter((b) => count(b) > 0).map((b) => (
          <section key={b} className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className={`text-sm font-semibold ${BUCKET_ACCENT[b]}`}>{BUCKET_LABEL[b]} <span className="text-sage-400 font-normal">· {count(b)}</span></h2>
              <span className="text-sm text-sage-600">{fmt(total(b))}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {(grouped.get(b) ?? []).map((c) => {
                const ds = statementDisplayStatus(c, nowIso)
                return (
                  <Link key={c.id} href={`/portal/contractor-statements/${c.id}`} className="block bg-white rounded-xl border border-sage-100 shadow-sm p-4 hover:border-sage-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-sage-800">{c.contractor_name ?? 'Unknown'}</span>
                        <div className="text-xs text-sage-400">{c.statement_number}{c.remittance_number ? ` · ${c.remittance_number}` : ''}{c.remittance_paid_at ? ` · paid ${new Date(c.remittance_paid_at).toLocaleDateString('en-NZ')}` : ''}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_CHIP[ds]}`}>{STATEMENT_STATUS_LABEL[ds]}</span>
                        <ArrowRight size={15} className="text-sage-300" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-sm">
                      <span className="text-sage-500 text-xs">{c.line_count} line{c.line_count === 1 ? '' : 's'}</span>
                      <div className="flex items-center gap-2">
                        {c.carried_lines > 0 && <span className="inline-flex items-center gap-1 text-blue-700 text-xs"><CornerDownRight size={11} /> {c.carried_lines}</span>}
                        {c.gst_review_lines > 0 && <span className="inline-flex items-center gap-1 text-amber-700 text-xs"><AlertTriangle size={11} /> {c.gst_review_lines}</span>}
                        <span className="font-semibold text-sage-800">{fmt(c.total_payable)}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
