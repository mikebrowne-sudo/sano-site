// Contractor pay statement (allowed-hours model, 2026-06).
//
// A clean, contractor-facing view of what they've earned: one line per
// completed job (job, date, hours, amount), grouped by pay-run period
// with its pay date, a per-period subtotal, and headline totals.
//
// Pay basis matches the rest of the system: (allowed hours + admin-
// approved extra) × the snapshotted job pay_rate (falling back to the
// contractor's current hourly rate for historical rows). No job price
// or margin is ever shown to the contractor.
//
// RLS-scoped: we query job_workers by the signed-in contractor's id,
// and RLS independently restricts rows to that contractor.

import { getContractor } from '../_lib/get-contractor'
import { payPeriodForDate, type PayPeriod } from '@/lib/contractor-pay-period'
import { formatCurrency, formatDate } from '@/lib/format'
import { Wallet, CheckCircle2, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface RawRow {
  hours_allocated: number | null
  extra_hours: number | null
  extra_hours_status: string | null
  pay_rate: number | null
  pay_status: string | null
  jobs: {
    id: string
    job_number: string | null
    title: string | null
    address: string | null
    status: string | null
    completed_at: string | null
    allowed_hours: number | null
  } | null
}

interface Line {
  jobId: string
  jobNumber: string | null
  title: string | null
  completedAt: string
  hours: number
  amount: number
  payStatus: string
}

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
  // pending / approved → upcoming
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      <Clock size={11} /> Upcoming
    </span>
  )
}

export default async function ContractorPayrollPage() {
  const { supabase, contractor } = await getContractor()

  const { data: rowsRaw } = await supabase
    .from('job_workers')
    .select(`
      hours_allocated, extra_hours, extra_hours_status, pay_rate, pay_status,
      jobs!inner ( id, job_number, title, address, status, completed_at, allowed_hours )
    `)
    .eq('contractor_id', contractor.id)

  const rows = (rowsRaw ?? []) as unknown as RawRow[]
  const fallbackRate = contractor.hourly_rate ?? 0

  // Build per-job lines for completed / invoiced jobs with a completion
  // date (needed to place them in a pay period).
  const lines: Line[] = rows
    .filter((r) => r.jobs && (r.jobs.status === 'completed' || r.jobs.status === 'invoiced'))
    .filter((r) => !!r.jobs?.completed_at)
    .map((r) => {
      const j = r.jobs!
      const allowed = r.hours_allocated ?? j.allowed_hours ?? 0
      const approvedExtra = r.extra_hours_status === 'approved' ? (r.extra_hours ?? 0) : 0
      const hours = Math.round((allowed + approvedExtra) * 100) / 100
      const rate = r.pay_rate ?? fallbackRate
      return {
        jobId: j.id,
        jobNumber: j.job_number,
        title: j.title,
        completedAt: j.completed_at as string,
        hours,
        amount: Math.round(hours * rate * 100) / 100,
        payStatus: r.pay_status ?? 'pending',
      }
    })

  // Group by pay-run period (keyed by the unique pay date).
  const groups = new Map<string, { period: PayPeriod; lines: Line[]; subtotal: number }>()
  for (const line of lines) {
    const period = payPeriodForDate(line.completedAt)
    const g = groups.get(period.payDate) ?? { period, lines: [], subtotal: 0 }
    g.lines.push(line)
    g.subtotal = Math.round((g.subtotal + line.amount) * 100) / 100
    groups.set(period.payDate, g)
  }
  const periods = Array.from(groups.values()).sort((a, b) => b.period.payDate.localeCompare(a.period.payDate))
  periods.forEach((g) => g.lines.sort((a, b) => b.completedAt.localeCompare(a.completedAt)))

  const grandTotal = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100
  const upcomingTotal = Math.round(
    lines.filter((l) => l.payStatus !== 'paid').reduce((s, l) => s + l.amount, 0) * 100,
  ) / 100
  const paidTotal = Math.round((grandTotal - upcomingTotal) * 100) / 100

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-10">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-sage-800">Pay statement</h1>
        <p className="text-sm text-sage-500 mt-0.5">
          Your earnings by pay run. Jobs done 1st–15th are paid on the 30th; jobs done 16th–end are paid on the 15th of the next month.
        </p>
      </header>

      {/* Totals */}
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
                        {l.title || l.jobNumber || 'Job'}
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
