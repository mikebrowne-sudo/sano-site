// Contractor pay-period date rule (allowed-hours model, 2026-06).
//
// Confirmed schedule (spec §3):
//   • Jobs completed 1st–15th  → paid on the 30th (same month).
//   • Jobs completed 16th–end  → paid on the 15th (following month).
//
// The 30th is clamped to the last day of the month so February (and
// any month without a 30th) resolves to a real date. Each completion
// half-month maps to exactly one pay date, so the pay date is a stable
// grouping key for the contractor pay statement.
//
// Pure + deterministic. Dates are handled by their Y/M/D parts to
// avoid timezone drift — callers pass the stored completion date
// (a `YYYY-MM-DD` string, or the date portion of a timestamptz).

export interface PayPeriod {
  /** First day of the completion half-month — `YYYY-MM-DD`. */
  periodStart: string
  /** Last day of the completion half-month — `YYYY-MM-DD`. */
  periodEnd: string
  /** The pay date — `YYYY-MM-DD`. Stable key for grouping. */
  payDate: string
  /** e.g. "1–15 June 2026". */
  label: string
  /** e.g. "Paid 30 June 2026". */
  payDateLabel: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function ymd(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`
}

/** Days in month m (1-based) of year y. */
function lastDayOfMonth(y: number, m: number): number {
  // Day 0 of the next month is the last day of month m.
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function parts(dateInput: string | Date): { y: number; m: number; d: number } {
  if (typeof dateInput === 'string') {
    const [y, m, d] = dateInput.slice(0, 10).split('-').map(Number)
    return { y, m, d }
  }
  return {
    y: dateInput.getFullYear(),
    m: dateInput.getMonth() + 1,
    d: dateInput.getDate(),
  }
}

/**
 * The pay period a completion date falls into, with its pay date.
 * Throws on an unparseable input so callers fail loudly rather than
 * silently mis-bucketing pay.
 */
export function payPeriodForDate(dateInput: string | Date): PayPeriod {
  const { y, m, d } = parts(dateInput)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d) || m < 1 || m > 12 || d < 1) {
    throw new Error(`payPeriodForDate: invalid date "${String(dateInput)}"`)
  }

  const firstHalf = d <= 15

  if (firstHalf) {
    const payDay = Math.min(30, lastDayOfMonth(y, m))
    return {
      periodStart: ymd(y, m, 1),
      periodEnd: ymd(y, m, 15),
      payDate: ymd(y, m, payDay),
      label: `1–15 ${MONTHS[m - 1]} ${y}`,
      payDateLabel: `Paid ${payDay} ${MONTHS[m - 1]} ${y}`,
    }
  }

  const last = lastDayOfMonth(y, m)
  const payY = m === 12 ? y + 1 : y
  const payM = m === 12 ? 1 : m + 1
  return {
    periodStart: ymd(y, m, 16),
    periodEnd: ymd(y, m, last),
    payDate: ymd(payY, payM, 15),
    label: `16–${last} ${MONTHS[m - 1]} ${y}`,
    payDateLabel: `Paid 15 ${MONTHS[payM - 1]} ${payY}`,
  }
}

/** A period's stable key = its start date (`YYYY-MM-DD`), e.g. '2026-07-01' or
 *  '2026-07-16'. Unique per half-month, so it round-trips a period selection. */
export function payPeriodKey(p: PayPeriod): string {
  return p.periodStart
}

/** Resolve a period from its key (its periodStart). Returns null if unparseable. */
export function payPeriodForKey(key: string | null | undefined): PayPeriod | null {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null
  try {
    return payPeriodForDate(key)
  } catch {
    return null
  }
}

/** The half-month period immediately before the one containing `dateInput`. */
export function previousPayPeriod(dateInput: string | Date): PayPeriod {
  const cur = payPeriodForDate(dateInput)
  const { y, m } = parts(cur.periodStart)
  // If we're in the 16–EOM half, the previous half is 1–15 of the SAME month;
  // otherwise it's 16–EOM of the PREVIOUS month.
  if (cur.periodStart.slice(8, 10) === '16') return payPeriodForDate(ymd(y, m, 1))
  const prevY = m === 1 ? y - 1 : y
  const prevM = m === 1 ? 12 : m - 1
  return payPeriodForDate(ymd(prevY, prevM, 16))
}

/**
 * The most recent `count` pay periods, newest first, starting from the period
 * that contains `today`. Used to populate the pay-run period dropdown. `today`
 * is passed in (never read from the clock here) so this stays pure/testable.
 */
export function recentPayPeriods(today: string | Date, count = 6): PayPeriod[] {
  const out: PayPeriod[] = []
  let cursor = payPeriodForDate(today)
  for (let i = 0; i < count; i++) {
    out.push(cursor)
    cursor = previousPayPeriod(cursor.periodStart)
  }
  return out
}
