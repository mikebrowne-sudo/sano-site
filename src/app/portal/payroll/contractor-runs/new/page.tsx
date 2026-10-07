// RETIRED (Phase 1, 2026-08-17) — legacy "new contractor pay run" form.
//
// Creating a legacy contractor pay run wrote pay_runs (kind='contractor'),
// pay_run_items, and flipped job_workers.pay_status to 'included_in_pay_run' —
// a payment state the canonical flow neither writes nor reads. The backing
// action is stubbed and a DB trigger blocks the inserts, so this form has
// nothing left to submit to.
//
// Start a contractor pay cycle from Pay run instead.

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function NewLegacyContractorPayRunRetiredPage() {
  redirect('/portal/contractor-invoices/pay-run')
}
