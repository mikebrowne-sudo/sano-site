// RETIRED (Phase 1, 2026-08-17) — legacy contractor pay-run lifecycle buttons.
//
// Rendered Approve Pay Run / Mark Paid for a legacy contractor run. Both backing
// actions are stubbed and their writes are blocked in the database, so the
// buttons could only ever surface an error. The parent route redirects, making
// this unreachable.
//
// Kept as an inert stub rather than deleted so the retirement is visible in the
// tree and nothing dangles. Renders nothing.

export function PayRunActions() {
  return null
}
