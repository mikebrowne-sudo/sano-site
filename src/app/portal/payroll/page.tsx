import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { DollarSign, Plus, ClipboardCheck, Wallet } from 'lucide-react'
import clsx from 'clsx'
import { isAdminEmail } from '@/lib/is-admin'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function PayrollPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = isAdminEmail(user?.email)

  const { data: runs, error } = await supabase
    .from('pay_runs')
    .select('id, pay_period_start, pay_period_end, pay_date, status, created_at')
    .order('pay_date', { ascending: false })

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl tracking-tight font-bold text-sage-800">Payroll</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link href="/portal/payroll/contractors" className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors">
              <Wallet size={16} /> Pay contractors
            </Link>
          )}
          <Link href="/portal/payroll/new" className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors">
            <Plus size={16} /> New Pay Run
          </Link>
        </div>
      </div>

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
            Looking for older contractor pay runs?{' '}
            <Link href="/portal/payroll/contractor-runs" className="underline hover:text-sage-600">
              View past contractor pay runs
            </Link>
            .
          </p>
        </div>
      )}

      {(!runs || runs.length === 0) ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <DollarSign size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm mb-4">No pay runs yet.</p>
          <Link href="/portal/payroll/new" className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"><Plus size={16} /> Create first</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-sage-600">
                <th className="px-5 py-3 font-semibold">Period</th>
                <th className="px-5 py-3 font-semibold">Pay date</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0 group">
                  <td className="p-0"><Link href={`/portal/payroll/${r.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors font-medium text-sage-800">{fmtDate(r.pay_period_start)} – {fmtDate(r.pay_period_end)}</Link></td>
                  <td className="p-0"><Link href={`/portal/payroll/${r.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{fmtDate(r.pay_date)}</Link></td>
                  <td className="p-0"><Link href={`/portal/payroll/${r.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors"><span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', r.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700')}>{r.status}</span></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
