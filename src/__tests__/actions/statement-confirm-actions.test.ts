/** @jest-environment node */

jest.mock('@/lib/supabase-server')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/is-admin', () => ({ isAdminUser: (u: { email?: string } | null) => u?.email === 'admin@sano.nz' }))

import { confirmStatementOnBehalf, extendReviewDeadline } from '@/app/portal/contractor-statements/_actions-confirm'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock
const ADMIN = { id: 'u1', email: 'admin@sano.nz' }
const future = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
const past = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)

beforeEach(() => mockedCreate.mockReset())

describe('confirmStatementOnBehalf', () => {
  it('calls the RPC with reason + override', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { statement_number: 'STMT-0001' }, error: null })
    mockedCreate.mockReturnValue({ rpc, auth: { getUser: async () => ({ data: { user: ADMIN } }) } })
    const res = await confirmStatementOnBehalf({ id: 's1', reason: 'no response', email_override: true })
    expect(rpc).toHaveBeenCalledWith('confirm_statement_on_behalf', { p_statement_id: 's1', p_reason: 'no response', p_email_override: true })
    expect(res).toMatchObject({ ok: true, statement_number: 'STMT-0001' })
  })

  it('requires a reason (no RPC)', async () => {
    const rpc = jest.fn()
    mockedCreate.mockReturnValue({ rpc, auth: { getUser: async () => ({ data: { user: ADMIN } }) } })
    const res = await confirmStatementOnBehalf({ id: 's1', reason: '  ' })
    expect(res.error).toMatch(/reason is required/i)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('surfaces the RPC error (e.g. deadline not passed)', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'The review deadline has not passed yet.' } })
    mockedCreate.mockReturnValue({ rpc, auth: { getUser: async () => ({ data: { user: ADMIN } }) } })
    const res = await confirmStatementOnBehalf({ id: 's1', reason: 'x' })
    expect(res.error).toMatch(/deadline has not passed/i)
  })

  it('is admin-only', async () => {
    const rpc = jest.fn()
    mockedCreate.mockReturnValue({ rpc, auth: { getUser: async () => ({ data: { user: { id: 'u2', email: 'staff@sano.nz' } } }) } })
    expect(await confirmStatementOnBehalf({ id: 's1', reason: 'x' })).toMatchObject({ error: 'Admin only.' })
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('extendReviewDeadline', () => {
  function makeClient(status: string, updateRows: Array<{ id: string }> = [{ id: 's1' }]) {
    const auditInsert = jest.fn().mockResolvedValue({ error: null })
    const update = jest.fn().mockReturnValue({ eq: () => ({ eq: () => ({ select: async () => ({ data: updateRows, error: null }) }) }) })
    const from = jest.fn((t: string) => {
      if (t === 'contractor_statements') return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 's1', status, review_due_at: '2026-07-25T00:00:00Z', statement_number: 'STMT-0001' }, error: null }) }) }),
        update,
      }
      if (t === 'audit_log') return { insert: auditInsert }
      return {}
    })
    return { client: { from, auth: { getUser: async () => ({ data: { user: ADMIN } }) } }, auditInsert, update }
  }

  it('extends an issued statement to a future date and audits it', async () => {
    const { client, auditInsert } = makeClient('issued')
    mockedCreate.mockReturnValue(client)
    const res = await extendReviewDeadline({ id: 's1', review_due_at: future, reason: 'more time' })
    expect(res).toMatchObject({ ok: true })
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({ action: 'contractor_statement.review_deadline_extended' }))
  })

  it('rejects a non-future deadline', async () => {
    const { client } = makeClient('issued')
    mockedCreate.mockReturnValue(client)
    expect((await extendReviewDeadline({ id: 's1', review_due_at: past, reason: 'x' })).error).toMatch(/future/i)
  })

  it('requires a reason', async () => {
    const { client } = makeClient('issued')
    mockedCreate.mockReturnValue(client)
    expect((await extendReviewDeadline({ id: 's1', review_due_at: future, reason: '' })).error).toMatch(/reason is required/i)
  })

  it('blocks extension on a non-issued statement', async () => {
    const { client } = makeClient('confirmed')
    mockedCreate.mockReturnValue(client)
    expect((await extendReviewDeadline({ id: 's1', review_due_at: future, reason: 'x' })).error).toMatch(/only an issued/i)
  })
})
