/** @jest-environment node */

jest.mock('@/lib/supabase-server')
jest.mock('@/lib/is-admin', () => ({ isAdminUser: () => true, isAdminEmail: () => true }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { createContact, updateContact } from '@/app/portal/clients/_actions-contacts'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock

function makeClient(insertResult: { data: unknown; error: unknown }) {
  const single = jest.fn().mockResolvedValue(insertResult)
  const select = jest.fn().mockReturnValue({ single })
  const insert = jest.fn().mockReturnValue({ select })
  const from = jest.fn().mockReturnValue({ insert })
  return {
    client: { auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'a@sano.nz' } } }) }, from },
    insert,
  }
}

function makeUpdateClient(result: { data: unknown; error: unknown }) {
  const single = jest.fn().mockResolvedValue(result)
  const select = jest.fn().mockReturnValue({ single })
  const eq = jest.fn().mockReturnValue({ select })
  const update = jest.fn().mockReturnValue({ eq })
  const from = jest.fn().mockReturnValue({ update })
  return {
    client: { auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'a@sano.nz' } } }) }, from },
    update,
  }
}

beforeEach(() => mockedCreate.mockReset())

describe('createContact', () => {
  it('inserts a contact under the account and returns it', async () => {
    const row = { id: 'ct1', client_id: 'A', full_name: 'Jamie Marshall', contact_type: 'primary', email: 'j@x.com', phone: null }
    const { client, insert } = makeClient({ data: row, error: null })
    mockedCreate.mockReturnValue(client)

    const res = await createContact({ client_id: 'A', full_name: '  Jamie Marshall ', email: 'j@x.com', contact_type: 'primary' })

    expect(res).toEqual({ ok: true, contact: row })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      client_id: 'A', full_name: 'Jamie Marshall', email: 'j@x.com', contact_type: 'primary', phone: null,
    }))
  })

  it('defaults to a primary contact type', async () => {
    const { client, insert } = makeClient({ data: { id: 'x', client_id: 'A', full_name: 'N', contact_type: 'primary', email: null, phone: null }, error: null })
    mockedCreate.mockReturnValue(client)
    await createContact({ client_id: 'A', full_name: 'N' })
    expect(insert.mock.calls[0][0].contact_type).toBe('primary')
  })

  it('validates required fields', async () => {
    const { client } = makeClient({ data: null, error: null })
    mockedCreate.mockReturnValue(client)
    expect((await createContact({ client_id: '', full_name: 'N' })).error).toMatch(/account/i)
    expect((await createContact({ client_id: 'A', full_name: '   ' })).error).toMatch(/name is required/i)
  })

  it('surfaces a DB error', async () => {
    const { client } = makeClient({ data: null, error: { message: 'rls denied' } })
    mockedCreate.mockReturnValue(client)
    expect((await createContact({ client_id: 'A', full_name: 'N' })).error).toMatch(/rls denied/i)
  })
})

describe('updateContact', () => {
  it('updates the contact fields and never changes client_id', async () => {
    const row = { id: 'ct1', client_id: 'A', full_name: 'Jamie M', contact_type: 'accounts', email: 'j@x.com', phone: '021', notes: 'PM' }
    const { client, update } = makeUpdateClient({ data: row, error: null })
    mockedCreate.mockReturnValue(client)

    const res = await updateContact({ id: 'ct1', full_name: 'Jamie M', email: 'j@x.com', phone: '021', contact_type: 'accounts', notes: 'PM' })

    expect(res).toEqual({ ok: true, contact: row })
    const patch = update.mock.calls[0][0]
    expect(patch).toMatchObject({ full_name: 'Jamie M', contact_type: 'accounts', notes: 'PM' })
    expect(patch).not.toHaveProperty('client_id') // stays under the same account
  })

  it('validates id and name', async () => {
    const { client } = makeUpdateClient({ data: null, error: null })
    mockedCreate.mockReturnValue(client)
    expect((await updateContact({ id: '', full_name: 'N' })).error).toMatch(/id is required/i)
    expect((await updateContact({ id: 'ct1', full_name: '  ' })).error).toMatch(/name is required/i)
  })
})
