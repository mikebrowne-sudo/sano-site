import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PayRunActions } from './_components/PayRunActions'
import clsx from 'clsx'

function fmt(d: number) { return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(d) }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) }

export default async function PayRunDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: run, error }, { data: lines }, { data: payslips }] = await Promise.all([
    supabase.from('pay_runs').select('*').eq('id', params.id).single(),
    supabase.from('pay_run_lines').select('id, contractor_id, hours_worked, hourly_rate, gross_pay, holiday_pay, paye, student_loan, kiwisaver_employee, kiwisaver_employer, net_pay, tax_code, contractors ( full_name )').eq('pay_run_id', params.id).order('created_at'),
    supabase.from('payslips').select('id, contractor_id, sent_at, pay_run_line_id').eq('pay_run_id', params.id),
  ])

  if (error || !run) notFound()

  const payslipMap = new Map((payslips ?? []).map((p) => [p.pay_run_line_id, p]))
  const totalGross = (lines ?? []).reduce((s, l) => s + (l.gross_pay ?? 0), 0)
  const totalNet = (lines ?? []).reduce((s, l) => s + (l.net_pay ?? 0), 0)
  const totalPaye = (lines ?? []).reduce((s, l) => s + (l.paye ?? 0), 0)
  const totalKsEmp = (lines ?? []).reduce((s, l) => s + (l.kiwisaver_employee ?? 0), 0)
  const totalKsEr = (lines ?? []).reduce((s, l) => s + (l.kiwisaver_employer ?? 0), 0)

  return (
    <div>
      <Link href="/portal/payroll" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Back</Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-sage-800">{fmtDate(run.pay_period_start)} – {fmtDate(run.pay_period_end)}</h1>
          <p className="text-sage-600 text-sm mt-1">Pay date: {fmtDate(run.pay_date)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx('inline-block px-3 py-1 rounded-full text-sm font-medium capitalize', run.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700')}>{run.status}</span>
          <PayRunActions payRunId={run.id} status={run.status} />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-sage-100 p-4"><p className="text-xs text-sage-500">Employees</p><p className="text-lg font-bold text-sage-800">{(lines ?? []).length}</p></div>
        <div className="bg-white rounded-xl border border-sage-100 p-4"><p className="text-xs text-sage-500">Gross</p><p className="text-lg font-bold text-sage-800">{fmt(totalGross)}</p></div>
        <div className="bg-white rounded-xl border border-sage-100 p-4"><p className="text-xs text-sage-500">PAYE</p><p className="text-lg font-bold text-red-600">{fmt(totalPaye)}</p></div>
        <div className="bg-white rounded-xl border border-sage-100 p-4"><p className="text-xs text-sage-500">KiwiSaver</p><p className="text-lg font-bold text-sage-700">{fmt(totalKsEmp + totalKsEr)}</p></div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4"><p className="text-xs text-emerald-600">Net pay</p><p className="text-lg font-bold text-emerald-700">{fmt(totalNet)}</p></div>
      </div>

      {/* Lines */}
      <div className="bg-white rounded-xl border border-sage-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sage-100 text-left text-sage-600">
                <th className="px-4 py-3 font-semibold">Employee</th>
                <th className="px-4 py-3 font-semibold text-right">Hours</th>
                <th className="px-4 py-3 font-semibold text-right">Rate</th>
                <th className="px-4 py-3 font-semibold text-right">Gross</th>
                <th className="px-4 py-3 font-semibold text-right">PAYE</th>
                <th className="px-4 py-3 font-semibold text-right">KS Emp</th>
                <th className="px-4 py-3 font-semibold text-right">Net</th>
                <th className="px-4 py-3 font-semibold">Payslip</th>
              </tr>
            </thead>
            <tbody>
              {(lines ?? []).map((l) => {
                const name = (l.contractors as unknown as { full_name: string } | null)?.full_name ?? '—'
                const ps = payslipMap.get(l.id)
                return (
                  <tr key={l.id} className="border-b border-sage-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-sage-800">{name}</td>
                    <td className="px-4 py-3 text-right text-sage-700">{l.hours_worked}</td>
                    <td className="px-4 py-3 text-right text-sage-600">{fmt(l.hourly_rate)}</td>
                    <td className="px-4 py-3 text-right text-sage-800 font-medium">{fmt(l.gross_pay)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{fmt(l.paye)}</td>
                    <td className="px-4 py-3 text-right text-sage-600">{fmt(l.kiwisaver_employee)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-bold">{fmt(l.net_pay)}</td>
                    <td className="px-4 py-3">
                      {ps ? (
                        ps.sent_at
                          ? <span className="text-emerald-600 text-xs font-medium">Sent</span>
                          : <span className="text-sage-400 text-xs">Ready</span>
                      ) : (
                        <span className="text-sage-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-sage-200 font-semibold">
                <td className="px-4 py-3 text-sage-800">Total</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right text-sage-800">{fmt(totalGross)}</td>
                <td className="px-4 py-3 text-right text-red-600">{fmt(totalPaye)}</td>
                <td className="px-4 py-3 text-right text-sage-600">{fmt(totalKsEmp)}</td>
                <td className="px-4 py-3 text-right text-emerald-700">{fmt(totalNet)}</td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {run.notes && (
        <div className="mt-6 text-sage-600 text-sm whitespace-pre-wrap">{run.notes}</div>
      )}
    </div>
  )
}
