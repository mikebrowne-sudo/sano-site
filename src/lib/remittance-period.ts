// Pure helpers for filtering a contractor's eligible pay by service-date period,
// so a remittance can cover just one pay period (e.g. 1–15th, then 16th–EOM on a
// separate, earlier-paid run). Kept DB-free so the range logic is unit-tested.

export interface EligibleInvoice {
  id: string
  contractorId: string
  amount: number
  hours: number | null
  gstAmount: number | null
  serviceDate: string | null // ISO yyyy-mm-dd or null (undated)
  invoiceNumber?: string
  // Job context — carried through the period split purely so the pay workspace
  // can show what makes up a total. Not used by any filtering logic.
  jobNumber?: string | null
  jobAddress?: string | null
  workersOnJob?: number
}

export interface PeriodFilter {
  /** ISO yyyy-mm-dd inclusive lower bound, or undefined for open-start. */
  from?: string
  /** ISO yyyy-mm-dd inclusive upper bound, or undefined for open-end. */
  to?: string
}

export interface PeriodSplit {
  /** Invoices whose service_date falls within [from, to] (inclusive). */
  inRange: EligibleInvoice[]
  /** Invoices excluded because their service_date is outside the range. */
  outOfRange: EligibleInvoice[]
  /** Invoices with no service_date — excluded from a RANGED batch (a period
   *  run should not silently sweep in undated work). Empty when no range set. */
  undated: EligibleInvoice[]
}

function inClosedRange(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false
  if (to && date > to) return false
  return true
}

/**
 * Split eligible invoices by a service-date period.
 *
 * - No range set (both from/to empty) → everything is inRange (current behaviour
 *   preserved: the whole approved-unremitted set).
 * - Range set → only invoices with a service_date inside [from, to] are inRange;
 *   dated-but-outside go to outOfRange; undated (null service_date) go to
 *   `undated` and are NOT included, so they can't be accidentally swept into a
 *   period run. The caller surfaces the undated count so staff can handle them.
 */
export function splitByPeriod(invoices: EligibleInvoice[], filter: PeriodFilter): PeriodSplit {
  const hasRange = Boolean(filter.from || filter.to)
  if (!hasRange) {
    return { inRange: invoices, outOfRange: [], undated: [] }
  }
  const inRange: EligibleInvoice[] = []
  const outOfRange: EligibleInvoice[] = []
  const undated: EligibleInvoice[] = []
  for (const inv of invoices) {
    if (!inv.serviceDate) { undated.push(inv); continue }
    if (inClosedRange(inv.serviceDate, filter.from, filter.to)) inRange.push(inv)
    else outOfRange.push(inv)
  }
  return { inRange, outOfRange, undated }
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Totals for a set of eligible invoices (labour ex-GST, GST, hours). */
export function sumInvoices(invoices: EligibleInvoice[]): { total: number; gst: number; hours: number; count: number } {
  return {
    count: invoices.length,
    total: round2(invoices.reduce((s, i) => s + Number(i.amount || 0), 0)),
    gst: round2(invoices.reduce((s, i) => s + Number(i.gstAmount || 0), 0)),
    hours: round2(invoices.reduce((s, i) => s + Number(i.hours || 0), 0)),
  }
}
