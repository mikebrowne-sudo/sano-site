// Phase G.2 step 2 — pure helper that turns raw finance-page data
// into the row set for the "Jobs needing attention" widget on
// /portal/finance.
//
// The helper runs `reconcileJob` against every job in the period,
// keeps the single highest-severity flag per job, sorts the result
// hard → warning → info (then by job_number alphabetically for
// stable display), and caps at the widget's row budget.
//
// Pure: no DB calls, no React, no side effects. The route loads the
// raw rows once and hands them in.

import { reconcileJob, type ReconciliationFlag, type ReconciliationInput } from '@/lib/job-reconciliation'

const SEVERITY_RANK = { hard: 0, warning: 1, info: 2 } as const

export interface FinanceAttentionRow {
  jobId: string
  jobNumber: string | null
  clientName: string | null
  flag: ReconciliationFlag
  /** Count of *additional* flags beyond the primary one shown. */
  otherFlagCount: number
}

export interface FinanceAttentionJob {
  id: string
  job_number: string | null
  client_id: string | null
  job_price: number | null
  allowed_hours: number | null
  description: string | null
  scope_snapshot: unknown | null
  status: string
  invoice_id: string | null
  completed_at: string | null
  clients: { name: string | null } | null
  job_workers: ReadonlyArray<{
    contractor_id: string
    pay_rate: number | null
    approved_hours: number | null
    actual_hours: number | null
    hours_allocated: number | null
    pay_status: string | null
    approved_at: string | null
    contractors: { hourly_rate: number | null } | null
  }>
}

export interface FinanceAttentionInput {
  jobs: ReadonlyArray<FinanceAttentionJob>
  /** Per-job invoice totals (only required when `job.invoice_id` is set). */
  invoiceTotalById: ReadonlyMap<string, number>
  /** Rows from the contractor_invoices ledger keyed by `(job_id, contractor_id)`. */
  contractorInvoices: ReadonlyArray<{ job_id: string; contractor_id: string }>
  /** Rows from pay_run_items keyed by `(job_id, contractor_id)`. */
  payRunItems: ReadonlyArray<{ job_id: string; contractor_id: string }>
  /** Cap for the widget. Default 25. */
  limit?: number
  /** Reference "now" for date-threshold checks. Defaults to new Date(). */
  now?: Date
}

export interface FinanceAttentionResult {
  rows: FinanceAttentionRow[]
  /** Total issue-bearing jobs in the period before the row cap. */
  totalIssueCount: number
  /**
   * Counts of issue-bearing jobs grouped by their primary (highest-
   * severity) flag. Reflects the full period, not just the visible
   * row cap — used by the widget's summary line at the top.
   */
  severityCounts: {
    hard: number
    warning: number
    info: number
  }
}

export function buildFinanceAttentionRows(
  input: FinanceAttentionInput,
): FinanceAttentionResult {
  const limit = input.limit ?? 25
  const now = input.now ?? new Date()

  // Group the ledger rows by job_id once so each reconcileJob call
  // gets a slim per-job slice instead of scanning the full set.
  const ciByJobId = new Map<string, Array<{ job_id: string; contractor_id: string }>>()
  for (const ci of input.contractorInvoices) {
    const list = ciByJobId.get(ci.job_id)
    if (list) list.push(ci)
    else ciByJobId.set(ci.job_id, [ci])
  }
  const prByJobId = new Map<string, Array<{ job_id: string; contractor_id: string }>>()
  for (const pr of input.payRunItems) {
    const list = prByJobId.get(pr.job_id)
    if (list) list.push(pr)
    else prByJobId.set(pr.job_id, [pr])
  }

  const allRows: FinanceAttentionRow[] = []
  for (const job of input.jobs) {
    const workers = (job.job_workers ?? []).map((w) => ({
      contractor_id: w.contractor_id,
      pay_rate: w.pay_rate,
      contractor_hourly_rate: w.contractors?.hourly_rate ?? null,
      approved_hours: w.approved_hours,
      actual_hours: w.actual_hours,
      hours_allocated: w.hours_allocated,
      pay_status: w.pay_status,
      approved_at: w.approved_at ?? null,
    }))

    const invoiceTotal = job.invoice_id ? input.invoiceTotalById.get(job.invoice_id) ?? null : null

    const reconcileInput: ReconciliationInput = {
      job: {
        id: job.id,
        job_number: job.job_number,
        status: job.status,
        client_id: job.client_id,
        job_price: job.job_price,
        allowed_hours: job.allowed_hours,
        description: job.description,
        scope_snapshot: job.scope_snapshot,
        invoice_id: job.invoice_id,
        completed_at: job.completed_at,
      },
      workers,
      invoice: invoiceTotal != null ? { total: invoiceTotal } : null,
      contractorInvoices: ciByJobId.get(job.id) ?? [],
      payRunItems: prByJobId.get(job.id) ?? [],
      now,
    }

    const flags = reconcileJob(reconcileInput)
    if (flags.length === 0) continue

    // reconcileJob already returns flags in hard → warning → info
    // declaration order, so flags[0] is the highest-severity item.
    allRows.push({
      jobId: job.id,
      jobNumber: job.job_number,
      clientName: job.clients?.name ?? null,
      flag: flags[0],
      otherFlagCount: flags.length - 1,
    })
  }

  // Sort: hard → warning → info, then by job_number alphabetically
  // for stable, predictable display order within a severity bucket.
  allRows.sort((a, b) => {
    const sevDiff = SEVERITY_RANK[a.flag.severity] - SEVERITY_RANK[b.flag.severity]
    if (sevDiff !== 0) return sevDiff
    return (a.jobNumber ?? '').localeCompare(b.jobNumber ?? '')
  })

  // Count primary-flag severities across the full period (not just the
  // capped slice) so the widget's summary line stays accurate when the
  // row cap bites.
  const severityCounts = { hard: 0, warning: 0, info: 0 }
  for (const row of allRows) {
    severityCounts[row.flag.severity] += 1
  }

  return {
    rows: allRows.slice(0, limit),
    totalIssueCount: allRows.length,
    severityCounts,
  }
}
