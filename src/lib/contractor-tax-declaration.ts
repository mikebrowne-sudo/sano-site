// Contractor IR330C tax declaration — pure model + validation (DB-free).
//
// Declaration-aware rate validation (NOT one blanket "≥10% always"): a
// contractor-chosen rate has a minimum (10% resident, 15% non-resident) unless a
// valid tailored-rate or exemption certificate applies. Exemption → no
// withholding. Rates are decimals (0.20 = 20%). Nothing here computes or deducts
// tax — that is a later PR. This governs the declaration record only.

export type DeclarationType =
  | 'ir330c_standard'    // standard rate for the activity
  | 'contractor_chosen'  // contractor elected a rate
  | 'tailored_rate'      // IR-issued tailored-rate certificate
  | 'exemption'          // certificate of exemption → 0% withholding
  | 'prescribed'         // reserved for future prescribed rates

export type DeclarationStatus = 'submitted' | 'verified' | 'rejected' | 'superseded'
export type ResidencyStatus = 'resident' | 'non_resident'

export const CONTRACTOR_DECLARATION_TEXT =
  'I declare that the information I have given in this tax rate notification is true and correct.'
export const CONTRACTOR_DECLARATION_VERSION = 'ir330c-declaration-2026-v1'

/** Normal minimum chosen rate. Residents 10%; non-residents 15% (higher default
 *  floor). A tailored-rate or exemption certificate can go below these. */
export const CHOSEN_RATE_MIN_RESIDENT = 0.10
export const CHOSEN_RATE_MIN_NON_RESIDENT = 0.15

export interface DeclarationInput {
  declarationType: DeclarationType
  residencyStatus?: ResidencyStatus | null
  withholdingRate?: number | null      // decimal
  tailoredRateCertificateRef?: string | null
  exemptionCertificateRef?: string | null
  expiryDate?: string | null           // ISO; required for tailored/exemption
  effectiveDate?: string | null
  contractingIrdNumber?: string | null
  ir330cActivityNumber?: string | null
}

/**
 * Validate a declaration's rate + certificate coherence. Declaration-aware:
 *  - exemption: no rate; an exemption certificate ref is required.
 *  - tailored_rate: a rate is required and MAY be below the normal minimum, but a
 *    tailored-rate certificate ref is required to justify it.
 *  - contractor_chosen / ir330c_standard: a rate is required and must be ≥ the
 *    residency minimum (10% resident, 15% non-resident).
 *  - prescribed: a rate is required (no minimum enforced here — reserved).
 * Never guesses a missing rate. Returns an error string or null.
 */
export function validateDeclarationRate(d: DeclarationInput): string | null {
  const rate = d.withholdingRate
  const hasRate = typeof rate === 'number' && !Number.isNaN(rate)

  if (d.declarationType === 'exemption') {
    if (!(d.exemptionCertificateRef ?? '').trim()) return 'An exemption certificate reference is required.'
    if (!(d.expiryDate ?? '').trim()) return 'An exemption certificate expiry date is required.'
    return null // no withholding rate for an exemption
  }

  if (!hasRate) return 'A withholding rate is required (as a decimal, e.g. 0.20 for 20%).'
  if (rate < 0 || rate >= 1) return 'The withholding rate must be a decimal between 0 and 1 (e.g. 0.20 for 20%).'

  if (d.declarationType === 'tailored_rate') {
    if (!(d.tailoredRateCertificateRef ?? '').trim()) return 'A tailored-rate certificate reference is required to use a tailored rate.'
    if (!(d.expiryDate ?? '').trim()) return 'A tailored-rate certificate expiry date is required.'
    return null // a valid tailored rate may be below the normal minimum
  }

  if (d.declarationType === 'contractor_chosen' || d.declarationType === 'ir330c_standard') {
    const min = d.residencyStatus === 'non_resident' ? CHOSEN_RATE_MIN_NON_RESIDENT : CHOSEN_RATE_MIN_RESIDENT
    if (rate < min) {
      return `The chosen rate must be at least ${(min * 100).toFixed(0)}%${d.residencyStatus === 'non_resident' ? ' for a non-resident' : ''} unless you hold a tailored-rate certificate.`
    }
    return null
  }

  return null // prescribed — reserved, no extra rule yet
}

export interface DeclarationRecord {
  id: string
  status: DeclarationStatus
  declarationType: DeclarationType
  withholdingRate: number | null
  expiryDate: string | null
  effectiveDate: string | null
}

/** Is a certificate-bearing declaration expired as of `today` (ISO)? Only
 *  tailored_rate and exemption carry an expiry that blocks. */
export function isDeclarationExpired(d: Pick<DeclarationRecord, 'declarationType' | 'expiryDate'>, todayIso: string): boolean {
  if (d.declarationType !== 'tailored_rate' && d.declarationType !== 'exemption') return false
  if (!d.expiryDate) return false
  return d.expiryDate < todayIso
}

/**
 * The effective tax state a declaration provides, for the tax gate. A declaration
 * only "satisfies" the gate when it is verified, current (not superseded/
 * rejected), and not expired.
 */
export interface DeclarationTaxState {
  /** Verified + current + not expired. */
  satisfiesGate: boolean
  /** An exemption (zero withholding later). */
  isExemption: boolean
  /** The rate the declaration carries (null for exemption). */
  rate: number | null
  reason: string
}

export function declarationTaxState(d: DeclarationRecord | null, todayIso: string): DeclarationTaxState {
  if (!d) return { satisfiesGate: false, isExemption: false, rate: null, reason: 'No tax declaration on file.' }
  if (d.status === 'submitted') return { satisfiesGate: false, isExemption: false, rate: d.withholdingRate, reason: 'Tax declaration is pending verification.' }
  if (d.status === 'rejected') return { satisfiesGate: false, isExemption: false, rate: null, reason: 'Tax declaration was rejected.' }
  if (d.status === 'superseded') return { satisfiesGate: false, isExemption: false, rate: null, reason: 'Tax declaration has been superseded.' }
  // verified:
  if (isDeclarationExpired(d, todayIso)) {
    return { satisfiesGate: false, isExemption: d.declarationType === 'exemption', rate: d.withholdingRate, reason: 'The certificate on the tax declaration has expired.' }
  }
  const isExemption = d.declarationType === 'exemption'
  return { satisfiesGate: true, isExemption, rate: isExemption ? 0 : d.withholdingRate, reason: isExemption ? 'Verified exemption — zero withholding.' : 'Verified tax declaration.' }
}

/**
 * Select the VERIFIED declaration that applies on a given supply/payment date —
 * date-based, NOT "newest row wins". Among verified declarations (current or
 * historically superseded), pick the one whose effective window covers the date:
 *   - effective_date <= supplyDate, AND
 *   - (no expiry OR supplyDate <= expiry), AND
 *   - it is the LATEST-effective such row (a future-effective replacement does
 *     not apply before its effective date; the prior one stays applicable).
 * A verified row with no effective_date is ignored (the DB CHECK forbids it, but
 * we stay defensive). Returns null when none applies on that date.
 */
export function selectDeclarationForDate<T extends { status: DeclarationStatus; effectiveDate: string | null; expiryDate: string | null; declarationType: DeclarationType }>(
  declarations: T[],
  supplyDateIso: string,
): T | null {
  const applicable = declarations.filter((d) =>
    d.status === 'verified' &&
    !!d.effectiveDate && d.effectiveDate <= supplyDateIso &&
    (!d.expiryDate || supplyDateIso <= d.expiryDate),
  )
  if (applicable.length === 0) return null
  // Latest effective date wins; ties broken by later expiry (defensive).
  return applicable.sort((a, b) =>
    (a.effectiveDate! < b.effectiveDate! ? 1 : a.effectiveDate! > b.effectiveDate! ? -1 : 0) ||
    ((a.expiryDate ?? '9999') < (b.expiryDate ?? '9999') ? 1 : -1),
  )[0]
}

/** Format a decimal rate as a percentage for display (0.20 → "20%"). */
export function formatRatePct(rate: number | null): string {
  if (rate == null) return '—'
  return `${(rate * 100).toFixed(rate * 100 % 1 === 0 ? 0 : 2)}%`
}
