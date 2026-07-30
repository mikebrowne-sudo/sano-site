// Finance job-margins report data (finance-gated caller). Lists completed jobs
// with their labour-based gross margin (price − labour − ACC), using the same
// canonical calc as the jobs list + job detail page. Read-only; no writes.

import type { SupabaseClient } from '@supabase/supabase-js'
import { loadJobMargins, type JobMargin } from '@/lib/job-margin'

export interface JobMarginRow {
  id: string
  jobNumber: string | null
  title: string | null
  client: string | null
  completedAt: string | null
  jobPrice: number
  labourCost: number
  grossProfit: number
  marginPercent: number
  /** No labour cost recorded — needs review (assign a contractor / set hours). */
  needsCostReview: boolean
  /** Number of workers assigned (0 = none) — sharpens the review reason. */
  workerCount: number
}

export interface JobMarginReport {
  rows: JobMarginRow[]
  totals: {
    jobs: number
    price: number
    labourCost: number
    grossProfit: number
    /** Blended margin % across all listed jobs (profit / price). */
    marginPercent: number
    /** How many listed jobs need cost review (no labour recorded). */
    needsReview: number
  }
}

/**
 * Build the job-margins report over completed (or invoiced) jobs, optionally
 * bounded by completion date [from, to]. Only jobs with a price > 0 are included
 * (a $0 job has no margin to report). Sorted by margin % ascending so the
 * thinnest / loss-making jobs surface first.
 */
export async function buildJobMarginReport(
  supabase: SupabaseClient,
  opts: { from?: string | null; to?: string | null } = {},
): Promise<JobMarginReport> {
  let q = supabase
    .from('jobs')
    .select('id, job_number, title, completed_at, job_price, allowed_hours, clients ( name, company_name )')
    .in('status', ['completed', 'invoiced'])
    .is('deleted_at', null)
    .gt('job_price', 0)
    .order('completed_at', { ascending: false })
  if (opts.from) q = q.gte('completed_at', opts.from)
  if (opts.to) q = q.lte('completed_at', opts.to)

  const { data: jobsRaw } = await q
  const jobs = (jobsRaw ?? []) as Array<Record<string, unknown>>

  const margins = await loadJobMargins(
    supabase,
    jobs.map((j) => ({
      id: j.id as string,
      jobPrice: (j.job_price as number | null) ?? null,
      allowedHours: (j.allowed_hours as number | null) ?? null,
    })),
  )

  const rows: JobMarginRow[] = jobs.map((j) => {
    const client = (j.clients ?? null) as { name?: string | null; company_name?: string | null } | null
    const priceVal = (j.job_price as number | null) ?? 0
    const m: JobMargin = margins.get(j.id as string) ?? {
      jobPrice: priceVal, labourCost: 0, accCost: 0, grossProfit: priceVal, marginPercent: 100,
      hasAdjustment: false, needsCostReview: priceVal > 0, workerCount: 0,
    }
    return {
      id: j.id as string,
      jobNumber: (j.job_number as string | null) ?? null,
      title: (j.title as string | null) ?? null,
      client: (client?.company_name && client.company_name.trim()) ? client.company_name : (client?.name ?? null),
      completedAt: (j.completed_at as string | null) ?? null,
      jobPrice: m.jobPrice,
      labourCost: m.labourCost,
      grossProfit: m.grossProfit,
      marginPercent: m.marginPercent,
      needsCostReview: m.needsCostReview,
      workerCount: m.workerCount,
    }
  })

  // Jobs needing cost review float to the top (they're what to action first);
  // within each group, thinnest / loss-making margin first.
  rows.sort((a, b) => {
    if (a.needsCostReview !== b.needsCostReview) return a.needsCostReview ? -1 : 1
    return a.marginPercent - b.marginPercent
  })

  const price = round2(rows.reduce((s, r) => s + r.jobPrice, 0))
  const labourCost = round2(rows.reduce((s, r) => s + r.labourCost, 0))
  const grossProfit = round2(rows.reduce((s, r) => s + r.grossProfit, 0))
  return {
    rows,
    totals: {
      jobs: rows.length,
      price,
      labourCost,
      grossProfit,
      marginPercent: price > 0 ? Math.round((grossProfit / price) * 100) : 0,
      needsReview: rows.filter((r) => r.needsCostReview).length,
    },
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100 }
