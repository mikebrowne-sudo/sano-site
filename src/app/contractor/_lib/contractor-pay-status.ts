// Stage E — contractor-facing pay status resolver.
//
// Turns existing data (job completion + the contractor's own
// contractor_invoice + sent-remittance state) into one plain, contractor
// friendly label so a contractor can see where each completed job/payment
// is up to. Visibility only — no amounts, margins or internal financials
// are involved here, and the resolver is pure so it's trivially testable.
//
// Per-contractor by construction: the caller passes the contractor_invoice
// for THIS contractor + job (CIs are keyed by contractor_id + job_id), so
// two contractors on the same job resolve independently.

export type ContractorPayStatus =
  | 'scheduled'          // assigned, not completed yet
  | 'awaiting_approval'  // completed, no approved payable yet
  | 'approved_pending'   // approved payable exists, not paid/remitted
  | 'paid'               // payable paid, or in a sent remittance

export interface ContractorPayStatusInput {
  jobStatus: string | null
  jobCompletedAt: string | null
  /** contractor_invoice.status for THIS contractor + job: 'pending' | 'approved' | 'paid' | null (none). */
  invoiceStatus: string | null
  /** contractor_invoice.date_paid (set when marked paid). */
  invoiceDatePaid: string | null
  /** Whether this payable is on a remittance batch that has been marked PAID
   *  (paid_at set). A sent-but-unpaid remittance does NOT count as paid. */
  inPaidRemittance: boolean
}

export function getContractorPayStatus(input: ContractorPayStatusInput): ContractorPayStatus {
  const completed =
    input.jobStatus === 'completed' ||
    input.jobStatus === 'invoiced' ||
    !!input.jobCompletedAt

  if (!completed) return 'scheduled'

  const paid =
    input.invoiceStatus === 'paid' ||
    !!input.invoiceDatePaid ||
    input.inPaidRemittance
  if (paid) return 'paid'

  // An approved payable exists but isn't paid yet.
  if (input.invoiceStatus === 'approved') return 'approved_pending'

  // Completed with no payable yet, or a not-yet-approved (pending) one →
  // still waiting on Sano to approve pay.
  return 'awaiting_approval'
}

export interface ContractorPayStatusMeta {
  label: string
  /** Longer helper text for the detail screen. */
  help: string
  /** Tailwind chip classes (sage palette family). */
  chip: string
}

export const CONTRACTOR_PAY_STATUS_META: Record<ContractorPayStatus, ContractorPayStatusMeta> = {
  scheduled: {
    label: 'Scheduled',
    help: 'This job is assigned to you.',
    chip: 'bg-blue-50 text-blue-700',
  },
  awaiting_approval: {
    label: 'Awaiting Sano approval',
    help: 'Sano will review and approve your pay after the job is completed.',
    chip: 'bg-amber-50 text-amber-700',
  },
  approved_pending: {
    label: 'Approved — pending pay',
    help: 'Your pay has been approved and will be included in the next Sano remittance.',
    chip: 'bg-sage-100 text-sage-700',
  },
  paid: {
    label: 'Paid',
    help: 'This payment has been made.',
    chip: 'bg-emerald-50 text-emerald-700',
  },
}
