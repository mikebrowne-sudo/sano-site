// RETIRED (Phase 1, 2026-08-17) — legacy contractor pay-run detail.
//
// Held the draft → approve → mark-paid lifecycle plus "send remittances" for a
// legacy contractor run. All of those actions are stubbed and their writes are
// blocked at the database level.
//
// Production had 0 contractor-kind pay runs when this was retired, so no id can
// resolve to real legacy data and no read-only archive is warranted. Redirects
// to the canonical pay-run screen.
//
// The employee pay-run detail at /portal/payroll/[id] is a different route and
// is unaffected.

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function LegacyContractorPayRunDetailRetiredPage() {
  redirect('/portal/contractor-invoices/pay-run')
}
