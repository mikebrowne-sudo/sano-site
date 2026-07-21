'use server'

// RETIRED — the one-click "Pay contractor" action.
//
// This paid a contractor for all their completed jobs in a single action,
// creating a contractor pay run already in the PAID state. It did NOT share
// state with the canonical approve→remit flow
// (contractor-invoices/pending-approvals), so the same job could be paid on
// both paths — a double-pay hazard.
//
// The action is kept as a hard-stop stub (rather than deleted) so any
// residual caller fails safe instead of silently paying. All contractor pay
// now routes through the canonical approve→remit flow.

export async function payContractor(contractorId: string) {
  void contractorId // retired — signature kept for existing callers
  return {
    error:
      'One-click contractor pay has been retired. Approve and remit contractor pay from Pending pay approvals.',
  }
}
