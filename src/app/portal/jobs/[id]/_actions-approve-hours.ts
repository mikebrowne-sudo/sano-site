'use server'

// Stage F — RETIRED. The per-worker "Approve hours" path wrote
// job_workers.pay_status='approved', which fed a SEPARATE, conflicting
// contractor pay track (pay_runs / pay_run_items + the old
// /portal/payroll/contractor-pending queue).
//
// The canonical flow is `approveContractorPay`, which creates an approved
// contractor_invoice (payable) that flows into the contractor remittance
// batch builder. To stop the two tracks diverging, this action is disabled:
// it writes nothing and returns a message pointing at the new flow.
//
// Approve contractor pay from:
//   • Contractor invoices → Pending approvals
//     (/portal/contractor-invoices/pending-approvals), or
//   • the job page → Labour & Margin → Pay approvals (JobApprovePayButton).
//
// The export is kept (disabled) so nothing imports a missing symbol and the
// retirement is covered by a test.

export interface ApproveJobWorkerHoursInput {
  jobId: string
  contractorId: string
  note?: string | null
}

export async function approveJobWorkerHours(
  input: ApproveJobWorkerHoursInput,
): Promise<{ error: string }> {
  void input // retired no-op; kept for the disabled signature
  return {
    error:
      'Approving hours here has been retired. Approve contractor pay from Contractor invoices → Pending approvals, or the job’s Labour & Margin → Pay approvals.',
  }
}
