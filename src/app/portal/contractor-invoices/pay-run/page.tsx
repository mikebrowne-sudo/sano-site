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
import { recentPayPeriods, payPeriodForKey } from '@/lib/contractor-pay-period'
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

  // DEFAULT = "everything owed" (?period absent or 'all'). A period is an
  // OPTIONAL filter, not a gate.
  //
  // Why: filtering by service date hid real money. A payable whose date can't be
  // resolved (no job completed_at, no service_date, no gst_supply_date) matches
  // NO period, so it was unpayable from this screen and invisible on every
  // selection. Payables from different months also can't appear together, so a
  // period-first screen shows "one contractor" while several are owed. The job
  // here is "who do I owe?" — that question isn't period-scoped.
  const showAll = !searchParams.period || searchParams.period === 'all'
  const period = showAll ? null : (payPeriodForKey(searchParams.period) ?? null)

  // "Ready to pay" — authorised, unremitted CIs grouped by contractor.
  // splitByPeriod treats an empty filter as a no-op and returns everything
  // (undated included), so passing {} is the honest "all owed" query.
  const allContractorIds = (await supabase.from('contractors').select('id')).data?.map((c) => c.id as string) ?? []
  const payDate = period?.payDate ?? today
  const plan = await previewRemittancesForContractors(
    allContractorIds,
    payDate,
    period ? { from: period.periodStart, to: period.periodEnd } : {},
  )

  // "Awaiting authorisation" — completed jobs with no approved payable yet.
  // Unfiltered in all-owed mode so nothing sits unapproved out of view.
  const approvalRows = await loadApprovalRows(
    supabase,
    period ? { from: period.periodStart, to: period.periodEnd } : {},
  )
  const awaiting = awaitingAuthorisation(approvalRows)

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/portal/contractor-invoices" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4">
        <ArrowLeft size={14} /> Contractor invoices
      </Link>
      {/* Current | History — the two halves of the contractor pay workspace. */}
      <nav className="flex items-center gap-1 mb-5 text-sm">
        <span className="px-3 py-1.5 rounded-lg bg-sage-100 text-sage-800 font-semibold">Current pay</span>
        <Link
          href="/portal/contractor-invoices/remittances"
          className="px-3 py-1.5 rounded-lg text-sage-600 hover:bg-sage-50 hover:text-sage-800 transition-colors"
        >
          Payment history
        </Link>
      </nav>

      <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-1">Contractor pay</h1>
      <p className="text-sm text-sage-500 mb-6 max-w-2xl">
        Everything currently owed to contractors, and anything still waiting on approval.
        Approve what&rsquo;s outstanding, review who&rsquo;s owed what, then run the payment.
      </p>

      <PayRunView
        periods={periods.map((p) => ({ key: p.periodStart, label: p.label, payDateLabel: p.payDateLabel }))}
        selectedKey={period ? period.periodStart : 'all'}
        periodStart={period?.periodStart ?? null}
        periodEnd={period?.periodEnd ?? null}
        payDate={payDate}
        groups={plan.groups ?? []}
        grandTotal={plan.grand_total ?? 0}
        planError={plan.error ?? null}
        awaiting={awaiting}
      />
    </div>
  )
}
