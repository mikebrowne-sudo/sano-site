// RETIRED (Phase 1, 2026-08-17) — legacy "send remittances" button.
//
// Triggered the pay-run remittance action, the only writer to
// pay_run_remittances and the legacy RA-#### sequence. That action is stubbed
// and the table is write-blocked, so this button has nothing to call. The
// parent route redirects, making it unreachable.
//
// Canonical remittance advice is sent from
// /portal/contractor-invoices/remittances. Renders nothing.

export function SendRemittancesButton() {
  return null
}
