// Monthly invoice from completed jobs — pure helpers.
//
// Some clients (e.g. Oranga Tamariki, 2 × 7-hour visits a week) are billed
// once a month for the visits actually completed that month. Each visit is
// its own job; the monthly invoice links all of them and lists every visit
// (date, hours, amount) in the service description under a single line, so
// the document total stays base_price-only and matches everywhere totals are
// computed (list, share page, PDF, Stripe, CSV).
//
// Dependency-free so it can be unit-tested and shared by the page + action.

export interface MonthlyJobInput {
  id: string
  job_number: string | null
  scheduled_date: string | null
  completed_at: string | null
  allowed_hours: number | string | null
  job_price: number | string | null
}

export interface MonthlyLine {
  jobId: string
  jobNumber: string | null
  /** 'YYYY-MM-DD' — the date the visit is billed for. */
  date: string
  hours: number | null
  price: number
  /** True when the price came from the per-visit rate (job had none). */
  priceFromRate: boolean
}

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** 'YYYY-MM' → first/last day ('YYYY-MM-DD') + a human label ("August 2026"). */
export function monthRange(month: string): { start: string; end: string; label: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  if (mo < 1 || mo > 12) return null
  const first = new Date(Date.UTC(y, mo - 1, 1))
  const last = new Date(Date.UTC(y, mo, 0))
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return {
    start: iso(first),
    end: iso(last),
    label: `${MONTHS_LONG[mo - 1]} ${y}`,
  }
}

/**
 * The date a visit is billed under. The scheduled date wins: contractors
 * often tap "complete" days later (JOB-0289 was done 12 Aug, marked complete
 * 19 Aug), and the customer thinks in visit days, not app taps.
 */
export function visitDate(job: Pick<MonthlyJobInput, 'scheduled_date' | 'completed_at'>): string | null {
  return job.scheduled_date ?? (job.completed_at ? job.completed_at.slice(0, 10) : null)
}

function toNum(v: number | string | null | undefined): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Build the invoice lines. A job's own job_price wins; otherwise the
 * per-visit rate is used. Returns an error naming the jobs that end up with
 * no price so nothing is ever billed at $0 by accident.
 */
export function buildMonthlyLines(
  jobs: ReadonlyArray<MonthlyJobInput>,
  ratePerVisit: number | null,
): { lines: MonthlyLine[]; total: number } | { error: string } {
  const rate = ratePerVisit != null && ratePerVisit > 0 ? round2(ratePerVisit) : null
  const lines: MonthlyLine[] = []
  const unpriced: string[] = []
  for (const j of jobs) {
    const own = toNum(j.job_price)
    const price = own != null && own > 0 ? round2(own) : rate
    const date = visitDate(j)
    if (price == null) { unpriced.push(j.job_number ?? j.id); continue }
    if (!date) return { error: `${j.job_number ?? j.id} has no scheduled or completed date.` }
    lines.push({
      jobId: j.id,
      jobNumber: j.job_number,
      date,
      hours: toNum(j.allowed_hours),
      price,
      priceFromRate: !(own != null && own > 0),
    })
  }
  if (unpriced.length > 0) {
    return { error: `No price for ${unpriced.join(', ')} — enter a per-visit rate.` }
  }
  if (lines.length === 0) return { error: 'Select at least one completed visit.' }
  lines.sort((a, b) => a.date.localeCompare(b.date))
  return { lines, total: round2(lines.reduce((s, l) => s + l.price, 0)) }
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

/** "12", "12 and 14", "12, 14 and 19" */
function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/**
 * Visit dates as one line, grouped by month:
 * "12, 14, 19, 21, 26 and 28 August" (or "30 September and 2 October").
 * Built by hand, not toLocaleDateString, so it reads identically everywhere.
 */
export function formatVisitDates(dates: ReadonlyArray<string>): string {
  const byMonth = new Map<string, number[]>()
  for (const d of [...dates].sort()) {
    const key = d.slice(0, 7)
    const list = byMonth.get(key) ?? []
    list.push(Number(d.slice(8, 10)))
    byMonth.set(key, list)
  }
  return joinList(
    Array.from(byMonth.entries()).map(([key, days]) =>
      `${joinList(days.map(String))} ${MONTHS_LONG[Number(key.slice(5, 7)) - 1]}`),
  )
}

/**
 * Service description shown under the invoice line — a summary, not a row per
 * visit (Mike, 2026-09-30):
 *   "August 2026: 6 visits × $315.00 + GST"
 *   "Visit dates: 12, 14, 19, 21, 26 and 28 August"
 * If the visits aren't all the same price, the summary states the total
 * instead of claiming a per-visit rate that doesn't hold.
 */
export function composeMonthlyDescription(
  monthLabel: string,
  lines: ReadonlyArray<MonthlyLine>,
  opts: { gstIncluded?: boolean } = {},
): string {
  const n = lines.length
  const visits = `${n} visit${n === 1 ? '' : 's'}`
  const prices = new Set(lines.map((l) => l.price))
  const total = Math.round(lines.reduce((s, l) => s + l.price, 0) * 100) / 100
  const gst = opts.gstIncluded ? 'incl. GST' : '+ GST'
  const summary = prices.size === 1
    ? `${monthLabel}: ${visits} × ${fmtMoney(lines[0].price)} ${gst}`
    : `${monthLabel}: ${visits} (total ${fmtMoney(total)} ${gst})`
  return `${summary}
Visit dates: ${formatVisitDates(lines.map((l) => l.date))}`
}

/**
 * Group outstanding visits by billing month ('YYYY-MM'), keeping only visits
 * dated on or before `throughDate`. Used by the 'completed_visits' recurring
 * billing: a visit marked complete late (after its month was billed) is still
 * picked up by the next run, on its own correctly-labelled invoice.
 */
export function groupVisitsByMonth(
  jobs: ReadonlyArray<Pick<MonthlyJobInput, 'id' | 'scheduled_date' | 'completed_at'>>,
  throughDate: string,
): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const j of jobs) {
    const d = visitDate(j)
    if (!d || d > throughDate) continue
    const m = d.slice(0, 7)
    const list = out.get(m)
    if (list) list.push(j.id)
    else out.set(m, [j.id])
  }
  return new Map(Array.from(out.entries()).sort(([a], [b]) => a.localeCompare(b)))
}

/**
 * Label for a weekly invoice period, e.g. "Week of 28 September – 4 October 2026"
 * or "Week of 5–11 October 2026". When stragglers stretch the range beyond
 * seven days it drops "Week of" and just shows the range.
 */
export function periodLabel(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00Z`)
  const e = new Date(`${end}T00:00:00Z`)
  const sd = s.getUTCDate(), sm = MONTHS_LONG[s.getUTCMonth()], sy = s.getUTCFullYear()
  const ed = e.getUTCDate(), em = MONTHS_LONG[e.getUTCMonth()], ey = e.getUTCFullYear()
  const range = sy !== ey
    ? `${sd} ${sm} ${sy} – ${ed} ${em} ${ey}`
    : sm !== em
      ? `${sd} ${sm} – ${ed} ${em} ${ey}`
      : `${sd}–${ed} ${em} ${ey}`
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  return days === 7 ? `Week of ${range}` : range
}
