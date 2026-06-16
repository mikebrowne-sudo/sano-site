/** @jest-environment node */

jest.mock('@/lib/supabase-server')
jest.mock('@/lib/is-admin', () => ({ isAdminUser: (u: { email?: string } | null) => !!u && u.email === 'admin@sano.nz' }))

import { logSensitiveEdit } from '@/app/portal/_actions-sensitive-edit'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock

function makeSupabase(email = 'admin@sano.nz') {
  const insert = jest.fn().mockResolvedValue({ error: null })
  const from = jest.fn().mockReturnValue({ insert })
  return { client: { auth: { getUser: async () => ({ data: { user: { id: 'u1', email } } }) }, from }, insert }
}

beforeEach(() => mockedCreate.mockReset())

describe('logSensitiveEdit', () => {
  it('writes an audit row for an unmilestoned edit (no reason needed)', async () => {
    const { client, insert } = makeSupabase()
    mockedCreate.mockReturnValue(client)

    const res = await logSensitiveEdit({
      entity: 'invoice', entityId: 'i1', entityNumber: 'INV-0050', milestone: {},
      changes: [{ field: 'notes', before: 'a', after: 'b' }],
    })

    expect(res).toEqual({ ok: true })
    const row = insert.mock.calls[0][0]
    expect(row.action).toBe('invoice.amended')
    expect(row.entity_table).toBe('invoices')
    expect(row.before).toEqual({ notes: 'a' })
    expect(row.after.notes).toBe('b')
    expect(row.after._changed_fields).toEqual(['notes'])
  })

  it('requires a reason once a milestone is reached', async () => {
    const { client, insert } = makeSupabase()
    mockedCreate.mockReturnValue(client)

    const res = await logSensitiveEdit({
      entity: 'contractor_invoice', entityId: 'ci1', milestone: { remitted: true },
      changes: [{ field: 'amount', before: 100, after: 120 }],
    })

    expect('error' in res && res.error).toMatch(/reason is required/i)
    expect(insert).not.toHaveBeenCalled()
  })

  it('records reason, milestone labels and totals for a sensitive financial edit', async () => {
    const { client, insert } = makeSupabase()
    mockedCreate.mockReturnValue(client)

    const res = await logSensitiveEdit({
      entity: 'invoice', entityId: 'i1', entityNumber: 'INV-0050',
      milestone: { sent: true }, reason: 'client agreed a discount',
      changes: [{ field: 'base_price', before: 300, after: 250 }],
      beforeTotal: 300, afterTotal: 250,
    })

    expect(res).toEqual({ ok: true })
    const row = insert.mock.calls[0][0]
    expect(row.after._reason).toBe('client agreed a discount')
    expect(row.after._milestone).toEqual(['sent'])
    expect(row.after._before_total).toBe(300)
    expect(row.after._after_total).toBe(250)
  })

  it('blocks non-admin users', async () => {
    const { client, insert } = makeSupabase('nope@x.com')
    mockedCreate.mockReturnValue(client)

    const res = await logSensitiveEdit({ entity: 'job', entityId: 'j1', milestone: {}, changes: [] })

    expect('error' in res && res.error).toMatch(/admin only/i)
    expect(insert).not.toHaveBeenCalled()
  })
})
