/** @jest-environment node */

// The contractor confirm wrapper delegates to the RPC (ownership + eligibility
// enforced in-DB, verified separately by rolled-back impersonation).

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
const mockGetContractor = jest.fn()
jest.mock('@/app/contractor/_lib/get-contractor', () => ({ getContractor: () => mockGetContractor() }))

import { confirmMyStatement } from '@/app/contractor/statements/_actions'

beforeEach(() => mockGetContractor.mockReset())

it('calls confirm_statement_as_contractor and succeeds', async () => {
  const rpc = jest.fn().mockResolvedValue({ data: { statement_number: 'STMT-0001' }, error: null })
  mockGetContractor.mockResolvedValue({ supabase: { rpc }, contractor: { id: 'k' } })
  const res = await confirmMyStatement('s1')
  expect(rpc).toHaveBeenCalledWith('confirm_statement_as_contractor', { p_statement_id: 's1' })
  expect(res).toMatchObject({ ok: true })
})

it('surfaces an RPC error (e.g. not authorised / already confirmed)', async () => {
  const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'This statement has already been confirmed.' } })
  mockGetContractor.mockResolvedValue({ supabase: { rpc }, contractor: { id: 'k' } })
  const res = await confirmMyStatement('s1')
  expect(res.error).toMatch(/already been confirmed/i)
})
