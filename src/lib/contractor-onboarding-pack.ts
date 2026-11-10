// Contractor onboarding pack — shared rules for the portal "Send onboarding
// pack" flow, the public agreement wizard and the signed document.
//
//   - GST expectation: staff say at send time whether the contractor is GST
//     registered (or not sure). It drives the rate wording and pre-fills the
//     wizard; the contractor still confirms it before signing.
//   - Personnel ("Your team"): a contractor trading through a company /
//     partnership / trust lists the people who may attend and confirms, in
//     writing, the checks done on each of them. This is the written notice and
//     approval clause 12 (Subcontracting) asks for, and backs the public
//     "every cleaner is background-checked" claim with a signed declaration.

export type GstExpectation = 'registered' | 'not_registered' | 'unsure'

export const GST_EXPECTATIONS: ReadonlyArray<{ value: GstExpectation; label: string }> = [
  { value: 'registered', label: 'GST registered' },
  { value: 'not_registered', label: 'Not GST registered' },
  { value: 'unsure', label: 'Not sure — they confirm it' },
]

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** Split a GST-inclusive amount into its ex-GST and GST parts (15%). */
export function splitGstInclusive(inclusive: number): { exGst: number; gst: number } {
  const exGst = round2(inclusive / 1.15)
  return { exGst, gst: round2(inclusive - exGst) }
}

/**
 * Hourly-rate wording for a contractor. `registered` is the confirmed answer at
 * signing when known, otherwise staff's expectation from the send.
 *   registered     → "$45.00 per hour incl. GST ($39.13 + $5.87 GST)"
 *   not registered → "$45.00 per hour (no GST — not GST registered)"
 *   unknown        → "$45.00 per hour (inclusive of GST where registered)"
 */
export function contractorRateLabel(rate: number | null, registered: boolean | null): string {
  if (rate == null) return '—'
  const r = `$${rate.toFixed(2)} per hour`
  if (registered === true) {
    const { exGst, gst } = splitGstInclusive(rate)
    return `${r} incl. GST ($${exGst.toFixed(2)} + $${gst.toFixed(2)} GST)`
  }
  if (registered === false) return `${r} (no GST — not GST registered)`
  return `${r} (inclusive of GST where registered)`
}

/** Expectation → boolean (unsure = unknown). */
export function gstExpectationToBool(e: string | null | undefined): boolean | null {
  return e === 'registered' ? true : e === 'not_registered' ? false : null
}

/** Structures that send people other than the signer, so get the "Your team" step. */
export function needsPersonnelStep(structure: string | null | undefined): boolean {
  return ['company', 'partnership', 'trust', 'other'].includes(structure ?? '')
}

export interface PersonnelEntry {
  name: string
  phone: string | null
}

export const MAX_PERSONNEL = 30

/** Trim, drop blank rows, de-duplicate by name, cap the list. */
export function normalisePersonnel(rows: ReadonlyArray<{ name?: string | null; phone?: string | null }>): PersonnelEntry[] {
  const seen = new Set<string>()
  const out: PersonnelEntry[] = []
  for (const r of rows) {
    const name = (r.name ?? '').trim().replace(/\s+/g, ' ')
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ name, phone: (r.phone ?? '').trim() || null })
    if (out.length >= MAX_PERSONNEL) break
  }
  return out
}

export const PERSONNEL_DECLARATION_VERSION = 'SANO-PERSONNEL-2026.11'

/** Frozen onto the agreement at signing (with the version) — never re-derived. */
export const PERSONNEL_DECLARATION_TEXT =
  'On behalf of the Contractor, I confirm that each person listed, and anyone the Contractor sends to perform the Services in future: ' +
  '(a) is employed or engaged by the Contractor, which is responsible for their pay, tax, ACC and conduct; ' +
  '(b) has had their identity checked and has the legal right to work in New Zealand; ' +
  '(c) has been background-checked by the Contractor and found suitable to work in clients’ homes and premises; and ' +
  '(d) has been briefed on the Principal’s site, security, and health and safety requirements. ' +
  'The Contractor will tell the Principal in writing before sending anyone not listed, and will provide evidence of these checks on request.'
