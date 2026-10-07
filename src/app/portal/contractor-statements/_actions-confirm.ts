'use server'

// RETIRED (Phase 2, 2026-08-17) — staff-side statement confirmation.
//
// confirmStatementOnBehalf was the exception tool for confirming a statement
// for a contractor who hadn't responded; extendReviewDeadline pushed out the
// review window. Both existed to service a review-then-pay gate that no longer
// stands between approved work and payment.
//
// Contractor confirmation is no longer required for payment, so nothing is left
// to confirm or extend. The underlying RPCs (confirm_statement_on_behalf,
// statement_confirmation_block) are left in the database untouched for the
// historical records they already stamped — they simply have no caller.
//
// Stubbed rather than deleted so direct invocation fails closed.

const RETIRED_MESSAGE =
  'Contractor statements are retired. Contractor confirmation is no longer part of paying anyone — pay from Pay run (/portal/contractor-invoices/pay-run).'

/** RETIRED — no longer confirms a statement on a contractor's behalf. */
export async function confirmStatementOnBehalf(): Promise<{ ok?: true; error?: string }> {
  return { error: RETIRED_MESSAGE }
}

/** RETIRED — no longer extends statement review deadlines. */
export async function extendReviewDeadline(): Promise<{ ok?: true; error?: string }> {
  return { error: RETIRED_MESSAGE }
}
