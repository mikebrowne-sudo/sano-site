// Pure builder for draft contractor statements.
//
// Given the already-fetched ELIGIBLE lines (approved, unpaid, unremitted,
// unlinked CIs with a resolved service date), group them per contractor and
// compute the header totals + derived counts. No DB, no side effects — this is
// the unit-testable core of draft generation.
//
// Money rule: contractor rates are GST-INCLUSIVE. subtotal = total_payable =
// sum of line amounts. gst_total is INFORMATIONAL — only lines whose GST is
// CONFIRMED (gst_status='applied') contribute; every flagged status
// (not_assessed / pending_review / incomplete / before_effective_date /
// not_registered) is preserved but never counted as confirmed GST.

import type { StatementPeriod } from './contractor-statement-period'

/** Only a confirmed 'applied' status contributes to gst_total. */
export const GST_CONFIRMED_STATUS = 'applied'
/** Statuses that need a human to resolve before GST could ever be confirmed. */
export const GST_REVIEW_STATUSES = new Set(['pending_review', 'incomplete', 'not_assessed'])

export interface EligibleLine {
  id: string
  contractor_id: string
  contractor_name: string | null
  invoice_number: string | null
  amount: number
  gst_status: string | null
  gst_amount: number | null
  /** Resolved NZ-local service date (non-null — only eligible lines reach here). */
  service_date: string
}

export interface StatementDraftGroup {
  contractor_id: string
  contractor_name: string | null
  lines: EligibleLine[]
  subtotal: number
  gst_total: number
  total_payable: number
  line_count: number
  gst_applied_lines: number
  gst_review_lines: number
  carried_lines: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** A line is carried forward when its service date precedes the statement period. */
export function isCarriedForward(serviceDate: string, periodStart: string): boolean {
  return serviceDate < periodStart
}

/** True when a line's GST needs staff review (flagged, not a settled outcome). */
export function isGstReviewRequired(gstStatus: string | null): boolean {
  return gstStatus == null || GST_REVIEW_STATUSES.has(gstStatus)
}

/**
 * Group eligible lines by contractor and compute per-contractor draft headers.
 * `period` supplies the carry-forward boundary. Groups are sorted by contractor
 * name; lines within a group by service date then invoice number.
 */
export function buildDraftGroups(lines: EligibleLine[], period: StatementPeriod): StatementDraftGroup[] {
  const byContractor = new Map<string, EligibleLine[]>()
  for (const line of lines) {
    const arr = byContractor.get(line.contractor_id)
    if (arr) arr.push(line)
    else byContractor.set(line.contractor_id, [line])
  }

  const groups: StatementDraftGroup[] = []
  for (const [contractor_id, groupLines] of Array.from(byContractor.entries())) {
    const sorted = [...groupLines].sort((a, b) =>
      a.service_date === b.service_date
        ? (a.invoice_number ?? '').localeCompare(b.invoice_number ?? '')
        : a.service_date.localeCompare(b.service_date),
    )
    const subtotal = round2(sorted.reduce((s, l) => s + l.amount, 0))
    const gst_total = round2(
      sorted.reduce((s, l) => (l.gst_status === GST_CONFIRMED_STATUS ? s + (l.gst_amount ?? 0) : s), 0),
    )
    groups.push({
      contractor_id,
      contractor_name: sorted[0]?.contractor_name ?? null,
      lines: sorted,
      subtotal,
      gst_total,
      total_payable: subtotal, // rates are GST-inclusive
      line_count: sorted.length,
      gst_applied_lines: sorted.filter((l) => l.gst_status === GST_CONFIRMED_STATUS).length,
      gst_review_lines: sorted.filter((l) => isGstReviewRequired(l.gst_status)).length,
      carried_lines: sorted.filter((l) => isCarriedForward(l.service_date, period.period_start)).length,
    })
  }

  return groups.sort((a, b) => (a.contractor_name ?? '').localeCompare(b.contractor_name ?? ''))
}
