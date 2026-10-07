// RETIRED (Phase 1, 2026-08-17) — legacy contractor pay-run list.
//
// The legacy track (pay_runs.kind='contractor' → pay_run_items →
// pay_run_remittances) was a second, unconnected way to record contractor
// payment. Contractor pay now runs solely through the canonical flow:
// job → approve → contractor_invoices → contractor_remittances.
//
// Production had 0 contractor-kind pay runs and 0 pay_run_items when this was
// retired, so there is no history behind this list and no archive view to
// preserve — the page would render an empty table. It redirects instead, the
// same treatment already given to /portal/payroll/contractors and
// /portal/payroll/contractor-pending.
//
// The employee pay-run list at /portal/payroll is a different page and is
// unaffected.

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function LegacyContractorPayRunsRetiredPage() {
  redirect('/portal/contractor-invoices/pay-run')
}
