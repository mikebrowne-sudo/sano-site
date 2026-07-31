// Pay run — the one clear screen for a fortnightly contractor pay cycle.
//
// Pick a pay period (1–15 → paid 30th; 16–EOM → paid 15th next month). See two
// blocks for that period: (1) authorised jobs grouped by contractor, ready to
// bundle into remittances in one click; (2) jobs completed in the period still
// AWAITING authorisation, approvable inline (each moves up into "ready to pay").
//
// Direct path: job → approved contractor_invoice → remittance (RA-####), without
// the intermediate STMT layer. Admin-only. Reuses the existing period, plan,
// approval + create logic — this screen just brings them together.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { recentPayPeriods, payPeriodForKey, payPeriodForDate } from '@/lib/contractor-pay-period'
import { loadApprovalRows, awaitingAuthorisation } from '@/lib/contractor-pay-approvals-data'
import { previewRemittancesForContractors } from '../remittances/_actions-by-contractor'
import { PayRunView } from './_components/PayRunView'

export const dynamic = 'force-dynamic'

export default async function PayRunPage({ searchParams }: { searchParams: { period?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const today = new Date().toISOString().slice(0, 10)
  const periods = recentPayPeriods(today, 6)
  const period = payPeriodForKey(searchParams.period) ?? periods[0] ?? payPeriodForDate(today)

  // "Ready to pay" — authorised, unremitted CIs grouped by contractor for jobs
  // whose service date falls in the period. Reuses the by-contractor planner.
  const allContractorIds = (await supabase.from('contractors').select('id')).data?.map((c) => c.id as string) ?? []
  const plan = await previewRemittancesForContractors(
    allContractorIds,
    period.payDate,
    { from: period.periodStart, to: period.periodEnd },
  )

  // "Awaiting authorisation" — completed jobs in the period with no approved
  // payable yet. Approvable inline; approving creates the CI which then appears
  // in the ready-to-pay block on refresh.
  const approvalRows = await loadApprovalRows(supabase, { from: period.periodStart, to: period.periodEnd })
  const awaiting = awaitingAuthorisation(approvalRows)

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/portal/contractor-invoices" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4">
        <ArrowLeft size={14} /> Contractor invoices
      </Link>
      <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-1">Pay run</h1>
      <p className="text-sm text-sage-500 mb-6 max-w-2xl">
        Pick the pay period, check nothing is still awaiting authorisation, then bundle everyone&rsquo;s authorised
        jobs into remittances. 1st–15th is paid on the 30th; 16th–end of month is paid on the 15th of the next month.
      </p>

      <PayRunView
        periods={periods.map((p) => ({ key: p.periodStart, label: p.label, payDateLabel: p.payDateLabel }))}
        selectedKey={period.periodStart}
        periodStart={period.periodStart}
        periodEnd={period.periodEnd}
        payDate={period.payDate}
        payDateLabel={period.payDateLabel}
        groups={plan.groups ?? []}
        grandTotal={plan.grand_total ?? 0}
        planError={plan.error ?? null}
        awaiting={awaiting}
      />
    </div>
  )
}
