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
  /** Distinct customers among the (period-scoped) jobs, for the filter dropdown. */
  customers: { id: string; name: string }[]
}

export type MarginSort = 'default' | 'margin_desc' | 'margin_asc'
export type InvoicedFilter = 'all' | 'invoiced' | 'not_invoiced'

export interface JobMarginFilters {
  from?: string | null
  to?: string | null
  /** 'all' | 'invoiced' | 'not_invoiced' — by whether the job has an invoice. */
  invoiced?: InvoicedFilter
  /** Restrict to one customer (clients.id). */
  customerId?: string | null
  /** 'default' (review-first, thinnest margin) | 'margin_desc' | 'margin_asc'. */
  sort?: MarginSort
}

/**
 * Build the job-margins report over completed (or invoiced) priced jobs, with
 * optional date / invoiced / customer filters and a margin sort. Default sort is
 * review-first (no-cost jobs) then thinnest margin; margin_desc/asc sort purely
 * by the number (review jobs no longer pinned).
 */
export async function buildJobMarginReport(
  supabase: SupabaseClient,
  opts: JobMarginFilters = {},
): Promise<JobMarginReport> {
  const invoiced = opts.invoiced ?? 'all'
  const sort = opts.sort ?? 'default'

  let q = supabase
    .from('jobs')
    .select('id, job_number, title, completed_at, job_price, allowed_hours, client_id, invoice_id, clients ( name, company_name )')
    .in('status', ['completed', 'invoiced'])
    .is('deleted_at', null)
    .gt('job_price', 0)
    .order('completed_at', { ascending: false })
  if (opts.from) q = q.gte('completed_at', opts.from)
  if (opts.to) q = q.lte('completed_at', opts.to)
  if (opts.customerId) q = q.eq('client_id', opts.customerId)
  if (invoiced === 'invoiced') q = q.not('invoice_id', 'is', null)
  else if (invoiced === 'not_invoiced') q = q.is('invoice_id', null)

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

  // Default: jobs needing cost review float to the top (what to action first),
  // then thinnest margin. A chosen margin sort orders purely by the number.
  if (sort === 'margin_desc') rows.sort((a, b) => b.marginPercent - a.marginPercent)
  else if (sort === 'margin_asc') rows.sort((a, b) => a.marginPercent - b.marginPercent)
  else rows.sort((a, b) => {
    if (a.needsCostReview !== b.needsCostReview) return a.needsCostReview ? -1 : 1
    return a.marginPercent - b.marginPercent
  })

  // Customer dropdown options — from a period-scoped query NOT narrowed by the
  // customer filter, so every customer with jobs in the period stays selectable.
  let cq = supabase
    .from('jobs')
    .select('client_id, clients ( name, company_name )')
    .in('status', ['completed', 'invoiced'])
    .is('deleted_at', null)
    .gt('job_price', 0)
    .not('client_id', 'is', null)
  if (opts.from) cq = cq.gte('completed_at', opts.from)
  if (opts.to) cq = cq.lte('completed_at', opts.to)
  const { data: custRaw } = await cq
  const custMap = new Map<string, string>()
  for (const j of (custRaw ?? []) as Array<Record<string, unknown>>) {
    const cid = j.client_id as string | null
    if (!cid || custMap.has(cid)) continue
    const c = (j.clients ?? null) as { name?: string | null; company_name?: string | null } | null
    custMap.set(cid, (c?.company_name && c.company_name.trim()) ? c.company_name : (c?.name ?? '—'))
  }
  const customers = Array.from(custMap, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))

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
    customers,
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100 }
