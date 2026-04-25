// Phase E — contractor pay approvals pending pay run.
//
// Admin-only view of job_worker rows with pay_status='approved'
// that haven't been bundled into a pay_run_items row yet. Grouped
// by contractor with per-row totals and a grand total at the top.
// Pay run creation for contractor runs lands in Phase E.1.

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Briefcase, DollarSign } from 'lucide-react'
import { isAdminEmail } from '@/lib/is-admin'

export const dynamic = 'force-dynamic'

type ApprovedJobWorker = {
  contractor_id: string
  job_id: string
  approved_hours: number | null
  pay_rate: number | null
  approved_at: string | null
  contractors: { full_name: string | null } | null
  jobs: {
    id: string
    job_number: string
    title: string | null
    address: string | null
    scheduled_date: string | null
    status: string
    deleted_at: string | null
  } | null
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtCurrency(dollars: number): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

export default async function ContractorPendingPayPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) notFound()

  // Pull approved-but-not-yet-in-pay-run job_worker rows. Joined to
  // contractors (full_name) + jobs (display info). Archived jobs
  // are filtered out client-side since the Supabase joined filter
  // doesn't compose cleanly here.
  const { data: rows } = await supabase
    .from('job_workers')
    .select(`
      contractor_id, job_id, approved_hours, pay_rate, approved_at,
      contractors ( full_name ),
      jobs ( id, job_number, title, address, scheduled_date, status, deleted_at )
    `)
    .eq('pay_status', 'approved')
    .order('approved_at', { ascending: false })

  const live = ((rows ?? []) as unknown as ApprovedJobWorker[])
    .filter((r) => r.jobs && !r.jobs.deleted_at)

  // Group by contractor.
  const byContractor = new Map<string, {
    contractorId: string
    name: string
    items: ApprovedJobWorker[]
    totalHours: number
    totalAmount: number
  }>()
  for (const r of live) {
    const key = r.contractor_id
    const bucket = byContractor.get(key) ?? {
      contractorId: r.contractor_id,
      name: r.contractors?.full_name ?? 'Unknown',
      items: [],
      totalHours: 0,
      totalAmount: 0,
    }
    const hours = r.approved_hours ?? 0
    const rate = r.pay_rate ?? 0
    bucket.items.push(r)
    bucket.totalHours += hours
    bucket.totalAmount += hours * rate
    byContractor.set(key, bucket)
  }
  const groups = Array.from(byContractor.values()).sort((a, b) => b.totalAmount - a.totalAmount)
  const grandTotal = groups.reduce((sum, g) => sum + g.totalAmount, 0)
  const totalRows = live.length

  return (
    <div>
      <Link
        href="/portal/payroll"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to payroll
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Contractor pay approvals</h1>
        <p className="text-sm text-sage-600 mt-1.5 max-w-2xl">
          Approved job hours waiting to be bundled into a contractor
          pay run. Amounts use the rate that was snapshotted when the
          hours were approved — later rate changes never alter
          historical pay.
        </p>
      </div>

      {totalRows === 0 ? (
        <div className="bg-white rounded-xl border border-sage-100 shadow-sm p-10 text-center">
          <DollarSign size={28} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm">
            No approved hours waiting. Approve hours from a completed
            job&rsquo;s Labour &amp; Margin section to populate this list.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4 bg-sage-50 border border-sage-100 rounded-lg px-4 py-3 mb-6 text-sm">
            <span className="text-sage-600">
              <span className="font-semibold text-sage-800">{totalRows}</span> approved row{totalRows === 1 ? '' : 's'} · <span className="font-semibold text-sage-800">{groups.length}</span> contractor{groups.length === 1 ? '' : 's'}
            </span>
            <span className="ml-auto text-sage-600">
              Grand total: <span className="font-bold text-sage-800">{fmtCurrency(grandTotal)}</span>
            </span>
          </div>

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
                  <span className="text-xs text-sage-500">
                    {g.items.length} job{g.items.length === 1 ? '' : 's'} · {g.totalHours} hrs
                  </span>
                  <span className="ml-auto text-sm font-semibold text-sage-800">
                    {fmtCurrency(g.totalAmount)}
                  </span>
                </header>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-sage-600">
                      <th className="px-5 py-2.5 font-semibold">Job</th>
                      <th className="px-5 py-2.5 font-semibold">Scheduled</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Hours</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Rate</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Amount</th>
                      <th className="px-5 py-2.5 font-semibold">Approved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((it) => {
                      const hours = it.approved_hours ?? 0
                      const rate = it.pay_rate ?? 0
                      const amt = hours * rate
                      return (
                        <tr key={`${it.job_id}-${it.contractor_id}`} className="border-b border-gray-50 last:border-0">
                          <td className="px-5 py-2.5">
                            <Link href={`/portal/jobs/${it.jobs!.id}`} className="font-medium text-sage-800 hover:underline">
                              {it.jobs!.job_number}
                            </Link>
                            {it.jobs!.title && (
                              <span className="block text-xs text-sage-500">{it.jobs!.title}</span>
                            )}
                          </td>
                          <td className="px-5 py-2.5 text-sage-600 text-xs">{fmtDate(it.jobs!.scheduled_date)}</td>
                          <td className="px-5 py-2.5 text-right text-sage-800">{hours}</td>
                          <td className="px-5 py-2.5 text-right text-sage-800">{fmtCurrency(rate)}</td>
                          <td className="px-5 py-2.5 text-right font-semibold text-sage-800">{fmtCurrency(amt)}</td>
                          <td className="px-5 py-2.5 text-sage-500 text-xs">{fmtDate(it.approved_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </section>
            ))}
          </div>

          <p className="text-xs text-sage-500 mt-6">
            Contractor pay run creation from these approvals lands in Phase E.1.
          </p>
        </>
      )}
    </div>
  )
}
