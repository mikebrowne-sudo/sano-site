// Onboarding checklist template (Phase 2 — upload vs verification split).
//
// Single source of truth for the items seeded into the
// contractor_onboarding table when a worker is first created
// (via the agreement sign flow, or applicants.startContractorOnboarding,
// or the staff "Seed checklist" button).
//
// Each item is classified by `kind`, which defines WHO completes it:
//   • system — completed automatically by a Sano action (contractor
//     signing). Never a manual/staff tick. See SIGN_AUTO_COMPLETE_KEYS.
//   • worker — completed by the worker: an upload they provide, or an
//     induction they acknowledge. (In Phase 3 an upload auto-completes
//     the matching *_uploaded item — never a *_verified item.)
//   • staff  — a Sano staff verification/sign-off. MUST NEVER be
//     completed automatically because a document exists; only a staff
//     member may complete these. See STAFF_VERIFICATION_KEYS.
//
// `conditional: 'right_to_work'` items are seeded only when the
// contractor's right_to_work_required flag is true.
//
// `applies_to` controls per-worker-type filtering at seed time.

export type OnboardingApplies = 'both' | 'contractor' | 'employee'
export type OnboardingKind = 'system' | 'worker' | 'staff'

export interface OnboardingItemTemplate {
  section: string
  item_key: string
  label: string
  applies_to: OnboardingApplies
  kind: OnboardingKind
  /** Only seeded when the named condition holds. */
  conditional?: 'right_to_work'
  sort_order: number
}

export const ONBOARDING_SECTIONS = [
  'Personal Details',
  'Payment Details',
  'Compliance',
  'Documents',
  'Training',
  'Competency',
] as const

export const ONBOARDING_TEMPLATE: OnboardingItemTemplate[] = [
  // Personal Details
  { section: 'Personal Details', item_key: 'confirm_details',        label: 'Confirm personal details',            applies_to: 'both',       kind: 'system', sort_order: 10 },

  // Payment Details
  { section: 'Payment Details',  item_key: 'bank_details',           label: 'Bank account details provided',       applies_to: 'both',       kind: 'system', sort_order: 20 },

  // Compliance
  { section: 'Compliance',       item_key: 'id_uploaded',                  label: 'Photo ID uploaded',                   applies_to: 'both',       kind: 'worker', sort_order: 30 },
  { section: 'Compliance',       item_key: 'id_verified',                  label: 'ID verified',                         applies_to: 'both',       kind: 'staff',  sort_order: 31 },
  // Employee tax (IR330) — supplied by the worker, verified by payroll staff.
  { section: 'Compliance',       item_key: 'ir330_supplied',               label: 'IR330 tax details provided',          applies_to: 'employee',   kind: 'worker', sort_order: 32 },
  { section: 'Compliance',       item_key: 'payroll_tax_verified',         label: 'Payroll tax verified (IR330)',        applies_to: 'employee',   kind: 'staff',  sort_order: 33 },
  // Employee KiwiSaver — supplied by the worker, verified by payroll staff.
  { section: 'Compliance',       item_key: 'kiwisaver_information_supplied', label: 'KiwiSaver details provided',         applies_to: 'employee',   kind: 'worker', sort_order: 34 },
  { section: 'Compliance',       item_key: 'kiwisaver_verified',           label: 'KiwiSaver verified',                  applies_to: 'employee',   kind: 'staff',  sort_order: 35 },
  // Contractor insurance.
  { section: 'Compliance',       item_key: 'insurance_uploaded',           label: 'Public liability insurance uploaded', applies_to: 'contractor', kind: 'worker', sort_order: 36 },
  { section: 'Compliance',       item_key: 'insurance_verified',           label: 'Insurance verified',                  applies_to: 'contractor', kind: 'staff',  sort_order: 37 },
  // Right to work (both worker types; only when required).
  { section: 'Compliance',       item_key: 'right_to_work_uploaded',       label: 'Right-to-work evidence uploaded',     applies_to: 'both',       kind: 'worker', conditional: 'right_to_work', sort_order: 38 },
  { section: 'Compliance',       item_key: 'right_to_work_verified',       label: 'Right-to-work verified',              applies_to: 'both',       kind: 'staff',  conditional: 'right_to_work', sort_order: 39 },
  // Contractor trading-structure tax review (IR330C).
  { section: 'Compliance',       item_key: 'tax_review',                   label: 'Tax treatment reviewed (IR330C)',     applies_to: 'contractor', kind: 'staff',  sort_order: 40 },

  // Documents
  { section: 'Documents',        item_key: 'contract_signed',              label: 'Agreement signed',                    applies_to: 'both',       kind: 'system', sort_order: 45 },

  // Training
  { section: 'Training',         item_key: 'induction_completed',          label: 'Induction & policy modules completed', applies_to: 'both',      kind: 'worker', sort_order: 50 },

  // Competency
  { section: 'Competency',       item_key: 'competency_confirmed',         label: 'Competency confirmed',                applies_to: 'both',       kind: 'staff',  sort_order: 60 },
]

// The worker-supplied form items that are objectively satisfied once the
// worker completes and signs (they provided the information on the form).
// EMPLOYEE-only: contractors don't have these. id/right-to-work uploads are NOT
// here — those complete only when a real document exists.
export const SIGN_SUPPLIED_EMPLOYEE_KEYS = ['ir330_supplied', 'kiwisaver_information_supplied']

export interface ChecklistOptions {
  /** Include the conditional right-to-work items. */
  rightToWorkRequired?: boolean
}

export function checklistForWorkerType(
  workerType: 'contractor' | 'employee',
  opts: ChecklistOptions = {},
): OnboardingItemTemplate[] {
  const rtw = opts.rightToWorkRequired ?? false
  return ONBOARDING_TEMPLATE.filter((it) =>
    (it.applies_to === 'both' || it.applies_to === workerType) &&
    (it.conditional !== 'right_to_work' || rtw),
  )
}

export interface ChecklistSeedRow {
  contractor_id: string
  section: string
  item_key: string
  label: string
  sort_order: number
  status: 'pending'
}

/** Rows to insert/upsert into contractor_onboarding for a worker. */
export function onboardingSeedRows(
  contractorId: string,
  workerType: 'contractor' | 'employee',
  opts: ChecklistOptions = {},
): ChecklistSeedRow[] {
  return checklistForWorkerType(workerType, opts).map((it) => ({
    contractor_id: contractorId,
    section: it.section,
    item_key: it.item_key,
    label: it.label,
    sort_order: it.sort_order,
    status: 'pending' as const,
  }))
}

// The items completed automatically when a contractor signs their
// agreement — exactly the `system`-kind items. Nothing else may be
// auto-completed by the signing action.
export const SIGN_AUTO_COMPLETE_KEYS: string[] =
  ONBOARDING_TEMPLATE.filter((it) => it.kind === 'system').map((it) => it.item_key)

// Staff-only verification / sign-off items. These must NEVER be
// completed automatically (e.g. because a document exists) — only a
// staff member may complete them.
export const STAFF_VERIFICATION_KEYS: string[] =
  ONBOARDING_TEMPLATE.filter((it) => it.kind === 'staff').map((it) => it.item_key)

export function isStaffVerificationItem(itemKey: string): boolean {
  return STAFF_VERIFICATION_KEYS.includes(itemKey)
}

// Maps an uploaded document type to the WORKER-kind *_uploaded checklist
// item it satisfies. Deliberately NEVER maps to a *_verified (staff) item —
// a document upload can complete an "uploaded" step but can never complete
// a Sano verification.
export const DOC_TYPE_TO_UPLOAD_ITEM: Record<string, string> = {
  insurance: 'insurance_uploaded',
  id_verification: 'id_uploaded',
  right_to_work: 'right_to_work_uploaded',
}

/** The *_uploaded item keys satisfied by a set of uploaded document types. */
export function uploadedItemKeysForDocTypes(docTypes: Iterable<string>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  Array.from(docTypes).forEach((t) => {
    const key = DOC_TYPE_TO_UPLOAD_ITEM[t]
    if (key && !seen.has(key)) {
      seen.add(key)
      out.push(key)
    }
  })
  return out
}

/**
 * True when every REQUIRED item that exists for a worker is complete.
 * Mirrors the gating used by recomputeOnboardingStatus + OnboardingPanel:
 * only items present on the worker AND in the required set are counted,
 * so optional (non-required) items never block completion.
 */
export function isAllRequiredComplete(
  items: { item_key: string; status: string }[],
  requiredKeys: Iterable<string>,
): boolean {
  const required = new Set(requiredKeys)
  const requiredRows = items.filter((i) => required.has(i.item_key))
  return requiredRows.length > 0 && requiredRows.every((i) => i.status === 'complete')
}
