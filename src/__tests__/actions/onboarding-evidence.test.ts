/** @jest-environment node */

// Phase 2 — onboarding checklist evidence model + override controls.
//
// Pure-model tests (classification, source, override-field validation) plus
// action-level tests (guard, staff-verify, admin override) with a mocked
// Supabase client. recompute/gating is deliberately UNCHANGED — the mock lets it
// run without asserting new behaviour there.

import {
  STAFF_VERIFY_KEYS,
  WORKFLOW_OWNED_KEYS,
  isStaffVerifyItem,
  isWorkflowOwnedItem,
  workflowCompletionSource,
  validateOverrideFields,
  ONBOARDING_TEMPLATE,
} from '@/lib/onboarding-checklist'

describe('Phase 2 — item classification', () => {
  it('every template item is classified exactly once (nothing falls through)', () => {
    for (const it of ONBOARDING_TEMPLATE) {
      const staff = isStaffVerifyItem(it.item_key)
      const workflow = isWorkflowOwnedItem(it.item_key)
      expect(staff !== workflow).toBe(true) // exactly one is true
    }
  })
  it('staff-verify items are exactly the *_verified sign-offs', () => {
    expect([...STAFF_VERIFY_KEYS].sort()).toEqual(
      ['id_verified', 'insurance_verified', 'kiwisaver_verified', 'payroll_tax_verified', 'right_to_work_verified'].sort(),
    )
  })
  it('evidence-backed workflow items are NOT staff-verify (blocked from the toggle)', () => {
    for (const k of ['induction_completed', 'competency_confirmed', 'ir330_supplied', 'kiwisaver_information_supplied', 'contract_signed', 'tax_review', 'id_uploaded']) {
      expect(isWorkflowOwnedItem(k)).toBe(true)
      expect(isStaffVerifyItem(k)).toBe(false)
    }
  })
  it('WORKFLOW_OWNED ∪ STAFF_VERIFY covers all template keys', () => {
    const all = new Set(ONBOARDING_TEMPLATE.map((i) => i.item_key))
    const classified = new Set([...WORKFLOW_OWNED_KEYS, ...STAFF_VERIFY_KEYS])
    expect(classified).toEqual(all)
  })
})

describe('Phase 2 — workflowCompletionSource', () => {
  it.each([
    ['confirm_details', 'system_completed'],
    ['bank_details', 'system_completed'],
    ['contract_signed', 'system_completed'],
    ['induction_completed', 'worker_acknowledged'],
    ['id_uploaded', 'worker_submitted'],
    ['insurance_uploaded', 'worker_submitted'],
    ['ir330_supplied', 'worker_submitted'],
    ['kiwisaver_information_supplied', 'worker_submitted'],
    ['tax_review', 'staff_verified'],
    ['competency_confirmed', 'staff_verified'],
  ])('%s → %s', (key, source) => {
    expect(workflowCompletionSource(key)).toBe(source)
  })
})

describe('Phase 2 — validateOverrideFields', () => {
  it('requires reason, effective date and confirmed-by', () => {
    expect(validateOverrideFields({})).toMatch(/reason/i)
    expect(validateOverrideFields({ reason: 'x' })).toMatch(/effective/i)
    expect(validateOverrideFields({ reason: 'x', effectiveDate: '2026-07-01' })).toMatch(/confirmed/i)
  })
  it('passes when all three are present', () => {
    expect(validateOverrideFields({ reason: 'x', effectiveDate: '2026-07-01', confirmedBy: 'Carol' })).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Action-level tests
// ---------------------------------------------------------------------------
jest.mock('@/lib/supabase-server')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/is-admin', () => ({ isAdminUser: jest.fn() }))
jest.mock('@/lib/workforce-settings', () => ({
  loadWorkforceSettings: jest.fn().mockResolvedValue({
    require_admin_activation_approval: true,
    contractor_required_items: [],
    employee_required_items: [],
  }),
  requiredItemsForWorkerType: jest.fn().mockReturnValue([]),
}))

import { setOnboardingItemStatus, overrideOnboardingItem } from '@/app/portal/contractors/[id]/_actions-onboarding'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'

const mockedCreate = createClient as unknown as jest.Mock
const mockedIsAdmin = isAdminUser as unknown as jest.Mock

// A Supabase mock that captures the onboarding update payload + audit inserts,
// and satisfies the recompute reads that follow.
function makeClient(item: { item_key: string; status: string } | null) {
  const captured: { onboardingUpdate?: Record<string, unknown>; audit?: Record<string, unknown> } = {}

  const from = jest.fn().mockImplementation((table: string) => {
    if (table === 'contractor_onboarding') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: item, error: null }),
        // recompute reads all items with .select().eq() (thenable)
        then: undefined,
        update: (payload: Record<string, unknown>) => {
          captured.onboardingUpdate = payload
          return { eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) }
        },
      }
    }
    if (table === 'contractors') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { worker_type: 'employee', status: 'onboarding', onboarding_status: 'in_progress', trial_required: false, trial_status: null, onboarding_grandfathered: false },
          error: null,
        }),
        update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
      }
    }
    if (table === 'audit_log') {
      return { insert: jest.fn().mockImplementation((row: Record<string, unknown>) => { captured.audit = row; return Promise.resolve({ error: null }) }) }
    }
    return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }
  })

  // contractor_onboarding recompute uses .select().eq() without maybeSingle —
  // make that chain resolve to an array.
  const client = {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) },
    from,
  }
  return { client, captured }
}

beforeEach(() => { jest.clearAllMocks(); mockedIsAdmin.mockReturnValue(true) })

describe('setOnboardingItemStatus — guard', () => {
  it('BLOCKS generic completion of a workflow-owned item (induction)', async () => {
    const { client, captured } = makeClient({ item_key: 'induction_completed', status: 'pending' })
    mockedCreate.mockReturnValue(client)
    const res = await setOnboardingItemStatus({ itemId: 'i1', contractorId: 'c1', status: 'complete' })
    expect('error' in res).toBe(true)
    expect(captured.onboardingUpdate).toBeUndefined() // never wrote
  })

  it('ALLOWS a genuine staff-verification item and stamps staff_verified', async () => {
    const { client, captured } = makeClient({ item_key: 'id_verified', status: 'pending' })
    mockedCreate.mockReturnValue(client)
    const res = await setOnboardingItemStatus({ itemId: 'i2', contractorId: 'c1', status: 'complete' })
    expect('ok' in res).toBe(true)
    expect(captured.onboardingUpdate?.completion_source).toBe('staff_verified')
    expect(captured.onboardingUpdate?.completed_by).toBe('admin-1')
  })

  it('reopening clears completion + all evidence fields', async () => {
    const { client, captured } = makeClient({ item_key: 'id_verified', status: 'complete' })
    mockedCreate.mockReturnValue(client)
    await setOnboardingItemStatus({ itemId: 'i2', contractorId: 'c1', status: 'pending' })
    expect(captured.onboardingUpdate).toMatchObject({
      status: 'pending', completed_at: null, completed_by: null, completion_source: null,
      override_reason: null, override_by: null, effective_date: null, confirmed_by: null, evidence_ref: null,
    })
  })
})

describe('overrideOnboardingItem', () => {
  it('is admin-only', async () => {
    mockedIsAdmin.mockReturnValue(false)
    const { client } = makeClient({ item_key: 'induction_completed', status: 'pending' })
    mockedCreate.mockReturnValue(client)
    const res = await overrideOnboardingItem({ itemId: 'i1', contractorId: 'c1', reason: 'r', effectiveDate: '2026-07-01', confirmedBy: 'Carol' })
    expect(res).toEqual({ error: 'Admin only.' })
  })

  it('requires reason, effective date and confirmed-by', async () => {
    const { client } = makeClient({ item_key: 'induction_completed', status: 'pending' })
    mockedCreate.mockReturnValue(client)
    const res = await overrideOnboardingItem({ itemId: 'i1', contractorId: 'c1', reason: '', effectiveDate: '', confirmedBy: '' })
    expect('error' in res).toBe(true)
  })

  it('writes admin_override source + evidence + an audit row', async () => {
    const { client, captured } = makeClient({ item_key: 'induction_completed', status: 'pending' })
    mockedCreate.mockReturnValue(client)
    const res = await overrideOnboardingItem({
      itemId: 'i1', contractorId: 'c1', reason: 'inducted in person', effectiveDate: '2026-07-10', confirmedBy: 'Carol', evidenceRef: 'signed form #12',
    })
    expect('ok' in res).toBe(true)
    expect(captured.onboardingUpdate).toMatchObject({
      status: 'complete', completion_source: 'admin_override', override_by: 'admin-1',
      override_reason: 'inducted in person', effective_date: '2026-07-10', confirmed_by: 'Carol', evidence_ref: 'signed form #12',
    })
    expect(captured.audit?.action).toBe('contractor.onboarding_item_override')
  })
})
