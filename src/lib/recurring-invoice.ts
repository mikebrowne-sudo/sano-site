// Recurring-invoicing date logic — pure + testable.
//
// A commercial contract bills monthly on a chosen day (1–28). These helpers
// compute the next invoice date and whether an invoice is due, independent of
// the cleaning schedule.

function ymd(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}
function parse(d: string): { y: number; m: number; day: number } {
  const [y, m, day] = d.split('-').map(Number)
  return { y, m, day }
}

/** Clamp the send day to a valid day for that month (1–28 recommended so it
 *  always exists; still guard if someone stored 29–31). */
function dateForMonth(year: number, monthIdx0: number, sendDay: number): number {
  const lastDay = new Date(Date.UTC(year, monthIdx0 + 1, 0)).getUTCDate()
  return Date.UTC(year, monthIdx0, Math.min(sendDay, lastDay))
}

/** The next invoice date on/after `fromDate` for a given day-of-month. */
export function computeNextInvoiceDate(fromDate: string, sendDay: number): string {
  const { y, m } = parse(fromDate)
  const thisMonth = dateForMonth(y, m - 1, sendDay)
  const fromMs = Date.UTC(y, m - 1, parse(fromDate).day)
  if (thisMonth >= fromMs) return ymd(thisMonth)
  return ymd(dateForMonth(y, m, sendDay)) // next month
}

/** Advance one month from a given invoice date, keeping the day-of-month. */
export function advanceOneMonth(currentDate: string, sendDay: number): string {
  const { y, m } = parse(currentDate)
  return ymd(dateForMonth(y, m, sendDay)) // month index m == next month (0-based m-1 + 1)
}

/** True when an invoice is due — a next date is set and today is on/after it. */
export function isInvoiceDue(nextInvoiceDate: string | null, today: string): boolean {
  if (!nextInvoiceDate) return false
  return Date.parse(today) >= Date.parse(nextInvoiceDate)
}
