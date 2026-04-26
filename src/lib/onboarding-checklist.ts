// Phase 5.3 — Onboarding checklist template.
//
// Single source of truth for the items seeded into the
// contractor_onboarding table when a contractor is first created
// (currently via applicants.startContractorOnboarding).
//
// `applies_to` controls per-worker-type filtering at seed time.

export type OnboardingApplies = 'both' | 'contractor' | 'employee'

export interface OnboardingItemTemplate {
  section: string
  item_key: string
  label: string
  applies_to: OnboardingApplies
  sort_order: number
}

export const ONBOARDING_SECTIONS = [
  'Personal Details',
  'Payment Details',
  'Compliance',
  'Documents',
  'Training',
] as const

export const ONBOARDING_TEMPLATE: OnboardingItemTemplate[] = [
  // Personal Details
  { section: 'Personal Details', item_key: 'confirm_details',     label: 'Confirm personal details',           applies_to: 'both',       sort_order: 10 },

  // Payment Details
  { section: 'Payment Details',  item_key: 'bank_details',        label: 'Bank account details provided',      applies_to: 'both',       sort_order: 20 },

  // Compliance
  { section: 'Compliance',       item_key: 'id_verified',         label: 'ID verified',                        applies_to: 'both',       sort_order: 30 },
  { section: 'Compliance',       item_key: 'ird_provided',        label: 'IRD number provided',                applies_to: 'employee',   sort_order: 31 },
  { section: 'Compliance',       item_key: 'kiwisaver',           label: 'KiwiSaver opt-in / opt-out',         applies_to: 'employee',   sort_order: 32 },
  { section: 'Compliance',       item_key: 'insurance_uploaded',  label: 'Public liability insurance uploaded', applies_to: 'contractor', sort_order: 33 },

  // Documents
  { section: 'Documents',        item_key: 'contract_signed',     label: 'Contract signed',                    applies_to: 'both',       sort_order: 40 },

  // Training
  { section: 'Training',         item_key: 'onboarding_training', label: 'Onboarding training completed',      applies_to: 'both',       sort_order: 50 },
]

export function checklistForWorkerType(workerType: 'contractor' | 'employee'): OnboardingItemTemplate[] {
  return ONBOARDING_TEMPLATE.filter((it) =>
    it.applies_to === 'both' || it.applies_to === workerType,
  )
}
