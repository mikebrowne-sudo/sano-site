'use server'

// RETIRED (Phase 2, 2026-08-17) — statement supersede.
//
// Supersede was the correction path for an ISSUED statement: stamp it
// superseded, release its payables, and let a regenerated statement take its
// place. It only ever applied to statements past 'draft'.
//
// Production has 0 issued statements, so there is nothing supersedable. With
// generation and issue both retired, no new statement can reach a state where
// supersede would apply.
//
// The supersede_contractor_statement RPC stays in the database untouched — it
// is atomic and audited, and remains available for a one-off manual correction
// if a historical record ever needs one. It simply has no caller in the app.
//
// Stubbed rather than deleted so direct invocation fails closed. SupersedeResult
// is preserved so existing importers keep type-checking.

export interface SupersedeResult {
  ok?: true
  error?: string
  statement_number?: string
  released_cis?: number
}

const RETIRED_MESSAGE =
  'Contractor statements are retired. There is no active statement workflow to supersede.'

/** RETIRED — no longer supersedes statements as part of an active workflow. */
export async function supersedeContractorStatement(): Promise<SupersedeResult> {
  return { error: RETIRED_MESSAGE }
}
