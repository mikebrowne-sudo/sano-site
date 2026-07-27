import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminEmail } from '@/lib/is-admin'
import { loadIrdLiabilityPeriods, type IrdPeriodView } from '@/lib/payroll/ird-liability-ledger'
import { RecordIrdPaymentForm } from './_components/RecordIrdPaymentForm'

const money = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })

const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700', partially_paid: 'bg-amber-50 text-amber-800',
  overdue: 'bg-red-50 text-red-700', due: 'bg-blue-50 text-blue-700',
  accruing: 'bg-sage-100 text-sage-700', adjusted: 'bg-violet-50 text-violet-700',
}

export default async function IrdLiabilityPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = isAdminEmail(user?.email)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' })

  let periods: IrdPeriodView[] = []
  try { periods = await loadIrdLiabilityPeriods(supabase, today) } catch { /* migration not applied */ }

  const totalOutstanding = periods.reduce((s, p) => s + p.outstanding, 0)

  return (
    <div>
      <Link href="/portal/payroll" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4"><ArrowLeft size={14} /> Payroll</Link>
      <h1 className="text-2xl font-bold text-sage-800 mb-2">IRD liabilities</h1>
      <p className="text-sage-600 text-sm mb-6">PAYE + KiwiSaver owed to IRD, grouped by payment period. Separate from employee payment and payday filing — cleared only when a payment is recorded here.</p>

      {periods.length === 0 ? (
        <p className="text-sage-500 text-sm">No liabilities yet. Approving a pay run creates its liability entry.</p>
      ) : (
        <>
          <div className="mb-6 rounded-xl border border-sage-200 bg-white p-4 inline-block">
            <p className="text-xs text-sage-500">Total outstanding to IRD</p>
            <p className="text-2xl font-bold text-sage-800">{money(totalOutstanding)}</p>
          </div>
          <div className="space-y-4">
            {periods.map((p) => (
              <div key={p.id} className="rounded-xl border border-sage-200 bg-white p-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-sage-800">{p.periodKey} · {fmtDate(p.periodStart)} – {fmtDate(p.periodEnd)}</h2>
                    <p className="text-sm text-sage-600">IRD payment due <strong>{fmtDate(p.dueDate)}</strong>: <strong>{money(p.outstanding)}</strong> currently outstanding</p>
                  </div>
                  <span className={`text-xs font-medium rounded-full px-3 py-1 capitalize ${STATUS_STYLE[p.status] ?? 'bg-gray-100 text-gray-700'}`}>{p.status.replace('_', ' ')}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
                  <div><span className="text-sage-500">Total payable</span><p className="font-medium text-sage-800">{money(p.totalPayable)}</p></div>
                  <div><span className="text-sage-500">Paid</span><p className="font-medium text-sage-800">{money(p.amountPaid)}</p></div>
                  <div><span className="text-sage-500">Outstanding</span><p className="font-medium text-sage-800">{money(p.outstanding)}</p></div>
                  <div><span className="text-sage-500">Pay runs</span><p className="font-medium text-sage-800">{p.lineCount}</p></div>
                </div>
                <p className="text-[12px] text-sage-500 mt-3">PAYE {money(p.paye)} · employee KiwiSaver {money(p.employeeKs)} · gross employer KiwiSaver {money(p.employerKsGross)} (ESCT {money(p.esct)} within){p.adjustments !== 0 ? ` · adjustments ${money(p.adjustments)}` : ''}.</p>
                {isAdmin && p.outstanding > 0 && <div className="mt-3"><RecordIrdPaymentForm liabilityId={p.id} outstanding={p.outstanding} /></div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
