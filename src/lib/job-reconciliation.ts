// Phase G.2 — job reconciliation helpers.
//
// Pure functions that turn a job + its workers + linked invoice /
// contractor-invoice / pay-run state into a flat list of
// ReconciliationFlag entries describing what needs cleanup before the
// job is ready to invoice or report on.
//
// Consumers (planned for Phase G.2 steps 2–4):
//   - <JobReadyToInvoice> on /portal/jobs/[id]
//   - Jobs needing attention widget on /portal/finance
//   - Future reporting / reconciliation surfaces
//
// Hard rules:
//   - Pure functions only. No DB calls, no fetches, no React, no
//     server actions, no side effects.
//   - Signal-not-gate. These flags do NOT block conversion. The
//     existing Phase D job_settings gates remain authoritative for
//     `createInvoiceFromJob` and related flows.
//   - Thresholds are hardcoded for Phase G.2 with TODO comments so
//     a future settings layer (Phase L+) can move them into
//     `job_settings`.
//   - Messages are short, admin-friendly, and free of UI jargon.

import { getJobLabourCost, type JobWorkerCostInput } from '@/lib/job-cost'

// ─────────────────────────────────────────────────────────────────────
// Thresholds (Phase G.2 — hardcoded constants)
// ─────────────────────────────────────────────────────────────────────

// TODO: surface in settings (Phase L+).
const DEFAULT_HOURS_VARIANCE_THRESHOLD = 0.2 // 20% over allowed
// TODO: surface in settings (Phase L+).
const DEFAULT_COMPLETED_NOT_INVOICED_DAYS = 7
// TODO: surface in settings (Phase L+).
const DEFAULT_APPROVED_NOT_IN_PAY_RUN_DAYS = 14
// TODO: surface in settings (Phase L+).
const DEFAULT_LOW_MARGIN_THRESHOLD = 0.1 // 10%
// Tolerance for invoice-total vs job-price comparison (±1¢).
const INVOICE_PRICE_TOLERANCE = 0.01

// ─────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────

export type ReconciliationSeverity = 'hard' | 'warning' | 'info'

export interface ReconciliationFlag {
  /** Stable kebab-case identifier — keyed for deduping + i18n later. */
  flag: string
  severity: ReconciliationSeverity
  /** Short admin-friendly one-liner. */
  message: string
  /** Optional verb-led hint, e.g. "Set job price". */
  suggestedAction?: string
  /** Optional deep link to the page where the issue is fixable. */
  href?: string
}

export interface ReconciliationJobInput {
  id: string
  job_number?: string | null
  /**
   * Job lifecycle status — drives whether soft warnings apply.
   * Hard blocks apply at every status; warnings about hours / pay /
   * invoicing only apply once the job is `completed` or `invoiced`.
   */
  status: string
  client_id: string | null
  job_price: number | null
  allowed_hours: number | null
  description: string | null
  /** `jobs.scope_snapshot` jsonb — null check only; structure irrelevant here. */
  scope_snapshot: unknown | null
  invoice_id: string | null
  completed_at: string | null
}

export interface ReconciliationWorkerInput extends JobWorkerCostInput {
  contractor_id: string
  /** 'pending' | 'approved' | 'included_in_pay_run' | 'paid' — DB CHECK enum. */
  pay_status: string | null
  /** ISO timestamp; only meaningful when pay_status >= 'approved'. */
  approved_at?: string | null
}

/** Cross-ledger reference for the convergence flag. */
export interface ReconciliationLedgerRef {
  job_id: string
  contractor_id: string
}

export interface ReconciliationInput {
  job: ReconciliationJobInput
  workers: ReconciliationWorkerInput[]
  /** Pre-computed invoice total. Pass when an invoice exists on the job. */
  invoice?: { total: number | null } | null
  /** Rows from the contractor-invoices ledger (existing surface). */
  contractorInvoices?: ReconciliationLedgerRef[]
  /** Rows from pay_run_items (Phase E pay-run pipeline). */
  payRunItems?: ReconciliationLedgerRef[]
  /**
   * Reference "now" for date-threshold checks. Defaults to new Date()
   * in production; tests pass a fixed value to make threshold maths
   * deterministic.
   */
  now?: Date
}

// ─────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────

function daysBetween(later: Date, earlier: string | Date): number {
  const earlierMs = (typeof earlier === 'string' ? new Date(earlier) : earlier).getTime()
  return (later.getTime() - earlierMs) / (1000 * 60 * 60 * 24)
}

function isPostExecution(status: string): boolean {
  return status === 'completed' || status === 'invoiced'
}

function getAllowedForWorker(
  worker: ReconciliationWorkerInput,
  job: ReconciliationJobInput,
  workerCount: number,
): number | null {
  // Per Phase G implementation spec section 13 Q4: prefer the per-worker
  // hours_allocated; fall back to jobs.allowed_hours split across the
  // current worker set.
  if (worker.hours_allocated != null) return worker.hours_allocated
  if (job.allowed_hours != null && workerCount > 0) {
    return job.allowed_hours / workerCount
  }
  return null
}

function getPayableHoursForWorker(worker: ReconciliationWorkerInput): number | null {
  if (worker.approved_hours != null) return worker.approved_hours
  if (worker.actual_hours != null) return worker.actual_hours
  return null
}

// ─────────────────────────────────────────────────────────────────────
// HARD flags — broken financial data
// ─────────────────────────────────────────────────────────────────────

export function flagNoClient(input: ReconciliationInput): ReconciliationFlag | null {
  if (input.job.client_id != null && input.job.client_id !== '') return null
  return {
    flag: 'no-client',
    severity: 'hard',
    message: 'No client linked',
    suggestedAction: 'Link client',
    href: `/portal/jobs/${input.job.id}/edit`,
  }
}

export function flagNoScope(input: ReconciliationInput): ReconciliationFlag | null {
  const hasDescription = !!(input.job.description && input.job.description.trim() !== '')
  const hasScopeSnapshot = input.job.scope_snapshot != null
  if (hasDescription || hasScopeSnapshot) return null
  return {
    flag: 'no-scope',
    severity: 'hard',
    message: 'No job scope captured',
    suggestedAction: 'Add scope',
    href: `/portal/jobs/${input.job.id}/edit`,
  }
}

export function flagNoJobPrice(input: ReconciliationInput): ReconciliationFlag | null {
  const p = input.job.job_price
  if (p != null && Number.isFinite(p) && p > 0) return null
  return {
    flag: 'no-job-price',
    severity: 'hard',
    message: 'No job price set',
    suggestedAction: 'Set job price',
    href: `/portal/jobs/${input.job.id}/edit`,
  }
}

export function flagContractorMissingRate(
  input: ReconciliationInput,
): ReconciliationFlag | null {
  if (input.workers.length === 0) return null
  const missing = input.workers.filter(
    (w) => w.pay_rate == null && w.contractor_hourly_rate == null,
  )
  if (missing.length === 0) return null
  const message =
    missing.length === input.workers.length
      ? 'Contractor has no usable rate'
      : `${missing.length} of ${input.workers.length} workers have no usable rate`
  return {
    flag: 'contractor-missing-rate',
    severity: 'hard',
    message,
    suggestedAction: 'Set hourly rate on contractor profile',
    href: `/portal/jobs/${input.job.id}`,
  }
}

// ─────────────────────────────────────────────────────────────────────
// WARNING flags — incomplete management data
// ─────────────────────────────────────────────────────────────────────

export function flagActualHoursMissing(input: ReconciliationInput): ReconciliationFlag | null {
  if (!isPostExecution(input.job.status)) return null
  if (input.workers.length === 0) return null
  const missing = input.workers.filter((w) => w.actual_hours == null)
  if (missing.length === 0) return null
  return {
    flag: 'actual-hours-missing',
    severity: 'warning',
    message:
      missing.length === input.workers.length
        ? 'Actual hours not recorded'
        : `Actual hours missing for ${missing.length} of ${input.workers.length} workers`,
    suggestedAction: 'Enter actual hours',
    href: `/portal/jobs/${input.job.id}`,
  }
}

export function flagApprovedHoursMissing(
  input: ReconciliationInput,
): ReconciliationFlag | null {
  if (!isPostExecution(input.job.status)) return null
  if (input.workers.length === 0) return null
  const missing = input.workers.filter((w) => w.approved_hours == null)
  if (missing.length === 0) return null
  return {
    flag: 'approved-hours-missing',
    severity: 'warning',
    message:
      missing.length === input.workers.length
        ? 'Approved payable hours missing'
        : `Approved hours missing for ${missing.length} of ${input.workers.length} workers`,
    suggestedAction: 'Open pay approvals',
    href: `/portal/jobs/${input.job.id}`,
  }
}

export function flagHoursOverAllowed(
  input: ReconciliationInput,
  threshold: number = DEFAULT_HOURS_VARIANCE_THRESHOLD,
): ReconciliationFlag | null {
  if (input.workers.length === 0) return null
  let worstOverPct = 0
  for (const w of input.workers) {
    const allowed = getAllowedForWorker(w, input.job, input.workers.length)
    const payable = getPayableHoursForWorker(w)
    if (allowed == null || payable == null || allowed <= 0) continue
    const overPct = (payable - allowed) / allowed
    if (overPct > worstOverPct) worstOverPct = overPct
  }
  if (worstOverPct <= threshold) return null
  const pctDisplay = Math.round(worstOverPct * 100)
  return {
    flag: 'hours-over-allowed',
    severity: 'warning',
    message: `Hours exceed allowed by ${pctDisplay}%`,
    suggestedAction: 'Review actuals',
    href: `/portal/jobs/${input.job.id}`,
  }
}

export function flagCompletedNotInvoiced(
  input: ReconciliationInput,
  daysThreshold: number = DEFAULT_COMPLETED_NOT_INVOICED_DAYS,
): ReconciliationFlag | null {
  if (input.job.status !== 'completed') return null
  if (input.job.invoice_id != null) return null
  if (input.job.completed_at == null) return null
  const now = input.now ?? new Date()
  const days = daysBetween(now, input.job.completed_at)
  if (days < daysThreshold) return null
  return {
    flag: 'completed-not-invoiced',
    severity: 'warning',
    message: `Completed ${Math.floor(days)} days ago, not invoiced`,
    suggestedAction: 'Convert to invoice',
    href: `/portal/jobs/${input.job.id}`,
  }
}

export function flagInvoiceTotalDiffersFromPrice(
  input: ReconciliationInput,
): ReconciliationFlag | null {
  const invoice = input.invoice
  if (!invoice || invoice.total == null) return null
  if (input.job.job_price == null) return null
  const diff = Math.abs(invoice.total - input.job.job_price)
  if (diff <= INVOICE_PRICE_TOLERANCE) return null
  return {
    flag: 'invoice-total-differs',
    severity: 'warning',
    message: 'Invoice total differs from job price',
    suggestedAction: 'Reconcile invoice or job price',
    href: input.job.invoice_id ? `/portal/invoices/${input.job.invoice_id}` : `/portal/jobs/${input.job.id}`,
  }
}

export function flagLowMargin(
  input: ReconciliationInput,
  threshold: number = DEFAULT_LOW_MARGIN_THRESHOLD,
): ReconciliationFlag | null {
  const price = input.job.job_price
  if (price == null || price <= 0) return null
  const labour = getJobLabourCost(input.workers)
  // Only meaningful once we have a labour cost — a job with no hours
  // captured shouldn't fire a low-margin flag prematurely.
  if (labour <= 0) return null
  const margin = (price - labour) / price
  if (margin >= threshold) return null
  const pctDisplay = Math.round(margin * 100)
  return {
    flag: 'low-margin',
    severity: 'warning',
    message: margin < 0 ? `Negative margin (${pctDisplay}%)` : `Low margin (${pctDisplay}%)`,
    suggestedAction: 'Review labour cost or pricing',
    href: `/portal/jobs/${input.job.id}`,
  }
}

export function flagPayNotApproved(input: ReconciliationInput): ReconciliationFlag | null {
  if (!isPostExecution(input.job.status)) return null
  if (input.workers.length === 0) return null
  const notApproved = input.workers.filter(
    (w) => w.pay_status == null || w.pay_status === 'pending',
  )
  if (notApproved.length === 0) return null
  return {
    flag: 'pay-not-approved',
    severity: 'warning',
    message:
      notApproved.length === input.workers.length
        ? 'Contractor pay not approved'
        : `Pay not approved for ${notApproved.length} of ${input.workers.length} workers`,
    suggestedAction: 'Open pay approvals',
    href: `/portal/jobs/${input.job.id}`,
  }
}

export function flagApprovedNotInPayRun(
  input: ReconciliationInput,
  daysThreshold: number = DEFAULT_APPROVED_NOT_IN_PAY_RUN_DAYS,
): ReconciliationFlag | null {
  if (input.workers.length === 0) return null
  const now = input.now ?? new Date()
  const stalled = input.workers.filter((w) => {
    if (w.pay_status !== 'approved') return false
    if (!w.approved_at) return false
    return daysBetween(now, w.approved_at) >= daysThreshold
  })
  if (stalled.length === 0) return null
  return {
    flag: 'approved-not-in-pay-run',
    severity: 'warning',
    message:
      stalled.length === input.workers.length
        ? `Approved hours waiting for a pay run`
        : `Approved hours waiting for a pay run (${stalled.length} of ${input.workers.length})`,
    suggestedAction: 'Add to a contractor pay run',
    href: `/portal/payroll/contractor-pending`,
  }
}

// ─────────────────────────────────────────────────────────────────────
// INFO flags — visibility, not problems
// ─────────────────────────────────────────────────────────────────────

export function flagContractorInvoiceAndPayRunBoth(
  input: ReconciliationInput,
): ReconciliationFlag | null {
  const ciRows = input.contractorInvoices ?? []
  const prRows = input.payRunItems ?? []
  if (ciRows.length === 0 || prRows.length === 0) return null
  const ciKeys = new Set(ciRows.map((r) => `${r.job_id}:${r.contractor_id}`))
  const overlap = prRows.some((r) => ciKeys.has(`${r.job_id}:${r.contractor_id}`))
  if (!overlap) return null
  return {
    flag: 'contractor-invoice-and-pay-run',
    severity: 'info',
    message: 'Contractor invoice and pay-run data both exist',
    suggestedAction: 'Review payment paths',
    href: `/portal/jobs/${input.job.id}`,
  }
}

// ─────────────────────────────────────────────────────────────────────
// Aggregator
// ─────────────────────────────────────────────────────────────────────

/**
 * Run every flag helper and return the non-null results.
 *
 * Order is deterministic:
 *   1. Hard flags (declaration order)
 *   2. Warning flags (declaration order)
 *   3. Info flags (declaration order)
 *
 * Consumers can use the order directly (e.g. the Ready-to-invoice
 * panel renders top-down) or partition by severity.
 */
export function reconcileJob(input: ReconciliationInput): ReconciliationFlag[] {
  const result: ReconciliationFlag[] = []
  const checks = [
    // Hard
    flagNoClient,
    flagNoScope,
    flagNoJobPrice,
    flagContractorMissingRate,
    // Warning
    flagActualHoursMissing,
    flagApprovedHoursMissing,
    flagHoursOverAllowed,
    flagCompletedNotInvoiced,
    flagInvoiceTotalDiffersFromPrice,
    flagLowMargin,
    flagPayNotApproved,
    flagApprovedNotInPayRun,
    // Info
    flagContractorInvoiceAndPayRunBoth,
  ] as const
  for (const check of checks) {
    const flag = check(input)
    if (flag) result.push(flag)
  }
  return result
}
