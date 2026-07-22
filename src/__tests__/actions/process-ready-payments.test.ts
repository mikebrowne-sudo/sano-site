/** @jest-environment node */

// processReadyPayments loops the atomic create_remittance_from_statement RPC —
// one per statement, independent. One failure must not stop the rest.
// (RPC eligibility/reconciliation is verified separately by rolled-back SQL.)

jest.mock('@/lib/supabase-server')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/is-admin', () => ({ isAdminUser: (u: { email?: string } | null) => u?.email === 'admin@sano.nz' }))
// Avoid pulling the heavy issue/send actions into this unit.
jest.mock('@/app/portal/contractor-statements/_actions-issue', () => ({ issueContractorStatement: jest.fn() }))
jest.mock('@/app/portal/contractor-invoices/_actions-send-remittance', () => ({ sendContractorRemittance: jest.fn() }))

import { processReadyPayments } from '@/app/portal/contractor-statements/_actions-bulk'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock
const PERIOD = { period_start: '2026-07-01', period_end: '2026-07-15' }

function candidatesChain(rows: unknown[]) {
  // .select().eq().eq().in().is() awaited
  const chain: Record<string, unknown> = {}
  chain.select = () => chain; chain.eq = () => chain; chain.in = () => chain
  chain.is = async () => ({ data: rows })
  return chain
}

beforeEach(() => mockedCreate.mockReset())

it('processes each statement independently; one failure does not stop the rest', async () => {
  const rows = [
    { id: 's1', statement_number: 'STMT-0001', contractor_id: 'k', period_start: '2026-07-01', issued_snapshot: {}, contractors: { full_name: 'K' } },
    { id: 's2', statement_number: 'STMT-0002', contractor_id: 'm', period_start: '2026-07-01', issued_snapshot: {}, contractors: { full_name: 'M' } },
    { id: 's3', statement_number: 'STMT-0003', contractor_id: 'u', period_start: '2026-07-01', issued_snapshot: {}, contractors: { full_name: 'U' } },
  ]
  const rpc = jest.fn()
    .mockResolvedValueOnce({ data: { remittance_number: 'RA-1' }, error: null })       // s1 ok
    .mockResolvedValueOnce({ data: null, error: { message: 'Statement total no longer reconciles to the issued snapshot.' } }) // s2 fail
    .mockResolvedValueOnce({ data: { remittance_number: 'RA-2' }, error: null })       // s3 ok
  mockedCreate.mockReturnValue({
    from: () => candidatesChain(rows),
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'admin@sano.nz' } } }) },
    rpc,
  })

  const res = await processReadyPayments(PERIOD, '2026-07-22')
  expect(res.processed).toBe(2)
  expect(res.needs_attention).toBe(1)
  expect(rpc).toHaveBeenCalledTimes(3)
  const failed = res.items.find((i) => !i.ok)!
  expect(failed.label).toBe('STMT-0002')
  expect(failed.reason).toMatch(/reconcile/i)
})

it('is admin-only', async () => {
  mockedCreate.mockReturnValue({ from: () => candidatesChain([]), auth: { getUser: async () => ({ data: { user: { id: 'x', email: 'staff@sano.nz' } } }) }, rpc: jest.fn() })
  const res = await processReadyPayments(PERIOD, '2026-07-22')
  expect(res.error).toBe('Admin only.')
})

it('requires a payment date', async () => {
  mockedCreate.mockReturnValue({ from: () => candidatesChain([]), auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'admin@sano.nz' } } }) }, rpc: jest.fn() })
  const res = await processReadyPayments(PERIOD, '')
  expect(res.error).toMatch(/payment date/i)
})
