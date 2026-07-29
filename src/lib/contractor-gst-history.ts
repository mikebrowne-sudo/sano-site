// Contractor GST history — pure model, validation + date-resolution (DB-free).
//
// The GST analogue of the contractor tax-declaration model. GST status is
// captured, verified, superseded and DATE-RESOLVED: the verified GST status whose
// [effective, end] window covers a supply/payment date applies — a future
// registration does not apply early; a historical supply resolves the status in
// force then. GST is NEVER inferred from turnover.
//
// This does NOT compute GST amounts — resolveContractorPaymentGst (payroll/gst.ts)
// still does the 3/23 split; this just tells it the registration window valid for
// a given date.

export type GstStatus = 'submitted' | 'verified' | 'rejected' | 'superseded'

export const GST_DECLARATION_TEXT =
  'I declare that the GST registration details I have given are true and correct.'
export const GST_DECLARATION_VERSION = 'gst-declaration-2026-v1'

export interface GstHistoryInput {
  gstRegistered: boolean
  gstNumber?: string | null
  effectiveDate?: string | null
  endDate?: string | null
}

/**
 * Validate a GST status record. Registered requires a GST number AND an
 * effective date (a registration window has a start). end_date must not precede
 * effective. Not-registered must not carry a GST number/window. Never infers
 * anything from turnover. Returns an error string or null.
 */
export function validateGstHistory(input: GstHistoryInput): string | null {
  if (input.gstRegistered) {
    if (!(input.gstNumber ?? '').trim()) return 'A GST number is required when registered.'
    if (!(input.effectiveDate ?? '').trim()) return 'A GST registration effective date is required.'
    if (input.endDate && input.effectiveDate && input.endDate < input.effectiveDate) {
      return 'The GST end date cannot be before the effective date.'
    }
    return null
  }
  // Not registered: no number/window expected. (We don't hard-error on a stray
  // value; the DB CHECK covers registered-needs-number. No turnover reasoning.)
  return null
}

export interface GstHistoryRecord {
  id: string
  status: GstStatus
  gstRegistered: boolean
  gstNumber: string | null
  effectiveDate: string | null
  endDate: string | null
}

/**
 * The verified GST status that applies on a given date — date-based, NOT newest.
 * Among verified rows, pick the registration window covering the date:
 *   - registered rows: effective_date <= date AND (no end OR date <= end);
 *   - a verified NOT-registered row applies from its effective_date (or always,
 *     if it has none) as an explicit "not registered" statement.
 * Latest-effective wins. A future-effective registration does not apply before
 * its effective date. Returns null when nothing verified covers the date.
 */
export function selectGstStatusForDate<T extends GstHistoryRecord>(history: T[], dateIso: string): T | null {
  const applicable = history.filter((h) => {
    if (h.status !== 'verified') return false
    if (h.gstRegistered) {
      return !!h.effectiveDate && h.effectiveDate <= dateIso && (!h.endDate || dateIso <= h.endDate)
    }
    // verified not-registered: applies on/after its effective date (or always).
    return !h.effectiveDate || h.effectiveDate <= dateIso
  })
  if (applicable.length === 0) return null
  return applicable.sort((a, b) => {
    const ae = a.effectiveDate ?? '0000-00-00'
    const be = b.effectiveDate ?? '0000-00-00'
    return ae < be ? 1 : ae > be ? -1 : 0
  })[0]
}

export interface ResolvedGstWindow {
  gstRegistered: boolean
  gstNumber: string | null
  effectiveDate: string | null
  endDate: string | null
}

/** Shape the applicable record for resolveContractorPaymentGst. Null history →
 *  not registered (no GST) — never inferred otherwise. */
export function gstWindowForDate(history: GstHistoryRecord[], dateIso: string): ResolvedGstWindow {
  const picked = selectGstStatusForDate(history, dateIso)
  if (!picked) return { gstRegistered: false, gstNumber: null, effectiveDate: null, endDate: null }
  return {
    gstRegistered: picked.gstRegistered,
    gstNumber: picked.gstNumber,
    effectiveDate: picked.effectiveDate,
    endDate: picked.endDate,
  }
}
