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
 * EVERY verified row is effective-dated (enforced by cgh_verified_complete_chk);
 * a row without an effective date is ignored defensively.
 *   - registered rows apply when   effective_date <= date AND (no end OR date <= end);
 *   - not-registered rows apply when effective_date <= date (a "not registered
 *     FROM this date" statement — it does NOT apply before its effective date).
 * The applicable row is the one with the LATEST effective_date on/before the date
 * (deterministic even if windows overlap — the most recent status change wins).
 * Returns null when NO verified row's effective date is on/before the date — i.e.
 * a supply before the first verified row is UNRESOLVED, not silently "not
 * registered".
 */
export function selectGstStatusForDate<T extends GstHistoryRecord>(history: T[], dateIso: string): T | null {
  const applicable = history.filter((h) => {
    if (h.status !== 'verified' || !h.effectiveDate) return false
    if (h.effectiveDate > dateIso) return false // future-effective — not yet in force
    if (h.gstRegistered && h.endDate && dateIso > h.endDate) return false // past a registered window's end
    return true
  })
  if (applicable.length === 0) return null
  // Latest effective date wins; deterministic tie-break by later end date then id.
  return applicable.sort((a, b) => {
    if (a.effectiveDate! !== b.effectiveDate!) return a.effectiveDate! < b.effectiveDate! ? 1 : -1
    const ae = a.endDate ?? '9999-12-31'; const be = b.endDate ?? '9999-12-31'
    if (ae !== be) return ae < be ? 1 : -1
    return a.id < b.id ? 1 : -1
  })[0]
}

export type GstResolution = 'registered' | 'not_registered' | 'unresolved'

export interface ResolvedGstWindow {
  /** Tri-state: 'unresolved' means no verified status covers the date — the
   *  caller must NOT assume not-registered (do not apply GST, but flag for
   *  review). 'not_registered'/'registered' are explicit verified statuses. */
  resolution: GstResolution
  gstRegistered: boolean
  gstNumber: string | null
  effectiveDate: string | null
  endDate: string | null
}

/**
 * Resolve the GST window for a supply date. Explicitly tri-state:
 *   - a verified registered row covering the date → 'registered';
 *   - a verified not-registered row in force → 'not_registered';
 *   - NO verified row on/before the date → 'unresolved' (absence of evidence is
 *     NOT the same as verified not-registered — never silently assume no-GST).
 * GST resolution downstream should treat 'unresolved' as "no GST applied, but
 * flagged", never as a confirmed not-registered.
 */
export function gstWindowForDate(history: GstHistoryRecord[], dateIso: string): ResolvedGstWindow {
  const picked = selectGstStatusForDate(history, dateIso)
  if (!picked) {
    return { resolution: 'unresolved', gstRegistered: false, gstNumber: null, effectiveDate: null, endDate: null }
  }
  return {
    resolution: picked.gstRegistered ? 'registered' : 'not_registered',
    gstRegistered: picked.gstRegistered,
    gstNumber: picked.gstNumber,
    effectiveDate: picked.effectiveDate,
    endDate: picked.endDate,
  }
}
