import {
  checklistForWorkerType,
  isAllRequiredComplete,
  uploadedItemKeysForDocTypes,
  SIGN_AUTO_COMPLETE_KEYS,
  SIGN_SUPPLIED_EMPLOYEE_KEYS,
  STAFF_VERIFICATION_KEYS,
} from '@/lib/onboarding-checklist'
import { agreementDocTypesForWorker } from '@/lib/agreement-documents'
import { seedAndAutoCompleteOnboardingOnSign } from '@/lib/onboarding-sign'
import { WORKFORCE_SETTINGS_DEFAULTS } from '@/lib/workforce-settings'

const keys = (arr: { item_key: string }[]) => arr.map((i) => i.item_key)

describe('Phase 7 — employee checklist', () => {
  it('has the employee-specific items and none of the contractor-only items', () => {
    const k = keys(checklistForWorkerType('employee'))
    expect(k).toEqual([
      'confirm_details', 'bank_details',
      'id_uploaded', 'id_verified',
      'ir330_supplied', 'payroll_tax_verified',
      'kiwisaver_information_supplied', 'kiwisaver_verified',
      'contract_signed', 'induction_completed', 'competency_confirmed',
    ])
    for (const contractorOnly of ['insurance_uploaded', 'insurance_verified', 'tax_review']) {
      expect(k).not.toContain(contractorOnly)
    }
  })

  it('adds right-to-work items only when required', () => {
    expect(keys(checklistForWorkerType('employee'))).not.toContain('right_to_work_uploaded')
    const withRtw = keys(checklistForWorkerType('employee', { rightToWorkRequired: true }))
    expect(withRtw).toContain('right_to_work_uploaded')
    expect(withRtw).toContain('right_to_work_verified')
  })

  it('keeps the contractor checklist separate (no employee tax/kiwisaver items)', () => {
    const k = keys(checklistForWorkerType('contractor'))
    expect(k).toContain('insurance_uploaded')
    expect(k).toContain('tax_review')
    for (const employeeOnly of ['ir330_supplied', 'payroll_tax_verified', 'kiwisaver_information_supplied', 'kiwisaver_verified']) {
      expect(k).not.toContain(employeeOnly)
    }
  })

  it('payroll tax + kiwisaver verification are staff-only', () => {
    expect(STAFF_VERIFICATION_KEYS).toContain('payroll_tax_verified')
    expect(STAFF_VERIFICATION_KEYS).toContain('kiwisaver_verified')
  })
})

describe('Phase 7 — employee document types', () => {
  it('offers ID + right-to-work only (IR330 + KiwiSaver are captured online, not uploaded)', () => {
    expect(agreementDocTypesForWorker('employee').map((d) => d.value)).toEqual([
      'id_verification', 'right_to_work',
    ])
  })

  it('the ir330/kiwisaver doc types still map to NO checklist item (defensive)', () => {
    expect(uploadedItemKeysForDocTypes(['ir330', 'kiwisaver'])).toEqual([])
    // ID + RTW still complete their uploaded items
    expect(uploadedItemKeysForDocTypes(['id_verification', 'right_to_work'])).toEqual(['id_uploaded', 'right_to_work_uploaded'])
  })
})

describe('Phase 7 — employee activation gating', () => {
  const REQ = WORKFORCE_SETTINGS_DEFAULTS.employee_required_items
  const fullComplete = () => [
    'confirm_details', 'bank_details', 'contract_signed',
    'id_uploaded', 'id_verified',
    'ir330_supplied', 'payroll_tax_verified',
    'kiwisaver_information_supplied', 'kiwisaver_verified',
    'induction_completed', 'competency_confirmed',
  ].map((item_key) => ({ item_key, status: 'complete' }))

  it('is blocked until payroll tax is verified', () => {
    const pending = fullComplete().map((i) => (i.item_key === 'payroll_tax_verified' ? { ...i, status: 'pending' } : i))
    expect(isAllRequiredComplete(pending, REQ)).toBe(false)
  })

  it('is allowed when all required items are complete', () => {
    expect(isAllRequiredComplete(fullComplete(), REQ)).toBe(true)
  })
})

// Minimal thenable fake to assert what the employee sign-seed completes, and
// with which completion_source (Phase 2 — system vs worker-supplied are written
// as SEPARATE, correctly-sourced updates).
type UpdateCall = { filters: [string, string, unknown][]; payload: Record<string, unknown> }
function makeFakeClient(updateReturns: { item_key: string }[]) {
  const calls = { upserts: [] as { rows: unknown[] }[], updates: [] as UpdateCall[] }
  function from() {
    let isUpdate = false
    let payload: Record<string, unknown> = {}
    const filters: [string, string, unknown][] = []
    const chain: Record<string, unknown> = {}
    chain.upsert = ((rows: unknown[]) => { calls.upserts.push({ rows }); return Promise.resolve({ data: null, error: null }) }) as never
    chain.update = ((p: Record<string, unknown>) => { isUpdate = true; payload = p; return chain }) as never
    chain.eq = ((c: string, v: unknown) => { filters.push(['eq', c, v]); return chain }) as never
    chain.in = ((c: string, v: unknown) => { filters.push(['in', c, v]); return chain }) as never
    chain.insert = (() => Promise.resolve({ data: null, error: null })) as never
    chain.select = (() => { if (isUpdate) calls.updates.push({ filters, payload }); return Promise.resolve({ data: updateReturns, error: null }) }) as never
    return chain
  }
  return { client: { from }, calls }
}

const inKeys = (u: UpdateCall) => u.filters.find((f) => f[0] === 'in' && f[1] === 'item_key')?.[2]

describe('Phase 7 — employee signing auto-completes system + supplied items', () => {
  it('completes system items and worker-supplied items as separate, correctly-sourced updates', async () => {
    const { client, calls } = makeFakeClient([])
    await seedAndAutoCompleteOnboardingOnSign(client, { contractorId: 'e-1', agreementId: 'a-1', workerType: 'employee' })
    // Two updates: system-kind items, then the employee-supplied declaration items.
    expect(calls.updates.length).toBe(2)
    expect(inKeys(calls.updates[0])).toEqual(SIGN_AUTO_COMPLETE_KEYS)
    expect(calls.updates[0].payload.completion_source).toBe('system_completed')
    expect(inKeys(calls.updates[1])).toEqual(SIGN_SUPPLIED_EMPLOYEE_KEYS)
    expect(calls.updates[1].payload.completion_source).toBe('worker_submitted')
  })

  it('a contractor signing does NOT complete the employee supplied items (one system update only)', async () => {
    const { client, calls } = makeFakeClient([])
    await seedAndAutoCompleteOnboardingOnSign(client, { contractorId: 'c-1', agreementId: 'a-1', workerType: 'contractor' })
    expect(calls.updates.length).toBe(1)
    expect(inKeys(calls.updates[0])).toEqual(SIGN_AUTO_COMPLETE_KEYS)
    expect(calls.updates[0].payload.completion_source).toBe('system_completed')
  })
})
