import {
  checklistForWorkerType,
  onboardingSeedRows,
  isAllRequiredComplete,
  isStaffVerificationItem,
  SIGN_AUTO_COMPLETE_KEYS,
  STAFF_VERIFICATION_KEYS,
} from '@/lib/onboarding-checklist'
import { WORKFORCE_SETTINGS_DEFAULTS } from '@/lib/workforce-settings'

const keys = (arr: { item_key: string }[]) => arr.map((i) => i.item_key)

describe('onboarding checklist — signing auto-complete set', () => {
  it('auto-completes EXACTLY the three approved system items', () => {
    expect(SIGN_AUTO_COMPLETE_KEYS).toEqual(['confirm_details', 'bank_details', 'contract_signed'])
  })

  it('never overlaps with staff-verification items', () => {
    const overlap = SIGN_AUTO_COMPLETE_KEYS.filter((k) => STAFF_VERIFICATION_KEYS.includes(k))
    expect(overlap).toEqual([])
  })
})

describe('onboarding checklist — staff verification items', () => {
  it('are the five verification/sign-off keys', () => {
    expect(STAFF_VERIFICATION_KEYS).toEqual([
      'id_verified', 'insurance_verified', 'right_to_work_verified', 'tax_review', 'competency_confirmed',
    ])
  })

  it('a document upload cannot complete verification — uploaded vs verified are distinct kinds', () => {
    // The worker uploads *_uploaded; staff complete *_verified. They must be
    // different keys so an upload can never satisfy a verification.
    expect(isStaffVerificationItem('id_verified')).toBe(true)
    expect(isStaffVerificationItem('id_uploaded')).toBe(false)
    expect(isStaffVerificationItem('insurance_verified')).toBe(true)
    expect(isStaffVerificationItem('insurance_uploaded')).toBe(false)
    // None of the auto/worker-completable keys are verification keys.
    for (const k of ['id_uploaded', 'insurance_uploaded', 'right_to_work_uploaded', 'induction_completed', ...SIGN_AUTO_COMPLETE_KEYS]) {
      expect(isStaffVerificationItem(k)).toBe(false)
    }
  })
})

describe('onboarding checklist — worker-type filtering', () => {
  it('contractor list excludes right-to-work items unless required', () => {
    const without = keys(checklistForWorkerType('contractor'))
    expect(without).not.toContain('right_to_work_uploaded')
    expect(without).not.toContain('right_to_work_verified')

    const withRtw = keys(checklistForWorkerType('contractor', { rightToWorkRequired: true }))
    expect(withRtw).toContain('right_to_work_uploaded')
    expect(withRtw).toContain('right_to_work_verified')
  })

  it('contractor list contains the full upload/verify split', () => {
    const k = keys(checklistForWorkerType('contractor'))
    expect(k).toEqual([
      'confirm_details', 'bank_details',
      'id_uploaded', 'id_verified', 'insurance_uploaded', 'insurance_verified', 'tax_review',
      'contract_signed', 'induction_completed', 'competency_confirmed',
    ])
  })

  it('employee list is unchanged except the training→induction rename (no contractor upload/verify items)', () => {
    const k = keys(checklistForWorkerType('employee'))
    expect(k).toEqual([
      'confirm_details', 'bank_details', 'id_verified', 'ird_provided', 'kiwisaver',
      'contract_signed', 'induction_completed',
    ])
    for (const contractorOnly of ['id_uploaded', 'insurance_uploaded', 'insurance_verified', 'tax_review', 'competency_confirmed', 'right_to_work_uploaded', 'right_to_work_verified']) {
      expect(k).not.toContain(contractorOnly)
    }
  })
})

describe('onboarding checklist — seed rows', () => {
  it('produces pending rows keyed to the contractor', () => {
    const rows = onboardingSeedRows('c-1', 'contractor')
    expect(rows.every((r) => r.status === 'pending')).toBe(true)
    expect(rows.every((r) => r.contractor_id === 'c-1')).toBe(true)
    expect(rows).toHaveLength(10)
  })
})

describe('onboarding checklist — required completion (activation gating)', () => {
  const required = WORKFORCE_SETTINGS_DEFAULTS.contractor_required_items

  it('an existing active contractor stays complete after the migration (not blocked by new optional items)', () => {
    // Base required items complete (onboarding_training already renamed to
    // induction_completed); new verification items present but pending.
    const items = [
      { item_key: 'confirm_details', status: 'complete' },
      { item_key: 'bank_details', status: 'complete' },
      { item_key: 'id_verified', status: 'complete' },
      { item_key: 'insurance_uploaded', status: 'complete' },
      { item_key: 'contract_signed', status: 'complete' },
      { item_key: 'induction_completed', status: 'complete' },
      // newly-added optional items — pending
      { item_key: 'id_uploaded', status: 'pending' },
      { item_key: 'insurance_verified', status: 'pending' },
      { item_key: 'tax_review', status: 'pending' },
      { item_key: 'competency_confirmed', status: 'pending' },
    ]
    expect(isAllRequiredComplete(items, required)).toBe(true)
  })

  it('is false when a required item is still pending', () => {
    const items = [
      { item_key: 'confirm_details', status: 'complete' },
      { item_key: 'bank_details', status: 'complete' },
      { item_key: 'id_verified', status: 'pending' },
      { item_key: 'insurance_uploaded', status: 'complete' },
      { item_key: 'contract_signed', status: 'complete' },
      { item_key: 'induction_completed', status: 'complete' },
    ]
    expect(isAllRequiredComplete(items, required)).toBe(false)
  })

  it('a freshly-signed contractor (only the 3 system items complete) is NOT yet complete', () => {
    const items = onboardingSeedRows('c-2', 'contractor').map((r) => ({
      item_key: r.item_key,
      status: SIGN_AUTO_COMPLETE_KEYS.includes(r.item_key) ? 'complete' : 'pending',
    }))
    expect(isAllRequiredComplete(items, required)).toBe(false)
  })

  it('is false for an empty checklist', () => {
    expect(isAllRequiredComplete([], required)).toBe(false)
  })
})
