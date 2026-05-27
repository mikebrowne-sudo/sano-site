// Phase E.1 — contractor pay run detail page (admin-only).
//
// Shows the run summary, totals, and items grouped by contractor.
// Renders the right action button based on lifecycle position:
//   draft     → Approve Pay Run
//   approved  → Mark Paid
//   paid      → no action; CSV export only
// CSV export is a route handler at ./csv (this file's sibling).

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Briefcase, Download } from 'lucide-react'
import { isAdminEmail } from '@/lib/is-admin'
import clsx from 'clsx'
import { PayRunActions } from './_components/PayRunActions'
import { computePayRunVariance } from '@/lib/pay-run-variance'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-700',
  approved:  'bg-blue-50 text-blue-700',
  paid:      'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function fmtCurrency(dollars: number): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

type ItemRow = {
  id: string
  job_id: string
  contractor_id: string
  approved_hours: number | null
  pay_rate: number | null
  amount: number | null
  status: string
  contractors: { full_name: string | null; email: string | null } | null
  jobs: {
    id: string
    job_number: string
    title: string | null
    scheduled_date: string | null
    /** Phase G.2 step 4 — used for the allowed-hours fallback split. */
    allowed_hours: number | null
  } | null
}

type WorkerRow = {
  job_id: string
  contractor_id: string
  hours_allocated: number | null
  actual_hours: number | null
}

function fmtHours(value: number | null): string {
  if (value == null) return '—'
  return `${value.toFixed(1)}h`
}

function fmtSignedHours(value: number | null): string {
  if (value == null) return '—'
  if (value === 0) return '0 hrs'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)} hrs`
}

function fmtSignedCurrency(value: number | null): string {
  if (value == null) return '—'
  if (value === 0) return '$0.00'
  const sign = value > 0 ? '+' : ''
  return `${sign}${new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(value)}`
}

export default async function ContractorPayRunDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) notFound()

  const { data: run, error: runErr } = await supabase
    .from('pay_runs')
    .select('id, kind, pay_period_start, pay_period_end, pay_date, status, notes, approved_at, approved_by, paid_at, paid_by, created_at')
    .eq('id', params.id)
    .single()
  if (runErr || !run) notFound()
  if (run.kind !== 'contractor') {
    // Send employee runs to the legacy detail page; admin can navigate.
    return notFound()
  }

  const { data: itemsRaw } = await supabase
    .from('pay_run_items')
    .select(`
      id, job_id, contractor_id, approved_hours, pay_rate, amount, status,
      contractors ( full_name, email ),
      jobs ( id, job_number, title, scheduled_date, allowed_hours )
    `)
    .eq('pay_run_id', params.id)
    .order('contractor_id')

  const items = ((itemsRaw ?? []) as unknown as ItemRow[])

  // Phase G.2 step 4 — load the job_workers slice needed for variance
  // columns. Pulls every assigned worker for every job on the pay run
  // (not just those who appear on this run) so the allowed-hours
  // fallback can split jobs.allowed_hours across the actual assigned
  // worker count when an individual row's hours_allocated is null.
  const jobIds = Array.from(new Set(items.map((it) => it.job_id))).filter(Boolean)
  const { data: workersRaw } = jobIds.length > 0
    ? await supabase
        .from('job_workers')
        .select('job_id, contractor_id, hours_allocated, actual_hours')
        .in('job_id', jobIds)
    : { data: [] as WorkerRow[] }
  const workers = (workersRaw ?? []) as WorkerRow[]

  // Lookups for the row-level variance computation.
  const workerByKey = new Map<string, WorkerRow>()
  const workerCountByJob = new Map<string, number>()
  for (const w of workers) {
    workerByKey.set(`${w.job_id}:${w.contractor_id}`, w)
    workerCountByJob.set(w.job_id, (workerCountByJob.get(w.job_id) ?? 0) + 1)
  }

  // Group by contractor.
  const byContractor = new Map<string, {
    contractorId: string
    name: string
    email: string | null
    rows: ItemRow[]
    totalHours: number
    totalAmount: number
  }>()
  for (const it of items) {
    const key = it.contractor_id
    const bucket = byContractor.get(key) ?? {
      contractorId: it.contractor_id,
      name: it.contractors?.full_name ?? 'Unknown',
      email: it.contractors?.email ?? null,
      rows: [],
      totalHours: 0,
      totalAmount: 0,
    }
    bucket.rows.push(it)
    bucket.totalHours += it.approved_hours ?? 0
    bucket.totalAmount += it.amount ?? 0
    byContractor.set(key, bucket)
  }
  const groups = Array.from(byContractor.values()).sort((a, b) => b.totalAmount - a.totalAmount)
  const grandTotal = groups.reduce((s, g) => s + g.totalAmount, 0)
  const status = (run.status as string) ?? 'draft'

  return (
    <div>
      <Link
        href="/portal/payroll/contractor-runs"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to contractor pay runs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-sage-800 tracking-tight">
              {fmtDate(run.pay_period_start)} – {fmtDate(run.pay_period_end)}
            </h1>
            <span className={clsx('inline-block px-3 py-1 rounded-full text-sm font-medium capitalize', STATUS_STYLES[status] ?? STATUS_STYLES.draft)}>
              {status}
            </span>
          </div>
          <p className="text-sm text-sage-600 mt-1.5">
            {items.length} item{items.length === 1 ? '' : 's'} · {groups.length} contractor{groups.length === 1 ? '' : 's'} · <span className="font-semibold text-sage-800">{fmtCurrency(grandTotal)}</span>
          </p>
          {run.notes && (
            <p className="text-sm text-sage-600 mt-2 max-w-2xl whitespace-pre-wrap">{run.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/portal/payroll/contractor-runs/${run.id}/csv`}
            className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
          >
            <Download size={16} /> Export CSV
          </a>
          <PayRunActions payRunId={run.id} status={status} />
        </div>
      </div>

      {(run.approved_at || run.paid_at) && (
        <div className="bg-sage-50 border border-sage-100 rounded-lg px-4 py-3 mb-6 text-xs text-sage-600 flex flex-wrap gap-x-6 gap-y-1">
          {run.approved_at && <span>Approved {fmtDateTime(run.approved_at)}</span>}
          {run.paid_at     && <span>Paid {fmtDateTime(run.paid_at)}</span>}
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center text-sage-600 text-sm">
          This pay run has no items.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.contractorId} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <header className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-gray-100 bg-sage-50/50">
                <Briefcase size={14} className="text-sage-500" />
                <Link
                  href={`/portal/contractors/${g.contractorId}`}
                  className="font-semibold text-sage-800 hover:underline"
                >
                  {g.name}
                </Link>
                {g.email && <span className="text-xs text-sage-500">{g.email}</span>}
                <span className="text-xs text-sage-500">
                  {g.rows.length} job{g.rows.length === 1 ? '' : 's'} · {g.totalHours} hrs
                </span>
                <span className="ml-auto text-sm font-semibold text-sage-800">
                  {fmtCurrency(g.totalAmount)}
                </span>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-sage-600">
                      <th className="px-5 py-2.5 font-semibold">Job</th>
                      <th className="px-5 py-2.5 font-semibold">Date</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Allowed</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Actual</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Approved</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Variance</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Rate</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((it) => {
                      const worker = workerByKey.get(`${it.job_id}:${it.contractor_id}`) ?? null
                      const variance = computePayRunVariance({
                        approvedHours: it.approved_hours,
                        payRate: it.pay_rate,
                        hoursAllocated: worker?.hours_allocated ?? null,
                        jobAllowedHours: it.jobs?.allowed_hours ?? null,
                        workerCount: workerCountByJob.get(it.job_id) ?? 0,
                      })
                      const actualHours = worker?.actual_hours ?? null
                      return (
                        <tr key={it.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-5 py-2.5">
                            <Link href={`/portal/jobs/${it.jobs?.id ?? ''}`} className="font-medium text-sage-800 hover:underline">
                              {it.jobs?.job_number ?? '—'}
                            </Link>
                            {it.jobs?.title && <span className="block text-xs text-sage-500">{it.jobs.title}</span>}
                          </td>
                          <td className="px-5 py-2.5 text-sage-600 text-xs whitespace-nowrap">{fmtDate(it.jobs?.scheduled_date ?? null)}</td>
                          <td className="px-5 py-2.5 text-right text-sage-700 whitespace-nowrap">{fmtHours(variance.allowedHours)}</td>
                          <td className="px-5 py-2.5 text-right text-sage-700 whitespace-nowrap">{fmtHours(actualHours)}</td>
                          <td className="px-5 py-2.5 text-right text-sage-800 whitespace-nowrap">{fmtHours(it.approved_hours)}</td>
                          <td className="px-5 py-2.5 text-right whitespace-nowrap">
                            {variance.varianceHours == null ? (
                              <span className="text-sage-300">—</span>
                            ) : (
                              <span className="inline-flex flex-col items-end gap-0.5 text-sage-700">
                                <span>{fmtSignedHours(variance.varianceHours)}</span>
                                <span className="text-xs text-sage-500">{fmtSignedCurrency(variance.varianceDollars)}</span>
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-2.5 text-right text-sage-800 whitespace-nowrap">{fmtCurrency(it.pay_rate ?? 0)}</td>
                          <td className="px-5 py-2.5 text-right font-semibold text-sage-800 whitespace-nowrap">{fmtCurrency(it.amount ?? 0)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
