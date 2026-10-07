// Worker-level Pay view (Phase 5) — read-only.
//
// Answers, for one person: what do we owe them, and what have we paid them?
//
// Same route shape as the existing /tax, /gst and /setup sub-pages, so this
// adds no new navigation concept. Layout is consistent across worker types but
// the CONTENT branches on worker_type — contractors and employees are paid by
// genuinely different systems and forcing one set of fields would misrepresent
// both:
//   contractor -> owed now (contractor_invoices) + canonical remittance history
//   employee   -> pay terms + pay_runs / pay_run_lines / payslips
//
// Contractor history reads FROZEN remittance items, so a later change to how
// shared-GST couples are grouped cannot rewrite what a past payment looked like.
//
// Viewing changes no payment state.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Wallet, Landmark, FileText, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isFinanceUser } from '@/lib/is-admin'
import { formatCurrency, formatDate } from '@/lib/format'
import { loadContractorWorkerPay, loadEmployeeWorkerPay } from '@/lib/pay-overview-data'
import { PaymentStateChip } from '../../../contractor-invoices/remittances/_components/PaymentStateChip'
import { BackLink } from '../../../_components/BackLink'

export const dynamic = 'force-dynamic'

export default async function WorkerPayPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isFinanceUser(user)) notFound()

  const { data: worker } = await supabase
    .from('contractors')
    .select('id, full_name, worker_type')
    .eq('id', params.id)
    .maybeSingle()
  if (!worker) notFound()

  const name = (worker.full_name as string | null) ?? 'Worker'
  const isEmployee = (worker.worker_type as string | null) !== 'contractor'

  return (
    <div className="max-w-4xl mx-auto">
      <BackLink fallbackHref={`/portal/contractors/${params.id}`} label={`Back to ${name}`} />
      <h1 className="text-2xl font-bold text-sage-800 tracking-tight mb-1">{name} · Pay</h1>
      <p className="text-sm text-sage-500 mb-6">
        {isEmployee ? 'Payroll terms and recent pay runs.' : 'What we owe, and what we’ve paid.'}
      </p>

      {isEmployee
        ? <EmployeePay supabase={supabase} contractorId={params.id} />
        : <ContractorPay supabase={supabase} contractorId={params.id} name={name} />}
    </div>
  )
}

async function ContractorPay({
  supabase, contractorId, name,
}: {
  supabase: ReturnType<typeof createClient>
  contractorId: string
  name: string
}) {
  const pay = await loadContractorWorkerPay(supabase, contractorId, name)

  return (
    <div className="space-y-6">
      {/* Current */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 font-semibold text-sage-800"><Wallet size={16} /> Currently owed</h2>
          <span className="text-2xl font-bold text-sage-800 tabular-nums">{formatCurrency(pay.owedTotal)}</span>
        </div>
        {pay.owedLines.length === 0 ? (
          <p className="text-sm text-sage-400">Nothing outstanding — everything approved has been paid.</p>
        ) : (
          <>
            <p className="text-xs text-sage-500 mb-2">
              {pay.owedLines.length} job{pay.owedLines.length === 1 ? '' : 's'} approved and not yet paid.
            </p>
            <ul className="divide-y divide-sage-50">
              {pay.owedLines.map((l) => (
                <li key={l.ciId} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium text-sage-800">{l.jobNumber ?? l.invoiceNumber ?? '—'}</span>
                    {l.jobAddress && <span className="text-sage-500"> — {l.jobAddress}</span>}
                  </span>
                  <span className="font-medium text-sage-800 tabular-nums shrink-0">{formatCurrency(l.amount)}</span>
                </li>
              ))}
            </ul>
            <Link href="/portal/contractor-invoices/pay-run" className="inline-flex items-center gap-1.5 mt-3 text-sm text-sage-600 hover:text-sage-800 underline">
              Go to contractor pay <ArrowRight size={13} />
            </Link>
          </>
        )}
      </section>

      {/* History */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 font-semibold text-sage-800"><Landmark size={16} /> Payment history</h2>
          <span className="text-sm text-sage-600">Paid to date <span className="font-semibold text-sage-800 tabular-nums">{formatCurrency(pay.paidToDate)}</span></span>
        </div>
        {pay.payments.length === 0 ? (
          <p className="text-sm text-sage-400">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tnum">
              <thead>
                <tr className="text-left text-sage-500 border-b border-sage-100">
                  <th className="py-2 pr-3 font-semibold">Paid</th>
                  <th className="py-2 pr-3 font-semibold">Remittance</th>
                  <th className="py-2 pr-3 font-semibold text-right">Jobs</th>
                  <th className="py-2 pr-3 font-semibold text-right">Amount</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {pay.payments.map((p) => (
                  <tr key={p.remittanceId} className="border-b border-sage-50 last:border-0">
                    <td className="py-2 pr-3 text-sage-600 whitespace-nowrap">{formatDate(p.paymentDate)}</td>
                    <td className="py-2 pr-3">
                      <Link href={`/portal/contractor-invoices/remittances/${p.remittanceId}`} className="font-medium text-sage-800 hover:underline">
                        {p.remittanceNumber}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-right text-sage-600">{p.jobCount || '—'}</td>
                    <td className="py-2 pr-3 text-right font-medium text-sage-800">{formatCurrency(p.amount)}</td>
                    <td className="py-2"><PaymentStateChip state={p.state} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[11px] text-sage-400 mt-2">
              Amounts are this contractor&rsquo;s share of each remittance, from the frozen payment record.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

async function EmployeePay({
  supabase, contractorId,
}: {
  supabase: ReturnType<typeof createClient>
  contractorId: string
}) {
  const pay = await loadEmployeeWorkerPay(supabase, contractorId)
  const latest = pay.runs[0] ?? null

  return (
    <div className="space-y-6">
      {/* Pay terms */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="flex items-center gap-2 font-semibold text-sage-800 mb-3"><Wallet size={16} /> Pay terms</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-sage-400">Hourly rate</dt>
            <dd className="text-sage-800 font-semibold tabular-nums mt-0.5">{pay.hourlyRate != null ? formatCurrency(pay.hourlyRate) : '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-sage-400">Standard hours</dt>
            <dd className="text-sage-800 font-semibold tabular-nums mt-0.5">{pay.standardHours ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-sage-400">Frequency</dt>
            <dd className="text-sage-800 font-semibold capitalize mt-0.5">{pay.payFrequency ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-sage-400">Tax code</dt>
            <dd className="text-sage-800 font-semibold mt-0.5">{pay.taxCode ?? '—'}</dd>
          </div>
        </dl>
        {latest && (
          <p className="text-xs text-sage-500 mt-3">
            Latest net pay <span className="font-semibold text-sage-700">{formatCurrency(latest.net)}</span>
            {latest.payDate && <> · {formatDate(latest.payDate)}</>}
          </p>
        )}
      </section>

      {/* Pay runs */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 font-semibold text-sage-800"><FileText size={16} /> Recent pay runs</h2>
          <Link href="/portal/payroll" className="text-sm text-sage-600 hover:text-sage-800 underline">Employee payroll</Link>
        </div>
        {pay.runs.length === 0 ? (
          <p className="text-sm text-sage-400">No pay runs for this employee yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tnum">
              <thead>
                <tr className="text-left text-sage-500 border-b border-sage-100">
                  <th className="py-2 pr-3 font-semibold">Pay date</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold text-right">Gross</th>
                  <th className="py-2 pr-3 font-semibold text-right">Net</th>
                  <th className="py-2 font-semibold text-right">Payslip</th>
                </tr>
              </thead>
              <tbody>
                {pay.runs.map((r) => (
                  <tr key={r.lineId} className="border-b border-sage-50 last:border-0">
                    <td className="py-2 pr-3 text-sage-600 whitespace-nowrap">{formatDate(r.payDate)}</td>
                    <td className="py-2 pr-3 text-sage-600 capitalize">{r.status ?? '—'}</td>
                    <td className="py-2 pr-3 text-right text-sage-700">{formatCurrency(r.gross)}</td>
                    <td className="py-2 pr-3 text-right font-medium text-sage-800">{formatCurrency(r.net)}</td>
                    <td className="py-2 text-right">
                      {r.payslipId ? (
                        <a href={`/api/payslips/${r.lineId}/pdf`} target="_blank" rel="noopener noreferrer" className="text-sage-600 hover:text-sage-800 underline">
                          PDF
                        </a>
                      ) : (
                        <Link href={`/portal/payroll/${r.runId}`} className="text-sage-500 hover:text-sage-700 underline">Open run</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
