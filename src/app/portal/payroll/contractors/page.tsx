// RETIRED — the one-click "Pay contractors" screen created a double-pay
// hazard: it paid contractors on a path that didn't share state with the
// canonical approve→remit flow (contractor-invoices/pending-approvals), so
// the same job could be paid twice. All contractor pay now routes through
// the canonical flow. This route permanently redirects there.
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function PayContractorsRetiredPage() {
  redirect('/portal/contractor-invoices/pending-approvals')
}
