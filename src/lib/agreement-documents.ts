// Contractor-facing document types offered on the agreement sign flow
// (Phase 3). Stored in worker_documents.document_type. The values line up
// with the *_uploaded checklist items via DOC_TYPE_TO_UPLOAD_ITEM in
// onboarding-checklist.ts (insurance / id_verification / right_to_work).
// 'company' has no checklist item — it is stored for staff reference.

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

export const AGREEMENT_DOC_TYPE_VALUES: string[] = AGREEMENT_DOC_TYPES.map((d) => d.value)

export function agreementDocLabel(value: string): string {
  return AGREEMENT_DOC_TYPES.find((d) => d.value === value)?.label ?? value
}
