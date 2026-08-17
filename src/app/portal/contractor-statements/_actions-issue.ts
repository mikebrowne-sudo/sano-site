'use server'

// RETIRED (Phase 2, 2026-08-17) — statement issue + issue-email resend.
//
// Issuing froze an immutable issued_snapshot, flipped draft -> issued, set a
// review deadline and emailed the contractor asking them to review and confirm
// before payment. Pay run pays approved payables directly, so that review gate
// is no longer part of paying anyone.
//
// This is the action that generated contractor-facing email. In production it
// was never used: 0 statements carry an issued_snapshot and 0 statement
// notifications exist, so no contractor has ever received one. Retiring it
// sends nothing and un-sends nothing.
//
// Stubbed rather than deleted so direct invocation fails closed. IssueResult is
// preserved so existing importers keep type-checking.
//
// Canonical remittance advice (sent AFTER payment, no action required from the
// contractor) is unaffected:
//   src/app/portal/contractor-invoices/_actions-send-remittance.ts

export interface IssueResult {
  ok?: true
  error?: string
  statement_number?: string
  emailed?: boolean
  email_error?: string
}

const RETIRED_MESSAGE =
  'Contractor statements are retired. Payment no longer requires a statement to be issued or confirmed — pay from Pay run (/portal/contractor-invoices/pay-run).'

/** RETIRED — no longer issues statements, freezes snapshots or emails contractors. */
export async function issueContractorStatement(): Promise<IssueResult> {
  return { error: RETIRED_MESSAGE }
}

/** RETIRED — no longer resends statement issue emails. */
export async function resendStatementIssueEmail(): Promise<IssueResult> {
  return { error: RETIRED_MESSAGE }
}
