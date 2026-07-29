// Structure-aware contractor agreement field rules (pure, DB-free).
//
// Decides which entity fields appear + are required for each contracting
// structure, and whether an authorised signatory + capacity is needed. Used by
// the sign form (what to show), the sign action (what to validate), and the
// document (what to render) so all three stay consistent. No clause wording here
// — this governs FIELDS only.

export type ContractingStructure = 'sole_trader' | 'company' | 'partnership' | 'trust' | 'other'

/** The exact authority-to-bind declaration an ENTITY signatory must confirm, and
 *  its version. Snapshotted onto the agreement at sign (text + version + when) so
 *  the signed record reflects precisely what was agreed. Bump the version if the
 *  wording ever changes. Not shown to a sole trader. */
export const AUTHORITY_TO_BIND_DECLARATION =
  'I confirm that I am authorised to enter into and sign this agreement on behalf of the contracting entity.'
export const AUTHORITY_TO_BIND_VERSION = 'authority-to-bind-2026-v1'

/** Does this structure require the authority-to-bind declaration? Entities only
 *  (company / partnership / trust). 'other' also requires it (it is an entity);
 *  sole trader never does. */
export function requiresAuthorityDeclaration(structure: ContractingStructure): boolean {
  return structure !== 'sole_trader'
}

export const CONTRACTING_STRUCTURES: { value: ContractingStructure; label: string }[] = [
  { value: 'sole_trader', label: 'Sole trader' },
  { value: 'company', label: 'Company' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'trust', label: 'Trust' },
  { value: 'other', label: 'Other' },
]

export interface StructureFieldRules {
  /** An entity (not a sole trader) — signs via an authorised person. */
  isEntity: boolean
  /** Show/collect a legal entity name (company/trust/partnership/other). */
  legalName: { show: boolean; required: boolean; label: string }
  /** Company number — company only. */
  companyNumber: { show: boolean; required: boolean }
  /** NZBN — shown for all; required for none (optional but encouraged). */
  nzbn: { show: boolean; required: boolean }
  /** Trading name — optional everywhere. */
  tradingName: { show: boolean; required: boolean }
  /** Authorised signatory name + capacity — entities only. */
  signatory: { show: boolean; required: boolean }
}

/** The field rules for a structure. Sole trader signs personally (no signatory
 *  block, no legal-entity name); a company needs a legal name + company number +
 *  an authorised signatory; partnership/trust need a legal name + signatory. */
export function structureFieldRules(structure: ContractingStructure): StructureFieldRules {
  const isEntity = structure !== 'sole_trader'
  const legalNameLabel =
    structure === 'company' ? 'Company legal name'
    : structure === 'trust' ? 'Trust name'
    : structure === 'partnership' ? 'Partnership name'
    : structure === 'other' ? 'Entity name'
    : 'Legal name'
  return {
    isEntity,
    legalName: { show: isEntity, required: structure === 'company' || structure === 'trust' || structure === 'partnership', label: legalNameLabel },
    companyNumber: { show: structure === 'company', required: structure === 'company' },
    nzbn: { show: true, required: false },
    tradingName: { show: true, required: false },
    signatory: { show: isEntity, required: structure === 'company' || structure === 'trust' || structure === 'partnership' },
  }
}

export interface StructureSubmission {
  structure: ContractingStructure
  fullName: string
  legalName?: string | null
  companyNumber?: string | null
  nzbn?: string | null
  signatoryName?: string | null
  signatoryCapacity?: string | null
  /** Entity signatory's active confirmation of authority to bind the entity.
   *  Mandatory for company/partnership/trust; ignored for a sole trader. */
  authorityConfirmed?: boolean
  /** The typed e-signature. */
  signedName: string
}

/**
 * Validate a structure submission. Returns an error string or null.
 *  - sole trader: the signature must match the individual's full legal name.
 *  - entity: a legal entity name is required (company/trust/partnership); an
 *    authorised signatory name + capacity is required; the signature must match
 *    the signatory's name (they are signing on the entity's behalf).
 */
export function validateStructureSubmission(s: StructureSubmission): string | null {
  const rules = structureFieldRules(s.structure)
  const sig = (s.signedName ?? '').trim().toLowerCase()

  if (rules.legalName.required && !(s.legalName ?? '').trim()) {
    return `${rules.legalName.label} is required for a ${s.structure.replace('_', ' ')}.`
  }
  if (rules.companyNumber.required && !(s.companyNumber ?? '').trim()) {
    return 'Company number is required for a company.'
  }

  if (rules.isEntity) {
    if (rules.signatory.required) {
      if (!(s.signatoryName ?? '').trim()) return 'The authorised signatory’s name is required.'
      if (!(s.signatoryCapacity ?? '').trim()) return 'The signatory’s capacity (e.g. Director, Trustee, Partner) is required.'
    }
    // Authority-to-bind declaration is mandatory for every entity structure.
    if (requiresAuthorityDeclaration(s.structure) && s.authorityConfirmed !== true) {
      return 'Please confirm you are authorised to sign on behalf of the contracting entity.'
    }
    // The signature must match whoever is signing on the entity's behalf.
    const signatory = (s.signatoryName ?? s.fullName ?? '').trim().toLowerCase()
    if (signatory && sig && sig !== signatory) {
      return 'The signature must match the authorised signatory’s name.'
    }
    return null
  }

  // Sole trader signs personally.
  if (sig && s.fullName.trim() && sig !== s.fullName.trim().toLowerCase()) {
    return 'The signature must match your full legal name.'
  }
  return null
}

/** Entity display lines for the signed document (name + number + NZBN). */
export function entityDisplayLines(input: {
  structure?: string | null
  legalName?: string | null
  tradingName?: string | null
  companyNumber?: string | null
  nzbn?: string | null
  registeredAddress?: string | null
}): string[] {
  const lines: string[] = []
  if (input.legalName) lines.push(input.legalName)
  if (input.tradingName && input.tradingName !== input.legalName) lines.push(`Trading as ${input.tradingName}`)
  if (input.companyNumber) lines.push(`Company no. ${input.companyNumber}`)
  if (input.nzbn) lines.push(`NZBN ${input.nzbn}`)
  if (input.registeredAddress) lines.push(input.registeredAddress)
  return lines
}
