import { isAllRequiredComplete } from '@/lib/onboarding-checklist'
import { isInductionComplete } from '@/lib/induction-modules'
import { requireOverrideReason, shouldGrandfather } from '@/lib/activation'
import { WORKFORCE_SETTINGS_DEFAULTS } from '@/lib/workforce-settings'

const REQUIRED = WORKFORCE_SETTINGS_DEFAULTS.contractor_required_items

// A fully-verified contractor with NO right-to-work rows (rtw not required).
const fullComplete = () => [
  'confirm_details', 'bank_details', 'contract_signed',
  'insurance_uploaded', 'insurance_verified',
  'id_uploaded', 'id_verified',
  'tax_review', 'induction_completed', 'competency_confirmed',
].map((item_key) => ({ item_key, status: 'complete' }))

describe('Phase 6 — required set (gating flip)', () => {
  it('requires the verification + competency items for contractors', () => {
    for (const k of ['insurance_uploaded', 'insurance_verified', 'id_uploaded', 'id_verified', 'tax_review', 'induction_completed', 'competency_confirmed']) {
      expect(REQUIRED).toContain(k)
    }
  })

  it('employee required items use their own gated set (Phase 7), without contractor-only items', () => {
    const emp = WORKFORCE_SETTINGS_DEFAULTS.employee_required_items
    for (const k of ['payroll_tax_verified', 'kiwisaver_verified', 'competency_confirmed', 'induction_completed']) {
      expect(emp).toContain(k)
    }
    for (const contractorOnly of ['insurance_verified', 'tax_review']) {
      expect(emp).not.toContain(contractorOnly)
    }
  })
})

describe('Phase 6 — activation gating', () => {
  it('is blocked when any required item is incomplete', () => {
    const items = fullComplete().map((i) => (i.item_key === 'competency_confirmed' ? { ...i, status: 'pending' } : i))
    expect(isAllRequiredComplete(items, REQUIRED)).toBe(false)
  })

  it('is allowed when all required items are complete', () => {
    expect(isAllRequiredComplete(fullComplete(), REQUIRED)).toBe(true)
  })

  it('competency_confirmed is the final flip: incomplete alone blocks, complete allows', () => {
    const withoutComp = fullComplete().filter((i) => i.item_key !== 'competency_confirmed')
      .concat([{ item_key: 'competency_confirmed', status: 'pending' }])
    expect(isAllRequiredComplete(withoutComp, REQUIRED)).toBe(false)
    expect(isAllRequiredComplete(fullComplete(), REQUIRED)).toBe(true)
  })
})

describe('Phase 6 — conditional right-to-work gating', () => {
  it('a contractor without RTW rows is not blocked by the RTW requirements', () => {
    // fullComplete() has no rtw rows; the rtw keys in REQUIRED are ignored.
    expect(isAllRequiredComplete(fullComplete(), REQUIRED)).toBe(true)
  })

  it('a contractor with pending RTW rows IS blocked until they are done', () => {
    const withPendingRtw = fullComplete().concat([
      { item_key: 'right_to_work_uploaded', status: 'complete' },
      { item_key: 'right_to_work_verified', status: 'pending' },
    ])
    expect(isAllRequiredComplete(withPendingRtw, REQUIRED)).toBe(false)

    const withDoneRtw = fullComplete().concat([
      { item_key: 'right_to_work_uploaded', status: 'complete' },
      { item_key: 'right_to_work_verified', status: 'complete' },
    ])
    expect(isAllRequiredComplete(withDoneRtw, REQUIRED)).toBe(true)
  })
})

describe('Phase 6 — induction feeds the gate only when all modules are done', () => {
  it('assignment alone does not satisfy induction', () => {
    const modules = [{ id: 'm1', requires_acknowledgement: true, requires_completion: true }]
    const assignedOnly = [{ training_module_id: 'm1', acknowledged_at: null, completed_at: null, status: 'assigned' }]
    expect(isInductionComplete(modules, assignedOnly)).toBe(false)
  })
})

describe('Phase 6 — admin override requires a reason', () => {
  it('rejects an empty/whitespace reason', () => {
    expect(requireOverrideReason('').ok).toBe(false)
    expect(requireOverrideReason('   ').ok).toBe(false)
    expect(requireOverrideReason(null).ok).toBe(false)
  })
  it('accepts a real reason', () => {
    expect(requireOverrideReason('Urgent cover — verified verbally').ok).toBe(true)
  })
})

describe('Phase 6 — legacy grandfathering rule', () => {
  it('grandfathers only ACTIVE contractors', () => {
    expect(shouldGrandfather({ worker_type: 'contractor', status: 'active' })).toBe(true)
  })
  it('does NOT grandfather inactive / onboarding contractors', () => {
    expect(shouldGrandfather({ worker_type: 'contractor', status: 'inactive' })).toBe(false)
    expect(shouldGrandfather({ worker_type: 'contractor', status: 'onboarding' })).toBe(false)
  })
  it('does NOT grandfather employees', () => {
    expect(shouldGrandfather({ worker_type: 'employee', status: 'active' })).toBe(false)
  })
})
