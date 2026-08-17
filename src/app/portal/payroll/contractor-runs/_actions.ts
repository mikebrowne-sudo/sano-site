'use server'

// RETIRED (Phase 1, 2026-08-17) — the legacy contractor pay-run track.
//
// This flow (pay_runs.kind='contractor' → pay_run_items → pay_run_remittances)
// was a SECOND, unconnected way to record that a contractor had been paid. The
// canonical flow is:
//
//   job → approveContractorPay → contractor_invoices → contractor_remittances
//
// Two live write paths to "this contractor was paid" is a double-pay hazard —
// the same class of bug that already retired /portal/payroll/contractors and
// /portal/payroll/contractor-pending. This track additionally wrote
// job_workers.pay_status ('included_in_pay_run' on create, 'paid' on mark-paid),
// a state the canonical flow does not use and must not depend on.
//
// Production check before retiring (2026-08-17): 0 pay_runs with
// kind='contractor', 0 pay_run_items, 0 pay_run_remittances, and 0 job_workers
// in 'included_in_pay_run'/'paid'. The track was never used for real pay, so
// there is no history to preserve and nothing to migrate.
//
// These actions are stubbed rather than deleted so that any direct server-side
// invocation (a stale client bundle, a bookmarked form POST, a replayed request)
// fails closed instead of resolving to a missing export. A matching DB trigger
// blocks the same writes at the database level — see
// docs/db/2026-08-17-retire-legacy-contractor-payruns.sql — so neither layer is
// load-bearing on its own.
//
// Employee payroll (pay_runs.kind='employee' → pay_run_lines → payslips → IRD)
// is deliberately untouched and continues to run through
// src/app/portal/payroll/_actions.ts.

const RETIRED_MESSAGE =
  'Legacy contractor pay runs are retired. Pay contractors from Pay run (/portal/contractor-invoices/pay-run), which creates the canonical contractor invoice and remittance.'

export interface CreateContractorPayRunInput {
  period_start: string  // YYYY-MM-DD
  period_end: string    // YYYY-MM-DD
  notes?: string | null
}

// Each stub keeps the original export name and return shape so any surviving
// caller (stale bundle, replayed POST) type-checks and fails closed. Parameters
// are dropped rather than prefixed — callers pass arguments regardless, and an
// unused named parameter trips the repo's lint (errors fail the Netlify build).

/** RETIRED — no longer creates pay_runs / pay_run_items / job_workers state. */
export async function createContractorPayRun(): Promise<{ ok: true; payRunId: string } | { error: string }> {
  return { error: RETIRED_MESSAGE }
}

/** RETIRED — no longer approves legacy contractor pay runs. */
export async function approveContractorPayRun() {
  return { error: RETIRED_MESSAGE }
}

/** RETIRED — no longer marks legacy runs paid or writes job_workers.pay_status. */
export async function markContractorPayRunPaid() {
  return { error: RETIRED_MESSAGE }
}

/** RETIRED — the new-pay-run form is gone; this fails closed if replayed. */
export async function submitNewContractorPayRun(): Promise<{ error: string } | void> {
  return { error: RETIRED_MESSAGE }
}
