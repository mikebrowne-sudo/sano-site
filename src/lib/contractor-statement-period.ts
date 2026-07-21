// Twice-monthly contractor statement periods, in NZ-local calendar dates.
//
// Periods are fixed: the 1st–15th, and the 16th–final calendar day. All values
// here are NZ-local `YYYY-MM-DD` strings — this module does NO timezone
// conversion of the value itself. The caller derives "NZ today" once (via
// Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' })) and passes the
// string in, so this stays pure and deterministic for tests.
//
// Month-end is computed with a UTC construction (Date.UTC(y, m, 0)) so it is
// immune to DST and returns the correct 28/29/30/31 including leap years.

export interface StatementPeriod {
  /** NZ-local YYYY-MM-DD, day 1 or 16. */
  period_start: string
  /** NZ-local YYYY-MM-DD, day 15 or month-end. */
  period_end: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

/** Parse a `YYYY-MM-DD` string into its numeric parts (no Date, no timezone). */
function parts(nzDate: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nzDate)
  if (!match) throw new Error(`Invalid NZ date (expected YYYY-MM-DD): ${nzDate}`)
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
}

/** Final calendar day of month `m` (1-12) in year `y`. UTC-safe → correct leap years. */
export function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** The statement period containing an NZ-local date. */
export function periodContaining(nzDate: string): StatementPeriod {
  const { y, m, d } = parts(nzDate)
  if (d <= 15) return { period_start: iso(y, m, 1), period_end: iso(y, m, 15) }
  return { period_start: iso(y, m, 16), period_end: iso(y, m, lastDayOfMonth(y, m)) }
}

/** The period immediately after the given one (rolls month + year). */
export function nextPeriod(p: StatementPeriod): StatementPeriod {
  const { y, m, d } = parts(p.period_start)
  if (d === 1) {
    // First half → second half of the same month.
    return { period_start: iso(y, m, 16), period_end: iso(y, m, lastDayOfMonth(y, m)) }
  }
  // Second half → first half of the next month (roll year at December).
  const ny = m === 12 ? y + 1 : y
  const nm = m === 12 ? 1 : m + 1
  return { period_start: iso(ny, nm, 1), period_end: iso(ny, nm, 15) }
}

/** The period immediately before the given one (rolls month + year). */
export function previousPeriod(p: StatementPeriod): StatementPeriod {
  const { y, m, d } = parts(p.period_start)
  if (d === 16) {
    // Second half → first half of the same month.
    return { period_start: iso(y, m, 1), period_end: iso(y, m, 15) }
  }
  // First half → second half of the previous month (roll year at January).
  const py = m === 1 ? y - 1 : y
  const pm = m === 1 ? 12 : m - 1
  return { period_start: iso(py, pm, 16), period_end: iso(py, pm, lastDayOfMonth(py, pm)) }
}

/**
 * The most recently CLOSED period as of an NZ-local "today" — i.e. the latest
 * period whose end is strictly before today. If today is inside a period, that
 * open period is skipped and its predecessor is returned.
 */
export function mostRecentlyClosedPeriod(nzToday: string): StatementPeriod {
  const current = periodContaining(nzToday)
  return previousPeriod(current)
}

/**
 * Convert a timestamptz ISO string to its NZ-local calendar date (YYYY-MM-DD).
 * Uses Pacific/Auckland so a late-evening NZ instant never slips to the UTC day
 * before. Returns null for null/invalid input.
 */
export function toNzCalendarDate(isoTimestamp: string | null | undefined): string | null {
  if (!isoTimestamp) return null
  const d = new Date(isoTimestamp)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/** A stable label for display, e.g. "1–15 Jul 2026". */
export function periodLabel(p: StatementPeriod): string {
  const s = parts(p.period_start)
  const e = parts(p.period_end)
  const mon = new Date(Date.UTC(e.y, e.m - 1, 1)).toLocaleString('en-NZ', { month: 'short', timeZone: 'UTC' })
  return `${s.d}–${e.d} ${mon} ${e.y}`
}
