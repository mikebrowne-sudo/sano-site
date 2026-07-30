// Per-job margin — one source of truth, shared by the jobs list, the finance
// job-margins report and (the existing) job detail page. Labour-based gross
// margin: job price − labour cost − ACC, via the canonical calculateVariance.
// No materials/expenses are subtracted (labour-based, matching the job page).
//
// Pure compute (computeJobMargin) + a batched server loader (loadJobMargins) so
// a list can cost many jobs in one round-trip. Admin/finance-gated at the caller.

import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateVariance, type WorkerInput } from './labour-calc'

/** The margin figures for a single job — the numbers a UI/report displays. */
export interface JobMargin {
  /** Client price for the job (job_price). */
  jobPrice: number
  /** Labour cost (allowed-hours basis, incl. any approved extra hours). */
  labourCost: number
  /** ACC on-cost included in the margin. */
  accCost: number
  /** Gross profit = price − labour − ACC. Can be negative. */
  grossProfit: number
  /** Margin as a percentage of price (0 when price is 0). */
  marginPercent: number
  /** True when there are approved extra hours (actual differs from estimate). */
  hasAdjustment: boolean
}

/**
 * Compute one job's labour-based gross margin. Uses the ACTUAL basis (allowed +
 * approved extra hours) so the figure reflects what the job really cost — the
 * same "with adjustment" number the job page shows when extra hours were signed
 * off. Falls back to the estimate when there are no approved extras.
 */
export function computeJobMargin(
  jobPrice: number | null,
  allowedHours: number | null,
  workers: WorkerInput[],
): JobMargin {
  const price = jobPrice ?? 0
  const v = calculateVariance(price, allowedHours, workers)
  const hasAdjustment = workers.some((w) => w.extra_hours_status === 'approved' && (w.extra_hours ?? 0) !== 0)
  const basis = hasAdjustment ? v.actual : v.estimated
  return {
    jobPrice: price,
    labourCost: basis.totalLabourCost,
    accCost: basis.totalAccCost,
    grossProfit: basis.grossProfit,
    marginPercent: basis.marginPercent,
    hasAdjustment,
  }
}

/** Map a job_workers row (+ joined contractor) to a calculateVariance WorkerInput. */
export function workerRowToInput(w: Record<string, unknown>): WorkerInput {
  const c = (w.contractors ?? null) as {
    full_name?: string | null; hourly_rate?: number | null; worker_type?: string | null
    holiday_pay_method?: string | null; holiday_pay_percent?: number | null
    kiwisaver_enrolled?: boolean; kiwisaver_employer_rate?: number | null
  } | null
  return {
    contractor_id: (w.contractor_id as string) ?? '',
    full_name: c?.full_name ?? '—',
    hourly_rate: c?.hourly_rate ?? null,
    pay_rate: (w.pay_rate as number | null) ?? null,
    hours_allocated: (w.hours_allocated as number | null) ?? null,
    actual_hours: (w.actual_hours as number | null) ?? null,
    extra_hours: (w.extra_hours as number | null) ?? 0,
    extra_hours_status: (w.extra_hours_status as string | null) ?? 'none',
    worker_type: c?.worker_type ?? 'contractor',
    holiday_pay_method: c?.holiday_pay_method ?? null,
    holiday_pay_percent: c?.holiday_pay_percent ?? null,
    kiwisaver_enrolled: c?.kiwisaver_enrolled ?? false,
    kiwisaver_employer_rate: c?.kiwisaver_employer_rate ?? null,
  }
}

/**
 * Load per-job margins for a batch of jobs in ONE workers query. Returns a map
 * keyed by job id. `jobs` supplies price + allowed hours (already loaded by the
 * caller). A job with no workers gets a margin equal to its full price (100%).
 */
export async function loadJobMargins(
  supabase: SupabaseClient,
  jobs: Array<{ id: string; jobPrice: number | null; allowedHours: number | null }>,
): Promise<Map<string, JobMargin>> {
  const out = new Map<string, JobMargin>()
  const ids = jobs.map((j) => j.id)
  if (ids.length === 0) return out

  const { data: wRows } = await supabase
    .from('job_workers')
    .select('job_id, contractor_id, hours_allocated, actual_hours, pay_rate, extra_hours, extra_hours_status, contractors ( full_name, hourly_rate, worker_type, holiday_pay_method, holiday_pay_percent, kiwisaver_enrolled, kiwisaver_employer_rate )')
    .in('job_id', ids)

  const byJob = new Map<string, WorkerInput[]>()
  for (const r of (wRows ?? []) as Array<Record<string, unknown>>) {
    const jid = r.job_id as string
    const list = byJob.get(jid) ?? []
    list.push(workerRowToInput(r))
    byJob.set(jid, list)
  }

  for (const j of jobs) {
    out.set(j.id, computeJobMargin(j.jobPrice, j.allowedHours, byJob.get(j.id) ?? []))
  }
  return out
}
