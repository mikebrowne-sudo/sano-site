// RETIRED (Phase 2, 2026-08-17) — statement bulk workflow panel.
//
// Drove "issue all ready", "process payments", "mark remittances paid" and
// "send advice" — the statement-first way to move contractor money, parallel to
// Pay run. All backing actions are stubbed.
//
// Marking paid and sending advice still exist on the canonical remittance
// screens (/portal/contractor-invoices/remittances); only this entry point is
// gone.
//
// Kept as an inert stub rather than deleted so the retirement is visible in the
// tree and nothing dangles. Renders nothing.

export function WorkflowPanel() {
  return null
}
