'use server'

// RETIRED (Phase 1, 2026-08-17) — legacy pay-run remittance advice.
//
// This was the only writer to pay_run_remittances, the legacy RA-#### document
// table. It minted numbers from public.remittance_number_seq while the canonical
// contractor_remittances table mints from public.contractor_remittance_number_seq
// — two independent sequences, both formatting 'RA-' || lpad(...,4,'0'), with no
// cross-table uniqueness. Left live, the two would eventually issue the same RA
// number for different documents.
//
// The fix is structural rather than numeric: with this action stubbed, the
// DEFAULT dropped from pay_run_remittances.remittance_number, and an insert
// guard on the table, the legacy side can no longer mint an RA number by any
// path. One live minter means a collision is impossible, so no cross-table
// uniqueness trigger is needed. The canonical sequence is deliberately NOT
// advanced or reset — it is at RA-0027 and correct.
//
// Production check before retiring (2026-08-17): pay_run_remittances had 0 rows
// and remittance_number_seq had never been called (last_value 1, is_called
// false), so no legacy RA number was ever issued and none needs preserving.
//
// Canonical remittance advice lives in
// src/app/portal/contractor-invoices/_actions-send-remittance.ts and is
// unaffected.

const RETIRED_MESSAGE =
  'Legacy pay-run remittances are retired. Send remittance advice from the canonical remittance (/portal/contractor-invoices/remittances).'

/** RETIRED — no longer creates pay_run_remittances rows, RA numbers or emails. */
export async function sendRemittances() {
  return { error: RETIRED_MESSAGE }
}
