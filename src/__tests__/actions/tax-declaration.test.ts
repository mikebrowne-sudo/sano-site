/** @jest-environment node */

// Phase 3 — immutable IR330 tax declaration workflow.

import {
  IR330_DECLARATION_VERSION,
  IR330_DECLARATION_TEXT,
  maskIrd,
  taxCodeHasStudentLoan,
  validateTaxDeclaration,
  recordTaxDeclaration,
} from '@/lib/tax-declaration'

describe('tax-declaration pure helpers', () => {
  it('has a version + non-trivial declaration wording', () => {
    expect(IR330_DECLARATION_VERSION).toMatch(/IR330/)
    expect(IR330_DECLARATION_TEXT.length).toBeGreaterThan(40)
    expect(IR330_DECLARATION_TEXT).toMatch(/I declare/i)
  })
  it('masks the IRD number to the last 3 digits', () => {
    expect(maskIrd('123-456-789')).toBe('•••-•••-789')
    expect(maskIrd(null)).toBe('—')
  })
  it('derives student loan from the tax code', () => {
    expect(taxCodeHasStudentLoan('M SL')).toBe(true)
    expect(taxCodeHasStudentLoan('SH SL')).toBe(true)
    expect(taxCodeHasStudentLoan('M')).toBe(false)
  })
  it('validateTaxDeclaration requires name, code, acknowledgement and signature', () => {
    expect(validateTaxDeclaration({})).toMatch(/name/i)
    expect(validateTaxDeclaration({ employeeLegalName: 'A' })).toMatch(/tax code/i)
    expect(validateTaxDeclaration({ employeeLegalName: 'A', declaredTaxCode: 'M' })).toMatch(/confirm/i)
    expect(validateTaxDeclaration({ employeeLegalName: 'A', declaredTaxCode: 'M', acknowledged: true })).toMatch(/signature/i)
    expect(validateTaxDeclaration({ employeeLegalName: 'A', declaredTaxCode: 'M', acknowledged: true, signedName: 'A' })).toBeNull()
  })
})

// A capturing mock client for the record/verify flows.
function makeClient(cfg: { prior?: { id: string } | null; decl?: Record<string, unknown> | null; contractorRead?: Record<string, unknown> | null }) {
  const cap = {
    declInsert: null as Record<string, unknown> | null,
    declUpdates: [] as { payload: Record<string, unknown>; filters: [string, unknown][] }[],
    onboardingUpdates: [] as { payload: Record<string, unknown>; filters: [string, unknown][] }[],
    contractorUpdates: [] as Record<string, unknown>[],
    audit: null as Record<string, unknown> | null,
  }
  function from(table: string) {
    const st = { insert: false, update: false, payload: null as Record<string, unknown> | null, filters: [] as [string, unknown][] }
    const record = () => {
      if (st.insert && table === 'worker_tax_declarations') cap.declInsert = st.payload
      if (st.update && table === 'worker_tax_declarations') cap.declUpdates.push({ payload: st.payload!, filters: st.filters })
      if (st.update && table === 'contractor_onboarding') cap.onboardingUpdates.push({ payload: st.payload!, filters: st.filters })
      if (st.update && table === 'contractors') cap.contractorUpdates.push(st.payload!)
      if (st.insert && table === 'audit_log') cap.audit = st.payload
    }
    const read = () => {
      if (table === 'worker_tax_declarations') return { data: cfg.prior !== undefined && st.filters.some((f) => f[0] === 'worker_id') && !cfg.decl ? cfg.prior : (cfg.decl ?? cfg.prior ?? null), error: null }
      if (table === 'contractors') return { data: cfg.contractorRead ?? null, error: null }
      return { data: null, error: null }
    }
    const chain: Record<string, unknown> = {}
    chain.select = () => chain
    chain.insert = (p: Record<string, unknown>) => { st.insert = true; st.payload = p; return chain }
    chain.update = (p: Record<string, unknown>) => { st.update = true; st.payload = p; return chain }
    chain.eq = (c: string, v: unknown) => { st.filters.push([c, v]); return chain }
    chain.neq = (c: string, v: unknown) => { st.filters.push([`neq:${c}`, v]); return chain }
    chain.maybeSingle = () => { if (st.insert) { record(); return Promise.resolve({ data: { id: 'new-decl', declaration_number: 'TAX-0002' }, error: null }) } return Promise.resolve(read()) }
    chain.single = () => { if (st.insert) { record(); return Promise.resolve({ data: { id: 'new-decl', declaration_number: 'TAX-0002' }, error: null }) } return Promise.resolve(read()) }
    chain.then = (resolve: (v: unknown) => void) => { record(); resolve({ data: null, error: null }) }
    return chain
  }
  return { client: { from }, cap }
}

describe('recordTaxDeclaration', () => {
  const facts = { workerId: 'e-1', employeeLegalName: 'Jane Doe', irdNumber: '123-456-789', declaredTaxCode: 'M SL', signedName: 'Jane Doe', acknowledged: true, agreementId: 'a-1' }

  it('rejects an incomplete declaration', async () => {
    const { client } = makeClient({ prior: null })
    const res = await recordTaxDeclaration(client, { ...facts, acknowledged: false })
    expect('error' in res).toBe(true)
  })

  it('stores the declared facts immutably (declared code preserved, SL derived, version + wording frozen, status submitted)', async () => {
    const { client, cap } = makeClient({ prior: null })
    const res = await recordTaxDeclaration(client, facts)
    expect('ok' in res).toBe(true)
    expect(cap.declInsert).toMatchObject({
      worker_id: 'e-1', declaration_type: 'ir330', declaration_version: IR330_DECLARATION_VERSION,
      employee_legal_name: 'Jane Doe', ird_number: '123-456-789', declared_tax_code: 'M SL',
      has_student_loan: true, declaration_text: IR330_DECLARATION_TEXT, acknowledged: true,
      signed_name: 'Jane Doe', status: 'submitted', supersedes_declaration_id: null,
    })
  })

  it('completes ir330_supplied as worker_submitted with the declaration as evidence, and does NOT touch payroll tax_code', async () => {
    const { client, cap } = makeClient({ prior: null })
    await recordTaxDeclaration(client, facts)
    const ir330 = cap.onboardingUpdates.find((u) => u.filters.some((f) => f[0] === 'item_key' && f[1] === 'ir330_supplied'))
    expect(ir330?.payload).toMatchObject({ status: 'complete', completion_source: 'worker_submitted', evidence_ref: 'TAX-0002' })
    expect(cap.contractorUpdates).toHaveLength(0) // payroll tax code untouched
  })

  it('a correction supersedes the prior declaration and reopens payroll_tax_verified', async () => {
    const { client, cap } = makeClient({ prior: { id: 'old-decl' } })
    await recordTaxDeclaration(client, facts)
    // prior superseded
    const supersede = cap.declUpdates.find((u) => u.filters.some((f) => f[0] === 'id' && f[1] === 'old-decl'))
    expect(supersede?.payload).toMatchObject({ status: 'superseded', superseded_by_declaration_id: 'new-decl' })
    // new declaration links back to prior
    expect(cap.declInsert).toMatchObject({ supersedes_declaration_id: 'old-decl' })
    // payroll_tax_verified reopened
    const reopen = cap.onboardingUpdates.find((u) => u.filters.some((f) => f[0] === 'item_key' && f[1] === 'payroll_tax_verified'))
    expect(reopen?.payload).toMatchObject({ status: 'pending', completion_source: null })
  })
})

// verifyTaxDeclaration
jest.mock('@/lib/supabase-server')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/is-admin', () => ({ isAdminUser: jest.fn() }))
jest.mock('@/lib/workforce-settings', () => ({
  loadWorkforceSettings: jest.fn().mockResolvedValue({ require_admin_activation_approval: true, contractor_required_items: [], employee_required_items: [] }),
  requiredItemsForWorkerType: jest.fn().mockReturnValue([]),
}))

import { verifyTaxDeclaration } from '@/app/portal/contractors/[id]/_actions-tax-declaration'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'

const mockedCreate = createClient as unknown as jest.Mock
const mockedIsAdmin = isAdminUser as unknown as jest.Mock

function verifyClient(decl: Record<string, unknown> | null) {
  const { client, cap } = makeClient({
    decl,
    contractorRead: { worker_type: 'employee', status: 'onboarding', onboarding_status: 'in_progress', trial_required: false, trial_status: null, onboarding_grandfathered: false },
  })
  const withAuth = { ...client, auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }) } }
  return { client: withAuth, cap }
}

beforeEach(() => { jest.clearAllMocks(); mockedIsAdmin.mockReturnValue(true) })

describe('verifyTaxDeclaration', () => {
  const decl = { id: 'd-1', worker_id: 'e-1', status: 'submitted', declared_tax_code: 'M SL', declaration_number: 'TAX-0002' }

  it('is admin-only', async () => {
    mockedIsAdmin.mockReturnValue(false)
    const { client } = verifyClient(decl)
    mockedCreate.mockReturnValue(client)
    const res = await verifyTaxDeclaration({ declarationId: 'd-1', contractorId: 'e-1', appliedTaxCode: 'M SL', payrollEffectiveDate: '2026-08-01' })
    expect(res).toEqual({ error: 'Admin only.' })
  })

  it('requires an applied tax code and an effective date', async () => {
    const { client } = verifyClient(decl)
    mockedCreate.mockReturnValue(client)
    expect('error' in (await verifyTaxDeclaration({ declarationId: 'd-1', contractorId: 'e-1', appliedTaxCode: '', payrollEffectiveDate: '2026-08-01' }))).toBe(true)
    expect('error' in (await verifyTaxDeclaration({ declarationId: 'd-1', contractorId: 'e-1', appliedTaxCode: 'M SL', payrollEffectiveDate: '' }))).toBe(true)
  })

  it('rejects verifying a superseded declaration', async () => {
    const { client } = verifyClient({ ...decl, status: 'superseded' })
    mockedCreate.mockReturnValue(client)
    const res = await verifyTaxDeclaration({ declarationId: 'd-1', contractorId: 'e-1', appliedTaxCode: 'M SL', payrollEffectiveDate: '2026-08-01' })
    expect('error' in res).toBe(true)
  })

  it('stamps verification, sets the payroll tax code, completes payroll_tax_verified (staff_verified) and audits', async () => {
    const { client, cap } = verifyClient(decl)
    mockedCreate.mockReturnValue(client)
    const res = await verifyTaxDeclaration({ declarationId: 'd-1', contractorId: 'e-1', appliedTaxCode: 'M SL', payrollEffectiveDate: '2026-08-01' })
    expect('ok' in res).toBe(true)
    // declaration lifecycle stamped
    expect(cap.declUpdates[0].payload).toMatchObject({ status: 'verified', verified_by: 'admin-1', applied_tax_code: 'M SL', payroll_effective_date: '2026-08-01' })
    // payroll tax code applied (the only place it changes from a declaration)
    expect(cap.contractorUpdates.some((u) => u.tax_code === 'M SL' && u.ir330_received === true)).toBe(true)
    // payroll_tax_verified completed staff_verified + evidence + effective date
    const ptv = cap.onboardingUpdates.find((u) => u.filters.some((f) => f[0] === 'item_key' && f[1] === 'payroll_tax_verified'))
    expect(ptv?.payload).toMatchObject({ status: 'complete', completion_source: 'staff_verified', evidence_ref: 'TAX-0002', effective_date: '2026-08-01' })
    // audit
    expect(cap.audit?.action).toBe('tax_declaration.verified')
  })
})
