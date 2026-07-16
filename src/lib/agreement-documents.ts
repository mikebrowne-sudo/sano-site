// Contractor-facing document types offered on the agreement sign flow
// (Phase 3). Stored in worker_documents.document_type. The values line up
// with the *_uploaded checklist items via DOC_TYPE_TO_UPLOAD_ITEM in
// onboarding-checklist.ts (insurance / id_verification / right_to_work).
// 'company' has no checklist item — it is stored for staff reference.

import { ir330cLikelyRequired } from './tax-review'

export interface AgreementDocType {
  value: string
  label: string
  hint?: string
}

export const AGREEMENT_DOC_TYPES: readonly AgreementDocType[] = [
  { value: 'insurance',       label: 'Public liability insurance certificate', hint: 'Current certificate of currency' },
  { value: 'id_verification', label: 'Photo ID',                               hint: 'Passport or driver licence' },
  { value: 'right_to_work',   label: 'Right-to-work evidence',                 hint: 'Only if you work on a visa' },
  { value: 'company',         label: 'Company / NZBN evidence',                hint: 'If you invoice via a company' },
]

// IR330C is offered only to individuals (sole trader / other). It carries NO
// checklist item (see DOC_TYPE_TO_UPLOAD_ITEM) — uploading it never completes
// tax_review; that stays a staff-only confirmation.
export const IR330C_DOC_TYPE: AgreementDocType = {
  value: 'ir330c',
  label: 'IR330C tax form',
  hint: 'If you invoice as a sole trader / individual',
}

/** The document slots to show a contractor for their trading structure. */
export function agreementDocTypesForStructure(structure?: string | null): AgreementDocType[] {
  const base = AGREEMENT_DOC_TYPES.slice()
  if (ir330cLikelyRequired(structure)) base.push(IR330C_DOC_TYPE)
  return base
}

// All document types the upload action will accept (validation whitelist).
export const AGREEMENT_DOC_TYPE_VALUES: string[] = [
  ...AGREEMENT_DOC_TYPES.map((d) => d.value),
  IR330C_DOC_TYPE.value,
]

export function agreementDocLabel(value: string): string {
  if (value === IR330C_DOC_TYPE.value) return IR330C_DOC_TYPE.label
  return AGREEMENT_DOC_TYPES.find((d) => d.value === value)?.label ?? value
}
