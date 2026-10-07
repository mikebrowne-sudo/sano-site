// Dashboard financial series — the data engine for the hero net-position figure
// and the month-on-month income-vs-expenses graph. Reuses the SAME income /
// expense definitions as the P&L (buildProfitLoss), so the dashboard can never
// disagree with the P&L statement. Admin-only caller; read-only.

import type { SupabaseClient } from '@supabase/supabase-js'
import { buildProfitLoss } from '@/app/portal/finance/_lib/profit-loss'
import { loadProfitLossInputs } from '@/app/portal/finance/_lib/profit-loss-data'
import { computeRecurringAmount } from '@/app/portal/recurring-jobs/_lib/per-visit-billing'
import { invoiceBalanceDue, loadAllocatedByInvoice, type InvoiceAmountFields } from '@/lib/invoice-balance'

export interface MonthPoint {
  /** Month key 'YYYY-MM'. */
  month: string
  /** e.g. 'Aug' (short) for axis labels. */
  label: string
  income: number     // money in (paid invoices) that month
  expenses: number   // money out (all expenses) that month
  net: number        // income − expenses
  /** True for the current, still-in-progress month (its figures are partial). */
  partial: boolean
}

export interface DashboardFinance {
  months: MonthPoint[]
  /** Cumulative net position across the whole window (running money in − out). */
  netPosition: number
  /** This month's net (income − expenses). */
  thisMonthNet: number
  /** Last month's net, for the trend arrow. */
  lastMonthNet: number
  /** This month's income (money received). */
  thisMonthIncome: number
  /** % change in net vs last month (null when last month was 0). */
  netChangePct: number | null
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthKey(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}`
}
function monthBounds(y: number, m: number): { from: string; to: string } {
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { from: `${monthKey(y, m)}-01`, to: `${monthKey(y, m)}-${String(last).padStart(2, '0')}` }
}

/**
 * Build the trailing `count`-month finance series ending in the month containing
 * `today` (a 'YYYY-MM-DD' string, passed in so this stays testable). Loads paid
 * invoices + expenses once, then computes each month's money-in / money-out via
 * buildProfitLoss (moneyIn / moneyOut) — identical to the P&L.
 */
export async function buildDashboardFinance(
  supabase: SupabaseClient,
  today: string,
  count = 12,
): Promise<DashboardFinance> {
  const [ty, tm] = today.slice(0, 7).split('-').map(Number)

  // Walk back count-1 months from (ty, tm) → the ordered month list + query window.
  const months: { y: number; m: number }[] = []
  let cy = ty, cm = tm
  for (let i = 0; i < count; i++) {
    months.unshift({ y: cy, m: cm })
    cm -= 1
    if (cm === 0) { cm = 12; cy -= 1 }
  }
  const windowStart = monthBounds(months[0].y, months[0].m).from
  const windowEnd = monthBounds(months[months.length - 1].y, months[months.length - 1].m).to

  // Same loader as the P&L statement, bounded to the window.
  const { income, expenses, remittances } = await loadProfitLossInputs(supabase, { from: windowStart, to: windowEnd })

  const currentKey = monthKey(ty, tm)
  const points: MonthPoint[] = months.map(({ y, m }) => {
    const { from, to } = monthBounds(y, m)
    const pl = buildProfitLoss({ income, expenses, remittances, from, to })
    const key = monthKey(y, m)
    return {
      month: key,
      label: MONTH_LABELS[m - 1],
      income: pl.moneyIn,
      expenses: pl.moneyOut,
      net: Math.round((pl.moneyIn - pl.moneyOut) * 100) / 100,
      partial: key === currentKey,   // the trailing month is still in progress
    }
  })

  const netPosition = Math.round(points.reduce((s, p) => s + p.net, 0) * 100) / 100
  const thisMonthNet = points[points.length - 1]?.net ?? 0
  const lastMonthNet = points[points.length - 2]?.net ?? 0
  const thisMonthIncome = points[points.length - 1]?.income ?? 0
  const netChangePct = lastMonthNet !== 0
    ? Math.round(((thisMonthNet - lastMonthNet) / Math.abs(lastMonthNet)) * 100)
    : null

  return { months: points, netPosition, thisMonthNet, lastMonthNet, thisMonthIncome, netChangePct }
}

export interface ProjectedMonth {
  month: string      // 'YYYY-MM'
  label: string      // 'Sep'
  /** Expected income landing in this month (unpaid sent invoices due + upcoming recurring). */
  projected: number
}

/**
 * Forward income projection for the next `count` months (default 3), grounded in
 * real commitments in the system — NOT a statistical forecast:
 *   • Unpaid SENT invoices, bucketed by their DUE month.
 *   • Upcoming recurring-contract invoices (their scheduled next dates + amount),
 *     including per-visit contracts (rate × service days that month).
 * Returns the current month + the next `count` so the dashed line joins the solid
 * history at "now". Read-only.
 */
export async function buildIncomeProjection(
  supabase: SupabaseClient,
  today: string,
  count = 3,
): Promise<ProjectedMonth[]> {
  const [ty, tm] = today.slice(0, 7).split('-').map(Number)

  // Month list: current month → +count.
  const months: { y: number; m: number }[] = []
  let cy = ty, cm = tm
  for (let i = 0; i <= count; i++) {
    months.push({ y: cy, m: cm })
    cm += 1
    if (cm === 13) { cm = 1; cy += 1 }
  }
  const rangeStart = monthBounds(months[0].y, months[0].m).from
  const rangeEnd = monthBounds(months[months.length - 1].y, months[months.length - 1].m).to

  const totals: Record<string, number> = {}
  for (const { y, m } of months) totals[monthKey(y, m)] = 0

  // 1. Unpaid sent invoices, by DUE month.
  const { data: sentInv } = await supabase
    .from('invoices')
    .select('id, base_price, discount, gst_included, due_date, invoice_items ( price )')
    .eq('status', 'sent')
    .is('deleted_at', null)
    .not('due_date', 'is', null)
    .gte('due_date', rangeStart).lte('due_date', rangeEnd)
  // GST-inclusive balance still owed (part payments already matched are taken off).
  const sentRows = (sentInv ?? []) as Array<InvoiceAmountFields & { id: string; due_date: string }>
  const allocated = await loadAllocatedByInvoice(supabase, sentRows.map((i) => i.id))
  for (const i of sentRows) {
    const key = String(i.due_date).slice(0, 7)
    if (!(key in totals)) continue
    totals[key] += invoiceBalanceDue(i, allocated.get(i.id) ?? 0)
  }

  // 2. Upcoming recurring-contract invoices. Each active recurring job raises an
  //    invoice per month around its send day; project its amount into each month
  //    in range (fixed = monthly_value, per-visit = rate × service days).
  //    Resilient to the per-visit migration not being applied yet: if those
  //    columns don't exist, fall back to monthly_value only (still projects
  //    fixed recurring like Pukekohe).
  let recurring: Array<Record<string, unknown>> | null = null
  {
    const full = await supabase
      .from('recurring_jobs')
      .select('monthly_value, billing_mode, per_visit_rate, service_days_of_week, status')
      .eq('status', 'active')
    if (!full.error) {
      recurring = full.data as Array<Record<string, unknown>>
    } else {
      const basic = await supabase
        .from('recurring_jobs')
        .select('monthly_value, status')
        .eq('status', 'active')
      recurring = (basic.data as Array<Record<string, unknown>>) ?? null
    }
  }
  for (const r of (recurring ?? []) as Array<Record<string, unknown>>) {
    for (const { y, m } of months) {
      const key = monthKey(y, m)
      // Don't double-count the current month if its invoice for this period was
      // already raised (it'd show as a sent invoice above). Project from next month on.
      if (key === monthKey(ty, tm)) continue
      const { from, to } = monthBounds(y, m)
      const { amount } = computeRecurringAmount(
        {
          billingMode: r.billing_mode as string | null,
          monthlyValue: r.monthly_value as number | null,
          perVisitRate: r.per_visit_rate as number | null,
          serviceDaysOfWeek: r.service_days_of_week as number[] | null,
        },
        { start: from, end: to },
      )
      totals[key] += amount
    }
  }

  return months.map(({ y, m }) => ({
    month: monthKey(y, m),
    label: MONTH_LABELS[m - 1],
    projected: Math.round(totals[monthKey(y, m)] * 100) / 100,
  }))
}

// ── Jobs booked per month (growth + forward bookings) ───────────────────────

export interface BookedMonth {
  month: string        // 'YYYY-MM'
  label: string        // 'Sep'
  jobs: number         // jobs scheduled in the month
  done: number         // of which completed / invoiced
  value: number        // booked value (job prices; recurring visits valued from their contract)
  doneValue: number    // value of the completed / invoiced jobs
  unpriced: number     // jobs with no price we could find
  current: boolean     // the month containing today
  future: boolean      // months after this one — booked ahead
}

export interface BookedJobRow {
  scheduledDate: string
  status: string | null
  jobPrice: number | null
  recurringJobId: string | null
}

export interface RecurringValueRow {
  id: string
  billingMode: string | null
  monthlyValue: number | null
  perVisitRate: number | null
}

/**
 * Pure: bucket jobs into months and value them. A job's own price wins; a
 * recurring visit with no price is valued from its contract — the per-visit
 * rate, or a fixed monthly contract's value shared across that month's visits
 * (so the month totals the contract, however many visits there are).
 */
export function summariseBookedJobs(
  jobs: BookedJobRow[],
  recurring: RecurringValueRow[],
  months: Array<{ y: number; m: number }>,
  todayKey: string,
): BookedMonth[] {
  const recById = new Map(recurring.map((r) => [r.id, r]))
  const keys = months.map(({ y, m }) => monthKey(y, m))
  const out = new Map<string, BookedMonth>(months.map(({ y, m }) => {
    const key = monthKey(y, m)
    return [key, { month: key, label: MONTH_LABELS[m - 1], jobs: 0, done: 0, value: 0, doneValue: 0, unpriced: 0, current: key === todayKey, future: key > todayKey }]
  }))

  // Visits per (recurring contract, month) — to spread a fixed monthly value.
  const visitsPerRecMonth = new Map<string, number>()
  for (const j of jobs) {
    if (!j.recurringJobId) continue
    const k = `${j.recurringJobId}|${j.scheduledDate.slice(0, 7)}`
    visitsPerRecMonth.set(k, (visitsPerRecMonth.get(k) ?? 0) + 1)
  }

  for (const j of jobs) {
    const key = j.scheduledDate.slice(0, 7)
    const bucket = out.get(key)
    if (!bucket) continue
    bucket.jobs += 1
    const isDone = j.status === 'completed' || j.status === 'invoiced'
    if (isDone) bucket.done += 1

    let value = Number(j.jobPrice ?? 0)
    if (!(value > 0) && j.recurringJobId) {
      const rec = recById.get(j.recurringJobId)
      // per_visit and completed_visits contracts both price each visit.
      if (Number(rec?.perVisitRate) > 0) value = Number(rec?.perVisitRate)
      else if (Number(rec?.monthlyValue) > 0) value = Number(rec?.monthlyValue) / (visitsPerRecMonth.get(`${j.recurringJobId}|${key}`) ?? 1)
    }
    if (value > 0) {
      bucket.value += value
      if (isDone) bucket.doneValue += value
    } else bucket.unpriced += 1
  }

  return keys.map((k) => {
    const b = out.get(k) as BookedMonth
    return { ...b, value: Math.round(b.value * 100) / 100, doneValue: Math.round(b.doneValue * 100) / 100 }
  })
}

/** Jobs booked for the last `past` months (incl. this one) and the next `ahead`. */
export async function buildBookedJobs(supabase: SupabaseClient, today: string, past = 12, ahead = 3): Promise<BookedMonth[]> {
  const [ty, tm] = today.slice(0, 7).split('-').map(Number)
  const months: { y: number; m: number }[] = []
  for (let off = -(past - 1); off <= ahead; off++) {
    const d = new Date(Date.UTC(ty, tm - 1 + off, 1))
    months.push({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 })
  }
  const from = monthBounds(months[0].y, months[0].m).from
  const to = monthBounds(months[months.length - 1].y, months[months.length - 1].m).to

  const [{ data: jobRows }, recRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('scheduled_date, status, job_price, recurring_job_id')
      .is('deleted_at', null)
      .not('is_test', 'is', true)
      .neq('status', 'cancelled')
      .gte('scheduled_date', from)
      .lte('scheduled_date', to),
    supabase.from('recurring_jobs').select('id, billing_mode, monthly_value, per_visit_rate'),
  ])

  const jobs: BookedJobRow[] = ((jobRows ?? []) as Array<Record<string, unknown>>).map((j) => ({
    scheduledDate: j.scheduled_date as string,
    status: (j.status as string | null) ?? null,
    jobPrice: j.job_price == null ? null : Number(j.job_price),
    recurringJobId: (j.recurring_job_id as string | null) ?? null,
  }))
  const recurring: RecurringValueRow[] = (recRes.error ? [] : (recRes.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    billingMode: (r.billing_mode as string | null) ?? null,
    monthlyValue: r.monthly_value == null ? null : Number(r.monthly_value),
    perVisitRate: r.per_visit_rate == null ? null : Number(r.per_visit_rate),
  }))

  return summariseBookedJobs(jobs, recurring, months, monthKey(ty, tm))
}
