'use server'

// RETIRED (Phase 2, 2026-08-17) — contractor statement confirmation.
//
// Contractors previously had to confirm a statement before it could be paid.
// That gate is gone: approved work becomes a remittance and is paid directly,
// so there is nothing for a contractor to confirm.
//
// Stubbed rather than deleted so a direct invocation (stale bundle, replayed
// POST) fails closed. The confirm_statement_as_contractor RPC is left in the
// database untouched — it has no caller.

const RETIRED_MESSAGE =
  'Payment statements no longer need confirming. Your pay is processed directly — nothing is required from you.'

/** RETIRED — contractors no longer confirm statements to be paid. */
export async function confirmMyStatement(): Promise<{ ok?: true; error?: string }> {
  return { error: RETIRED_MESSAGE }
}
