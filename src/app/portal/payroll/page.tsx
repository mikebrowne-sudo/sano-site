import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { DollarSign, Plus } from 'lucide-react'
import clsx from 'clsx'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function PayrollPage() {
  const supabase = createClient()

  const { data: runs, error } = await supabase
    .from('pay_runs')
    .select('id, pay_period_start, pay_period_end, pay_date, status, created_at')
    .order('pay_date', { ascending: false })

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-sage-800 mb-6">Payroll</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">{error.message}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-sage-800">Payroll</h1>
        <Link href="/portal/payroll/new" className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors">
          <Plus size={16} /> New Pay Run
        </Link>
      </div>

      {(!runs || runs.length === 0) ? (
        <div className="bg-white rounded-xl border border-sage-100 p-10 text-center">
          <DollarSign size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm mb-4">No pay runs yet.</p>
          <Link href="/portal/payroll/new" className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"><Plus size={16} /> Create first</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-sage-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sage-100 text-left text-sage-600">
                <th className="px-5 py-3 font-semibold">Period</th>
                <th className="px-5 py-3 font-semibold">Pay date</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b border-sage-50 last:border-0 group">
                  <td className="p-0"><Link href={`/portal/payroll/${r.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors font-medium text-sage-800">{fmtDate(r.pay_period_start)} – {fmtDate(r.pay_period_end)}</Link></td>
                  <td className="p-0"><Link href={`/portal/payroll/${r.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-600">{fmtDate(r.pay_date)}</Link></td>
                  <td className="p-0"><Link href={`/portal/payroll/${r.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors"><span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', r.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700')}>{r.status}</span></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
