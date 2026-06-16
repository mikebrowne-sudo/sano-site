// Stage F — RETIRED route. The old "approved job hours waiting for a pay
// run" queue (job_workers.pay_status='approved' → pay_runs) is superseded by
// the contractor payables worklist. Any old links / bookmarks / revalidate
// targets land here and are forwarded to the canonical worklist, which
// enforces its own admin gate.

import { redirect } from 'next/navigation'

export default function ContractorPendingRetiredRedirect() {
  redirect('/portal/contractor-invoices/pending-approvals')
}
