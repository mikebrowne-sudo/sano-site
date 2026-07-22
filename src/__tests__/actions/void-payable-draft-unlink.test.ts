/** @jest-environment node */

// Void action removes a voided payable from its DRAFT statement + recomputes.
// (The recompute helper itself is unit-tested in contractor-statement-recompute.test.ts.)

jest.mock('@/lib/supabase-server')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/is-admin', () => ({ isAdminUser: (u: { email?: string } | null) => u?.email === 'admin@sano.nz' }))
const mockRecompute = jest.fn()
jest.mock('@/lib/contractor-statement-recompute', () => ({ recomputeStatementTotals: (...a: unknown[]) => mockRecompute(...a) }))

import { voidContractorPayable } from '@/app/portal/contractor-invoices/_actions-void-pay'
import { createClient } from '@/lib/supabase-server'
const mockedCreate = createClient as unknown as jest.Mock

function makeClient(ci: Record<string, unknown>, statementStatus: string | null) {
  const ciUpdate = jest.fn().mockReturnValue({ eq: async () => ({ error: null }) })
  const auditInsert = jest.fn().mockResolvedValue({ error: null })
  const from = jest.fn((t: string) => {
    if (t === 'contractor_invoices') return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: ci }) }) }),
      update: ciUpdate,
    }
    if (t === 'contractor_statements') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: statementStatus ? { status: statementStatus, statement_number: 'STMT-0001' } : null }) }) }) }
    if (t === 'contractor_remittance_items') return { select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) }
    if (t === 'audit_log') return { insert: auditInsert }
    return {}
  })
  return { client: { from, auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'admin@sano.nz' } } }) } }, ciUpdate, auditInsert }
}

beforeEach(() => { mockedCreate.mockReset(); mockRecompute.mockReset() })

it('unlinks the payable from its DRAFT statement and recomputes on void', async () => {
  const ci = { id: 'ci1', invoice_number: 'CI-0057', status: 'approved', amount: 290, job_id: null, statement_id: 'st1' }
  const { client, ciUpdate } = makeClient(ci, 'draft')
  mockedCreate.mockReturnValue(client)

  const res = await voidContractorPayable('ci1', 'duplicate')
  expect(res).toMatchObject({ ok: true })
  const payloads = ciUpdate.mock.calls.map((c) => c[0])
  expect(payloads).toEqual(expect.arrayContaining([{ status: 'void' }, { statement_id: null }]))
  expect(mockRecompute).toHaveBeenCalledWith(expect.anything(), 'st1')
})

it('blocks voiding a payable on a NON-draft (issued) statement — no unlink', async () => {
  const ci = { id: 'ci1', invoice_number: 'CI-0057', status: 'approved', amount: 290, job_id: null, statement_id: 'st1' }
  const { client } = makeClient(ci, 'issued')
  mockedCreate.mockReturnValue(client)
  const res = await voidContractorPayable('ci1', 'x')
  expect(res.error).toMatch(/supersede/i)
  expect(mockRecompute).not.toHaveBeenCalled()
})

it('voids a payable with no statement without touching recompute', async () => {
  const ci = { id: 'ci1', invoice_number: 'CI-0099', status: 'approved', amount: 100, job_id: null, statement_id: null }
  const { client } = makeClient(ci, null)
  mockedCreate.mockReturnValue(client)
  const res = await voidContractorPayable('ci1', 'x')
  expect(res).toMatchObject({ ok: true })
  expect(mockRecompute).not.toHaveBeenCalled()
})
