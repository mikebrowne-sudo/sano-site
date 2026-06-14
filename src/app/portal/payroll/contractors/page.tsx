// "Pay contractors" — the seamless contractor pay screen.
//
// All completed, unpaid contractor work grouped by contractor, ready to
// pay in one click (creates a paid pay run + sends the remittance). Jobs
// missing a rate or hours are flagged "needs pricing" instead of showing
// a silent $0. Admin-only.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Wallet, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminEmail } from '@/lib/is-admin'
import { formatCurrency, formatDate } from '@/lib/format'
import { loadContractorsToPay } from '../_lib/contractors-to-pay'
import { PayContractorButton } from './_components/PayContractorButton'

export const dynamic = 'force-dynamic'

export default async function PayContractorsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) notFound()

  const contractors = await loadContractorsToPay(supabase)
  const grandPayable = contractors.reduce((s, c) => s + c.payableTotal, 0)
  const anyToPay = contractors.some((c) => c.payableCount > 0)

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/portal/payroll" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4">
        <ArrowLeft size={14} /> Back to payroll
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Pay contractors</h1>
        <p className="text-sm text-sage-600 mt-1 tnum">
          Completed work, ready to pay. <span className="font-semibold text-sage-800">{formatCurrency(grandPayable)}</span> across {contractors.length} contractor{contractors.length === 1 ? '' : 's'}.
        </p>
      </div>

      {contractors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <Wallet size={28} className="text-sage-300 mx-auto mb-2" />
          <p className="text-sage-700 font-medium">Nothing to pay right now</p>
          <p className="text-sage-500 text-sm mt-1">Completed contractor jobs will appear here, ready to pay.</p>
        </div>
      ) : (
        <div className="space-y-5 tnum">
          {contractors.map((c) => (
            <section key={c.contractorId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <header className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100 bg-sage-50/50">
                <div className="min-w-0">
                  <Link href={`/portal/contractors/${c.contractorId}`} className="font-semibold text-sage-800 hover:underline">{c.name}</Link>
                  {c.email && <span className="text-xs text-sage-500 ml-2">{c.email}</span>}
                  <div className="text-xs text-sage-500 mt-0.5">
                    {c.payableCount} job{c.payableCount === 1 ? '' : 's'} ready
                    {c.needsPricingCount > 0 && <span className="text-amber-700"> · {c.needsPricingCount} need pricing</span>}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-lg font-bold text-sage-800">{formatCurrency(c.payableTotal)}</span>
                  {c.payableCount > 0 && <PayContractorButton contractorId={c.contractorId} name={c.name} total={formatCurrency(c.payableTotal)} />}
                </div>
              </header>

              <ul className="divide-y divide-sage-50">
                {c.jobs.map((j) => (
                  <li key={j.jobId} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <Link href={`/portal/jobs/${j.jobId}`} className="font-medium text-sage-800 hover:underline">{j.jobNumber}</Link>
                      <span className="text-sage-400 text-xs ml-2">{formatDate(j.jobDate)}</span>
                      {j.address && <div className="text-xs text-sage-500 truncate">{j.address}</div>}
                    </div>
                    {j.needsPricing ? (
                      <Link href={`/portal/jobs/${j.jobId}`} className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full hover:bg-amber-100 shrink-0">
                        <AlertTriangle size={11} /> {j.reason}
                      </Link>
                    ) : (
                      <div className="text-right shrink-0">
                        <span className="font-semibold text-sage-800">{formatCurrency(j.amount)}</span>
                        <span className="text-xs text-sage-400 ml-2">{j.hours.toFixed(1)}h × {formatCurrency(j.rate)}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {!anyToPay && (
            <p className="text-sm text-sage-500 text-center">Everything here needs pricing — set hours/rate on the flagged jobs to make them payable.</p>
          )}
        </div>
      )}
    </div>
  )
}
