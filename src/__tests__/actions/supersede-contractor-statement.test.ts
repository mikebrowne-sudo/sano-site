/** @jest-environment node */

// Stage 1 PR B — supersede action delegates atomicity to the RPC
// supersede_contractor_statement (verify issued, stamp, preserve snapshot,
// release CIs, audit — all in one transaction). Here we test the action's
// guards and that it surfaces the RPC result / errors.

jest.mock('@/lib/supabase-server')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/is-admin', () => ({ isAdminUser: (u: { email?: string } | null) => u?.email === 'admin@sano.nz' }))

import { supersedeContractorStatement } from '@/app/portal/contractor-statements/_actions-supersede'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock

function makeClient(rpc: jest.Mock, user: { id: string; email: string } | null = { id: 'u1', email: 'admin@sano.nz' }) {
  return { rpc, auth: { getUser: async () => ({ data: { user } }) } }
}

beforeEach(() => mockedCreate.mockReset())

it('calls the atomic RPC and returns released CI ids', async () => {
  const rpc = jest.fn().mockResolvedValue({ data: { statement_number: 'STMT-0001', released_ci_ids: ['ci1', 'ci2'] }, error: null })
  mockedCreate.mockReturnValue(makeClient(rpc))

  const res = await supersedeContractorStatement({ id: 'st-1', reason: 'missed a late job' })
  expect(rpc).toHaveBeenCalledWith('supersede_contractor_statement', { p_statement_id: 'st-1', p_reason: 'missed a late job' })
  expect(res).toMatchObject({ ok: true, statement_number: 'STMT-0001', released_ci_ids: ['ci1', 'ci2'] })
})

it('requires a reason (no RPC call)', async () => {
  const rpc = jest.fn()
  mockedCreate.mockReturnValue(makeClient(rpc))
  const res = await supersedeContractorStatement({ id: 'st-1', reason: '   ' })
  expect(res).toMatchObject({ error: expect.stringMatching(/reason is required/i) })
  expect(rpc).not.toHaveBeenCalled()
})

it('surfaces an RPC error (e.g. not issued) without partial state', async () => {
  const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'Only an issued statement can be superseded (current: draft).' } })
  mockedCreate.mockReturnValue(makeClient(rpc))
  const res = await supersedeContractorStatement({ id: 'st-1', reason: 'oops' })
  expect(res.error).toMatch(/only an issued statement/i)
})

it('is admin-only (no RPC call)', async () => {
  const rpc = jest.fn()
  mockedCreate.mockReturnValue(makeClient(rpc, { id: 'u2', email: 'staff@sano.nz' }))
  const res = await supersedeContractorStatement({ id: 'st-1', reason: 'x' })
  expect(res).toMatchObject({ error: 'Admin only.' })
  expect(rpc).not.toHaveBeenCalled()
})
