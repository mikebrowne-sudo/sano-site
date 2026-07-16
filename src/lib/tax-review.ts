// Phase 4 — contractor tax-review workflow (staff-facing).
//
// The trading structure drives an initial staff REVIEW STATE — it never makes
// a final tax determination, and a contractor is never auto-defaulted to a 45%
// withholding outcome. IR330C is a schedular-payments concept for individuals
// (sole traders / "other"), not companies/partnerships/trusts. This is entirely
// separate from employee IR330 / tax-code logic, which must never be applied to
// contractors.

export type TaxReviewStatus =
  | 'review_required'
  | 'awaiting_contractor'
  | 'awaiting_ir330c'
  | 'ready_for_review'
  | 'confirmed'
  | 'not_required'
  | 'exception'

export type TaxReviewTone = 'neutral' | 'warn' | 'good' | 'bad'

export interface TaxReviewStatusMeta {
  value: TaxReviewStatus
  label: string
  tone: TaxReviewTone
}

// Staff-facing labels — never expose the raw enum value in the UI.
export const TAX_REVIEW_STATUSES: TaxReviewStatusMeta[] = [
  { value: 'review_required',     label: 'Review required',             tone: 'warn' },
  { value: 'awaiting_contractor', label: 'Awaiting contractor information', tone: 'warn' },
  { value: 'awaiting_ir330c',     label: 'Awaiting IR330C',             tone: 'warn' },
  { value: 'ready_for_review',    label: 'Ready for review',            tone: 'neutral' },
  { value: 'confirmed',           label: 'Confirmed',                   tone: 'good' },
  { value: 'not_required',        label: 'Not required',                tone: 'good' },
  { value: 'exception',           label: 'Exception',                   tone: 'bad' },
]

const DEFAULT_STATUS: TaxReviewStatus = 'review_required'

export function taxReviewStatusLabel(status?: string | null): string {
  return TAX_REVIEW_STATUSES.find((s) => s.value === status)?.label
    ?? taxReviewStatusLabelFor(DEFAULT_STATUS)
}

function taxReviewStatusLabelFor(status: TaxReviewStatus): string {
  return TAX_REVIEW_STATUSES.find((s) => s.value === status)!.label
}

export function taxReviewStatusTone(status?: string | null): TaxReviewTone {
  return TAX_REVIEW_STATUSES.find((s) => s.value === status)?.tone ?? 'warn'
}

/** IR330C is generally relevant to individuals (sole traders / other). */
export function ir330cLikelyRequired(structure?: string | null): boolean {
  return structure === 'sole_trader' || structure === 'other'
}

/**
 * Initial staff review state derived from the trading structure. Always
 * 'review_required' (staff must confirm) — the structure only pre-fills
 * whether an IR330C is expected. Never a final tax determination.
 */
export function deriveInitialTaxReview(structure?: string | null): {
  status: TaxReviewStatus
  ir330cRequested: boolean
} {
  return { status: DEFAULT_STATUS, ir330cRequested: ir330cLikelyRequired(structure) }
}

/** Short staff-only guidance (NEVER shown to the contractor). */
export function taxReviewGuidance(structure?: string | null): string {
  switch (structure) {
    case 'sole_trader': return 'Sole trader — schedular payments; IR330C generally required. Confirm and record.'
    case 'company':     return 'NZ limited company — IR330C generally not required. Confirm company details, then set the outcome.'
    case 'partnership': return 'Partnership — manual tax review required.'
    case 'trust':       return 'Trust — manual tax review required.'
    case 'other':       return 'Other structure — manual tax review required.'
    default:            return 'Structure not provided yet — manual tax review required.'
  }
}

/**
 * The review states that mean the tax review is DONE and the staff-only
 * tax_review checklist item may be completed. Selecting a structure, uploading
 * an IR330C, or supplying an NZBN never reach these — only an explicit staff
 * decision does.
 */
export function taxReviewCompletesChecklist(status?: string | null): boolean {
  return status === 'confirmed' || status === 'not_required'
}
