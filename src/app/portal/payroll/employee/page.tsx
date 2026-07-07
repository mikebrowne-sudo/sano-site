// Casual-employee payroll helper — run pay, generate a payslip + IRD
// payday-filing figures, record the wages expense. Verify-gated PAYE.
// Finance/accountant can view; admin runs pay.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isFinanceUser, isAdminUser } from '@/lib/is-admin'
import { PAYE_RATES } from '@/lib/payroll/paye'
import { EmployeePayForm } from './_components/EmployeePayForm'
import { DeletePayRunButton } from './_components/DeletePayRunButton'
import { formatCurrency, formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function EmployeePayrollPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isFinanceUser(user)) notFound()
  const canEdit = isAdminUser(user)

  const { data: runs } = await supabase
    .from('employee_pay_runs')
    .select('id, person_label, pay_period, pay_date, hours, rate, gross, paye, kiwisaver, net')
    .order('pay_date', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-4xl">
      <Link href="/portal/payroll" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4">
        <ArrowLeft size={14} /> Payroll
      </Link>
      <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-1">Employee pay</h1>
      <p className="text-sm text-sage-500 mb-5 max-w-2xl">
        Run a casual employee’s pay: gross, holiday pay, PAYE, KiwiSaver and net, with the two figures you file with IRD. Records the wages expense for your P&amp;L.
      </p>

      {/* Verify banner — PAYE rates are not authoritative. */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-6 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <span>
          <span className="font-semibold">Verify the tax figures before real pay.</span> {PAYE_RATES.effectiveNote} This tool is a helper, not authoritative payroll software — always cross-check PAYE against IRD’s official calculator, and file each pay with IRD within 2 working days.
        </span>
      </div>

      {canEdit && <EmployeePayForm personLabel="Carol" />}

      {/* Past runs */}
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-sage-500 mt-8 mb-2 px-1">Pay history</h2>
      {(!runs || runs.length === 0) ? (
        <div className="rounded-2xl border border-dashed border-sage-200 bg-sage-50/50 p-8 text-center text-sm text-sage-500">No pay runs yet.</div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden tnum">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-sage-500 border-b border-sage-100 bg-sage-50/50">
                <th className="py-2.5 px-4 font-semibold">Pay date</th>
                <th className="py-2.5 px-4 font-semibold">Who</th>
                <th className="py-2.5 px-4 font-semibold text-right">Gross</th>
                <th className="py-2.5 px-4 font-semibold text-right">PAYE</th>
                <th className="py-2.5 px-4 font-semibold text-right">Net</th>
                <th className="py-2.5 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b border-sage-50">
                  <td className="py-2.5 px-4 text-sage-700">{formatDate(r.pay_date)}</td>
                  <td className="py-2.5 px-4 text-sage-600">{r.person_label} <span className="text-[11px] text-sage-400">· {r.pay_period}</span></td>
                  <td className="py-2.5 px-4 text-right text-sage-800 font-medium">{formatCurrency(Number(r.gross))}</td>
                  <td className="py-2.5 px-4 text-right text-sage-600">{formatCurrency(Number(r.paye))}</td>
                  <td className="py-2.5 px-4 text-right text-sage-800 font-semibold">{formatCurrency(Number(r.net))}</td>
                  <td className="py-2.5 px-4 text-right">{canEdit && <DeletePayRunButton id={r.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
