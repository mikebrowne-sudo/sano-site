'use server'

// RETIRED (Phase 2, 2026-08-17) — contractor statement generation.
//
// Contractor pay now runs through ONE process:
//   job -> approve -> contractor_invoices -> contractor_remittances  (Pay run)
//
// The statement layer (generate -> issue -> contractor confirms -> pay) was a
// parallel pipeline to the same destination. Pay run reaches the same remittance
// in fewer steps and without requiring the contractor to act, so statements are
// retired as an ACTIVE workflow. Existing statements remain readable.
//
// Production state when retired (2026-08-17):
//   contractor_statements ......... 4 rows, ALL status='draft'
//   issued_snapshot ............... 0 (never issued)
//   remittance_id ................. 0 (never linked to a payment)
//   statement notifications ....... 0 (no contractor was ever emailed)
//   contractor_invoices w/ statement_id ... 16, ALL already status='paid'
// So no statement ever reached a contractor, and no UNPAID payable is attached
// to one. Nothing is stranded by turning generation off.
//
// Stubbed rather than deleted so a direct server-side invocation fails closed
// instead of resolving to a missing export. The exported types are preserved so
// existing importers keep type-checking.
//
// NOT retired: the canonical path never depended on statements. Verified —
// Pay run, previewRemittancesForContractors and the remittance builders contain
// no statement reads, no status checks and no statement RPCs.

export interface GeneratePeriodInput {
  period_start: string
  period_end: string
}

export interface GenerateResult {
  error?: string
  created?: number
  refreshed?: number
  skipped?: Array<{ statement_number: string; status: string }>
  drafts?: number
  linked_cis?: number
}

const RETIRED_MESSAGE =
  'Contractor statements are retired. Pay contractors from Pay run (/portal/contractor-invoices/pay-run) — approved payables become a remittance directly.'

/** RETIRED — no longer creates contractor_statements or links payables to them. */
export async function generateDraftStatements(): Promise<GenerateResult> {
  return { error: RETIRED_MESSAGE }
}
