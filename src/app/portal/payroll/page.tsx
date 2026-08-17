import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { DollarSign, Plus, ClipboardCheck } from 'lucide-react'
import clsx from 'clsx'
import { isAdminEmail } from '@/lib/is-admin'
import { QuickPayWeek } from './_components/QuickPayWeek'
import { DeleteDraftPayRunButton } from './_components/DeleteDraftPayRunButton'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function PayrollPage({ searchParams }: { searchParams?: { deleted?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = isAdminEmail(user?.email)

  // Employee pay runs only. Contractor runs (kind='contractor') came from the
  // retired one-click flow and render empty in this employee view.
  const { data: runs, error } = await supabase
    .from('pay_runs')
    .select('id, pay_period_start, pay_period_end, pay_date, status, created_at')
    .or('kind.is.null,kind.eq.employee')
    .order('pay_date', { ascending: false })

  // Active weekly employees → the one-click "Pay this week" card. (Fortnightly
  // employees like Radhika get the standard New Pay Run flow.)
  const { data: weeklyEmps } = await supabase
    .from('contractors')
    .select('full_name')
    .eq('status', 'active')
    .neq('worker_type', 'contractor')
    .eq('pay_frequency', 'weekly')
    .order('full_name')
  const weeklyNames = (weeklyEmps ?? []).map((e) => (e.full_name as string) ?? '—')
  const lastPaid = (runs ?? []).find((r) => r.status === 'completed')?.pay_date ?? null

  if (error) {
    return (
      <div>
        <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-8">Payroll</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">{error.message}</div>
      </div>
    )
  }

  return (
    <div>
      {searchParams?.deleted && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Draft pay run deleted.</div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl tracking-tight font-bold text-sage-800">Payroll</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link href="/portal/payroll/new" className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors">
              <Plus size={16} /> New Pay Run
            </Link>
          )}
        </div>
      </div>

      {/* One-click weekly pay — the fast path for routine weekly employees. */}
      {isAdmin && weeklyNames.length > 0 && (
        <div className="mb-8">
          <QuickPayWeek frequency="weekly" employeeNames={weeklyNames} lastPaidDate={lastPaid} />
        </div>
      )}

      {/* Stage F — contractor pay approvals now live in the canonical
          payables flow. This card points at the new worklist; the old
          job-hours queue + contractor pay-run creation are retired (the
          historical pay-run list stays linked below for reference). */}
      {isAdmin && (
        <div className="mb-8">
          <Link
            href="/portal/contractor-invoices/pending-approvals"
            className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-sage-200 hover:shadow-sm transition-all max-w-xl"
          >
            <ClipboardCheck size={20} className="text-sage-500 mt-0.5" />
            <div className="flex-1">
              <div className="text-sage-800 font-semibold text-sm">Pending pay approvals</div>
              <div className="text-sage-600 text-xs mt-1">
                Approve contractor pay from completed jobs. Approved payables
                flow into the contractor remittance builder.
              </div>
            </div>
          </Link>
          <p className="text-xs text-sage-400 mt-2">
            The legacy contractor pay-run flow is retired — contractor pay runs
            entirely through approve &rarr; remittance.
          </p>
        </div>
      )}

      {(!runs || runs.length === 0) ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <DollarSign size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm mb-4">No pay runs yet.</p>
          {isAdmin && <Link href="/portal/payroll/new" className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"><Plus size={16} /> Create first</Link>}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-sage-600">
                <th className="px-5 py-3 font-semibold">Period</th>
                <th className="px-5 py-3 font-semibold">Pay date</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0 group">
                  <td className="p-0"><Link href={`/portal/payroll/${r.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors font-medium text-sage-800">{fmtDate(r.pay_period_start)} – {fmtDate(r.pay_period_end)}</Link></td>
                  <td className="p-0"><Link href={`/portal/payroll/${r.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{fmtDate(r.pay_date)}</Link></td>
                  <td className="p-0"><Link href={`/portal/payroll/${r.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors"><span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', r.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700')}>{r.status}</span></Link></td>
                  <td className="px-5 py-3 text-right">{isAdmin && r.status === 'draft' && <DeleteDraftPayRunButton payRunId={r.id as string} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
