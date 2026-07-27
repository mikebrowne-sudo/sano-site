import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PayRunActions } from './_components/PayRunActions'
import { isTempReductionExpired } from '@/lib/payroll/kiwisaver'
import { AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { Ks10IrdAlert } from '../../_components/Ks10IrdAlert'
import { loadPendingKs10Submissions, type PendingKs10 } from '@/lib/kiwisaver-ks10-reminders'
import { PayRunWorkflowPanel } from './_components/PayRunWorkflowPanel'
import { computeIrdSetAside, paydayFilingDue } from '@/lib/payroll/payrun-obligations'
import { firstPayReadiness } from '@/lib/payroll/first-pay-readiness'
import { isAdminUser } from '@/lib/is-admin'
import { DeleteDraftButton } from './_components/DeleteDraftButton'

function fmt(d: number) { return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(d) }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) }

export default async function PayRunDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: run, error }, { data: lines }, { data: payslips }] = await Promise.all([
    supabase.from('pay_runs').select('*').eq('id', params.id).single(),
    supabase.from('pay_run_lines').select('id, contractor_id, hours_worked, hourly_rate, gross_pay, holiday_pay, paye, student_loan, kiwisaver_employee, kiwisaver_employer, kiwisaver_employer_net, net_pay, mileage_reimbursement, tax_code, contractors ( full_name )').eq('pay_run_id', params.id).order('created_at'),
    supabase.from('payslips').select('id, contractor_id, sent_at, pay_run_line_id').eq('pay_run_id', params.id),
  ])

  if (error || !run) notFound()

  // Flag any line whose employee's temporary KiwiSaver reduction had expired as
  // of the pay date — the run used the standard rate (never a silent 3%), but
  // staff must confirm and update the employee's record before finalising.
  const lineContractorIds = Array.from(new Set((lines ?? []).map((l) => l.contractor_id as string)))
  const { data: ksRows } = lineContractorIds.length
    ? await supabase
        .from('contractors')
        .select('id, full_name, kiwisaver_rate_source, kiwisaver_temp_reduction_expiry, contract_signed_date, ir330_received, bank_account_number, kiwisaver_status, kiwisaver_info_pack_delivered_date, kiwisaver_ks3_provided')
        .in('id', lineContractorIds)
    : { data: [] as Array<Record<string, unknown>> }
  const expiredReductionNames = (ksRows ?? [])
    .filter((c) => isTempReductionExpired((c as Record<string, unknown>).kiwisaver_rate_source as string | null, (c as Record<string, unknown>).kiwisaver_temp_reduction_expiry as string | null, run.pay_date))
    .map((c) => (c as Record<string, unknown>).full_name as string)

  // KS10 opt-outs received but not yet forwarded to IRD — this payday filing
  // (IR348) is the vehicle to send them. Best-effort (migration-dependent).
  const today = new Date().toISOString().slice(0, 10)
  let pendingKs10: PendingKs10[] = []
  try {
    pendingKs10 = await loadPendingKs10Submissions(supabase, today)
  } catch { /* migration not applied yet */ }

  // ── Three-workflow view (payment / filing / IRD remittance) + readiness ──
  const { data: { user: staffUser } } = await supabase.auth.getUser()
  const isAdmin = isAdminUser(staffUser)

  let empRegistered = false, empNote: string | null = null
  try {
    const { data: ws } = await supabase.from('workforce_settings').select('emp_registered, emp_note').limit(1).maybeSingle()
    empRegistered = !!(ws as { emp_registered?: boolean } | null)?.emp_registered
    empNote = (ws as { emp_note?: string | null } | null)?.emp_note ?? null
  } catch { /* column may not exist yet */ }

  const setAside = computeIrdSetAside((lines ?? []).map((l) => ({
    paye: l.paye ?? 0,
    kiwisaverEmployee: l.kiwisaver_employee ?? 0,
    kiwisaverEmployerGross: l.kiwisaver_employer ?? 0,
    kiwisaverEmployerNet: (l as { kiwisaver_employer_net?: number | null }).kiwisaver_employer_net ?? null,
  })))

  const ksRowById = new Map((ksRows ?? []).map((r) => [(r as { id: string }).id, r as Record<string, unknown>]))
  const readiness = (lines ?? []).map((l) => {
    const r = ksRowById.get(l.contractor_id as string) ?? {}
    return {
      employeeName: (l.contractors as unknown as { full_name: string } | null)?.full_name ?? '—',
      items: firstPayReadiness({
        agreementSigned: !!r.contract_signed_date,
        ir330Received: !!r.ir330_received,
        bankAccount: (r.bank_account_number as string | null) ?? null,
        kiwisaverStatus: (r.kiwisaver_status as string | null) ?? null,
        infoPackRecorded: !!r.kiwisaver_info_pack_delivered_date || !!r.kiwisaver_ks3_provided,
        irdCompared: !!(run as { ird_compared_at?: string | null }).ird_compared_at,
        empRegistered,
      }),
    }
  })
  const paymentLabel = (lines ?? []).length === 1 ? (readiness[0]?.employeeName ?? 'employee') : `${(lines ?? []).length} employees`
  const filingDue = paydayFilingDue(run.pay_date)

  const payslipMap = new Map((payslips ?? []).map((p) => [p.pay_run_line_id, p]))
  const totalGross = (lines ?? []).reduce((s, l) => s + (l.gross_pay ?? 0), 0)
  const totalNet = (lines ?? []).reduce((s, l) => s + (l.net_pay ?? 0), 0)
  const totalPaye = (lines ?? []).reduce((s, l) => s + (l.paye ?? 0), 0)
  const totalKsEmp = (lines ?? []).reduce((s, l) => s + (l.kiwisaver_employee ?? 0), 0)
  const totalKsEr = (lines ?? []).reduce((s, l) => s + (l.kiwisaver_employer ?? 0), 0)
  const totalReimb = (lines ?? []).reduce((s, l) => s + (l.mileage_reimbursement ?? 0), 0)
  const totalPaid = Math.round((totalNet + totalReimb) * 100) / 100

  return (
    <div>
      <Link href="/portal/payroll" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Back</Link>

      {pendingKs10.length > 0 && (
        <div className="mb-6"><Ks10IrdAlert pending={pendingKs10} context="payrun" /></div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl tracking-tight font-bold text-sage-800">{fmtDate(run.pay_period_start)} – {fmtDate(run.pay_period_end)}</h1>
          <p className="text-sage-600 text-sm mt-1">Pay date: {fmtDate(run.pay_date)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx('inline-block px-3 py-1 rounded-full text-sm font-medium capitalize', run.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700')}>{run.status}</span>
          <PayRunActions payRunId={run.id} status={run.status} />
        </div>
      </div>

      <PayRunWorkflowPanel
        runId={run.id}
        isAdmin={isAdmin}
        payment={{ status: run.status, netTotal: totalNet, label: paymentLabel, paidAt: (run.paid_at as string | null) ?? null }}
        filing={{
          status: (run as { payday_filing_status?: string }).payday_filing_status ?? 'not_filed',
          submittedAt: (run as { payday_filing_submitted_at?: string | null }).payday_filing_submitted_at ?? null,
          acceptedAt: (run as { payday_filing_accepted_at?: string | null }).payday_filing_accepted_at ?? null,
          due: filingDue,
        }}
        emp={{ registered: empRegistered, note: empNote }}
        setAside={setAside}
        irdComparedAt={(run as { ird_compared_at?: string | null }).ird_compared_at ?? null}
        readiness={readiness}
      />

      {expiredReductionNames.length > 0 && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Review required before finalising</p>
            <p className="mt-0.5 text-amber-700">
              {expiredReductionNames.join(', ')} {expiredReductionNames.length === 1 ? 'has' : 'have'} an expired temporary
              KiwiSaver rate reduction. The run used the standard 3.5% (not 3%). Confirm and update
              {expiredReductionNames.length === 1 ? ' their' : ' each'} record before paying.
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"><p className="text-xs text-sage-500">Employees</p><p className="text-lg font-bold text-sage-800">{(lines ?? []).length}</p></div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"><p className="text-xs text-sage-500">Gross</p><p className="text-lg font-bold text-sage-800">{fmt(totalGross)}</p></div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"><p className="text-xs text-sage-500">PAYE</p><p className="text-lg font-bold text-red-600">{fmt(totalPaye)}</p></div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"><p className="text-xs text-sage-500">KiwiSaver</p><p className="text-lg font-bold text-sage-700">{fmt(totalKsEmp + totalKsEr)}</p></div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4"><p className="text-xs text-emerald-600">Net pay</p><p className="text-lg font-bold text-emerald-700">{fmt(totalNet)}</p></div>
        {totalReimb > 0 && (
          <>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"><p className="text-xs text-sage-500">Mileage reimb.</p><p className="text-lg font-bold text-sage-800">{fmt(totalReimb)}</p></div>
            <div className="bg-sage-800 rounded-xl p-4"><p className="text-xs text-sage-300">Total paid</p><p className="text-lg font-bold text-white">{fmt(totalPaid)}</p></div>
          </>
        )}
      </div>
      {totalReimb > 0 && (
        <p className="-mt-4 mb-8 text-xs text-sage-500">Mileage reimbursement is non-taxable — added to net pay, excluded from gross, PAYE, ACC and KiwiSaver.</p>
      )}

      {/* Lines */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-sage-600">
                <th className="px-4 py-3 font-semibold">Employee</th>
                <th className="px-4 py-3 font-semibold text-right">Hours</th>
                <th className="px-4 py-3 font-semibold text-right">Rate</th>
                <th className="px-4 py-3 font-semibold text-right">Gross</th>
                <th className="px-4 py-3 font-semibold text-right" title="Income tax + ACC earner levy, as one statutory deduction">PAYE <span className="font-normal text-sage-400">(incl. ACC)</span></th>
                <th className="px-4 py-3 font-semibold text-right">KS Emp</th>
                <th className="px-4 py-3 font-semibold text-right">Net</th>
                {totalReimb > 0 && <th className="px-4 py-3 font-semibold text-right">Reimb.</th>}
                {totalReimb > 0 && <th className="px-4 py-3 font-semibold text-right">Paid</th>}
                <th className="px-4 py-3 font-semibold">Payslip</th>
              </tr>
            </thead>
            <tbody>
              {(lines ?? []).map((l) => {
                const name = (l.contractors as unknown as { full_name: string } | null)?.full_name ?? '—'
                const ps = payslipMap.get(l.id)
                return (
                  <tr key={l.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-sage-800">{name}</td>
                    <td className="px-4 py-3 text-right text-sage-700">{l.hours_worked}</td>
                    <td className="px-4 py-3 text-right text-sage-600">{fmt(l.hourly_rate)}</td>
                    <td className="px-4 py-3 text-right text-sage-800 font-medium">{fmt(l.gross_pay)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{fmt(l.paye)}</td>
                    <td className="px-4 py-3 text-right text-sage-600">{fmt(l.kiwisaver_employee)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-bold">{fmt(l.net_pay)}</td>
                    {totalReimb > 0 && <td className="px-4 py-3 text-right text-sage-600">{fmt(l.mileage_reimbursement ?? 0)}</td>}
                    {totalReimb > 0 && <td className="px-4 py-3 text-right text-sage-800 font-bold">{fmt((l.net_pay ?? 0) + (l.mileage_reimbursement ?? 0))}</td>}
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
                {totalReimb > 0 && <td className="px-4 py-3 text-right text-sage-700">{fmt(totalReimb)}</td>}
                {totalReimb > 0 && <td className="px-4 py-3 text-right text-sage-900">{fmt(totalPaid)}</td>}
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {run.notes && (
        <div className="mt-6 text-sage-600 text-sm whitespace-pre-wrap">{run.notes}</div>
      )}

      {isAdmin && run.status === 'draft' && (
        <div className="mt-8 pt-6 border-t border-sage-100">
          <DeleteDraftButton
            runId={run.id}
            employeeLabel={paymentLabel}
            periodStart={run.pay_period_start}
            periodEnd={run.pay_period_end}
            payDate={run.pay_date}
            netTotal={totalNet}
          />
        </div>
      )}
    </div>
  )
}
