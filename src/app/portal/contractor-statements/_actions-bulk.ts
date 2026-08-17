'use server'

// RETIRED (Phase 2, 2026-08-17) — the statement bulk workflow.
//
// This file drove the whole statement-based pay cycle: preview + issue every
// ready statement, then turn each into a remittance via the
// create_remittance_from_statement RPC, mark those remittances paid, and send
// the advice. It was the second way to move contractor money, in parallel with
// Pay run.
//
// All six actions are stubbed. Two of them (markRemittancesPaid,
// sendRemittanceAdvice) operated on remittance ids rather than statements, but
// they were reachable ONLY from the statement WorkflowPanel, which is gone.
// Their canonical equivalents already exist and are unaffected:
//   mark paid  -> src/app/portal/contractor-invoices/_actions-remittance-paid.ts
//   send advice-> src/app/portal/contractor-invoices/_actions-send-remittance.ts
// So no payment capability is lost — only this entry point to it.
//
// PAYMENT TRUTH IS UNCHANGED. paid_at still means "staff stamped it paid" and
// payment_confirmed still means "matched to a real bank debit" via
// remittance_payment_allocations. Nothing here ever set payment_confirmed and
// nothing now does; bank confirmation remains the reconciliation screen's job
// (/portal/finance/reconcile-out), which is untouched.
//
// Stubbed rather than deleted so direct invocation fails closed. Exported types
// are preserved so existing importers keep type-checking.

export interface Period { period_start: string; period_end: string }
export interface BulkItem { id: string; label: string; ok: boolean; reason?: string }
export interface BulkResult {
  ok?: true
  error?: string
  processed: number
  skipped: number
  needs_attention: number
  items: BulkItem[]
}
export interface IssuePreview {
  count: number
  total: number
  empty: number
  gst_review_lines: number
  carried_lines: number
}
export interface PayPreviewItem {
  statement_number: string
  contractor_name: string | null
  total: number
  ready: boolean
  reason?: string
}
export interface PayPreview {
  count: number
  total: number
  ready: number
  blocked: number
  items: PayPreviewItem[]
}

const RETIRED_MESSAGE =
  'Contractor statements are retired. Pay contractors from Pay run (/portal/contractor-invoices/pay-run) — approved payables become a remittance directly.'

const retiredBulk = (): BulkResult => ({
  error: RETIRED_MESSAGE,
  processed: 0,
  skipped: 0,
  needs_attention: 0,
  items: [],
})

/** RETIRED — no longer previews bulk issue. */
export async function previewIssueAll(): Promise<{ error?: string } & Partial<IssuePreview>> {
  return { error: RETIRED_MESSAGE }
}

/** RETIRED — no longer bulk-issues statements or emails contractors. */
export async function issueAllReadyStatements(): Promise<BulkResult> {
  return retiredBulk()
}

/** RETIRED — no longer previews statement-driven payments. */
export async function previewProcessPayments(): Promise<{ error?: string } & Partial<PayPreview>> {
  return { error: RETIRED_MESSAGE }
}

/** RETIRED — no longer creates remittances from statements. */
export async function processReadyPayments(): Promise<BulkResult> {
  return retiredBulk()
}

/** RETIRED — mark remittances paid from /portal/contractor-invoices/remittances instead. */
export async function markRemittancesPaid(): Promise<BulkResult> {
  return retiredBulk()
}

/** RETIRED — send remittance advice from /portal/contractor-invoices/remittances instead. */
export async function sendRemittanceAdvice(): Promise<BulkResult> {
  return retiredBulk()
}
