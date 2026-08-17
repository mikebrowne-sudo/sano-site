// Contractor pay — the operational workspace for one contractor pay cycle.
//
// Three stages, in the order the money moves:
//   1. AWAITING PAYMENT   remittances already prepared, bank transfer not done
//   2. READY TO PAY       approved payables not yet on a remittance
//   3. AWAITING APPROVAL  completed jobs whose pay still needs authorising
//
// Stage 1 exists because stages 2 and 3 alone were misleading: once payables
// are bundled into a remittance they correctly leave "ready to pay", and the
// money then had nowhere to show. A prepared run could be forgotten entirely
// (the July run, RA-0024..RA-0027 / $3,890, sat unpaid and invisible here).
//
// Direct path: job → approved contractor_invoice → remittance (RA-####), with
// no statement layer. Admin-only. Reuses the existing period, plan, approval,
// create and mark-paid logic — this screen brings them together.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PortalPageHeader } from '../../_components/PortalPageHeader'
import { buttonClasses } from '../../_components/Button'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { recentPayPeriods, payPeriodForKey } from '@/lib/contractor-pay-period'
import { loadApprovalRows, awaitingAuthorisation } from '@/lib/contractor-pay-approvals-data'
import { loadAwaitingPayment } from '@/lib/awaiting-payment-data'
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
  // The period drives the SUGGESTED SELECTION, not what is loaded.
  //
  // It used to filter the plan server-side, which meant choosing "16-31 Jul"
  // physically removed May and June work from the page — so overdue backlog
  // silently disappeared instead of being offered as "Older unpaid". The
  // question a pay period answers is "what should normally be paid in this
  // run?", not "hide everything else".
  //
  // So the plan is ALWAYS everything owed, and the period is passed to the
  // view where lib/pay-run-selection.ts decides what is ticked by default.
  const period = payPeriodForKey(searchParams.period) ?? null

  // "Ready to pay" — authorised, unremitted CIs grouped by contractor.
  // ALWAYS everything owed: `{}` makes splitByPeriod a no-op so nothing is
  // hidden, including undated payables. The period only tints what is ticked.
  const allContractorIds = (await supabase.from('contractors').select('id')).data?.map((c) => c.id as string) ?? []
  const payDate = period?.payDate ?? today
  const plan = await previewRemittancesForContractors(allContractorIds, payDate, {})

  // "Awaiting authorisation" — completed jobs with no approved payable yet.
  // Also unfiltered: unapproved work is a backlog, not a per-period concern,
  // and hiding it behind a period is how it gets forgotten.
  const approvalRows = await loadApprovalRows(supabase, {})
  const awaiting = awaitingAuthorisation(approvalRows)

  // "Awaiting payment" — remittances already created but not yet paid out.
  // Deliberately NOT period-filtered: a prepared-but-unpaid run is an
  // obligation regardless of which period is being viewed, and hiding it
  // behind a filter is what let the July run ($3,890) be forgotten.
  const awaitingPayment = await loadAwaitingPayment(supabase)

  return (
    <div className="max-w-5xl">
      <PortalPageHeader
        backHref="/portal/pay"
        backLabel="Back to pay"
        title="Contractor pay"
        subtitle="Awaiting payment · Ready to pay · Awaiting approval"
        actions={
          <Link href="/portal/contractor-invoices/remittances" className={buttonClasses({ variant: 'secondary' })}>
            Payment history
          </Link>
        }
      />

      <PayRunView
        periods={periods.map((p) => ({ key: p.periodStart, label: p.label, payDateLabel: p.payDateLabel }))}
        selectedKey={period ? period.periodStart : 'all'}
        periodStart={period?.periodStart ?? null}
        periodEnd={period?.periodEnd ?? null}
        payDate={payDate}
        groups={plan.groups ?? []}
        planError={plan.error ?? null}
        awaiting={awaiting}
        awaitingPayment={awaitingPayment}
      />
    </div>
  )
}
