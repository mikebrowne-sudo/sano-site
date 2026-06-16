/** @jest-environment node */

jest.mock('@/lib/supabase-server')
jest.mock('@/lib/is-admin', () => ({ isAdminUser: () => true, isAdminEmail: () => true }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { classifyDuplicateKind } from '@/app/portal/clients/_lib-cleanup'
import { applyProposedAccountName } from '@/app/portal/clients/_actions-cleanup'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock

describe('classifyDuplicateKind', () => {
  it('treats same-name + different branch as a branch, not a duplicate', () => {
    expect(classifyDuplicateKind('name', 'Ellerslie', 'Ponsonby')).toBe('branch')
  })
  it('treats same-name + same/empty branch as a duplicate', () => {
    expect(classifyDuplicateKind('name', 'Sansom Limited', 'Sansom Limited')).toBe('duplicate')
    expect(classifyDuplicateKind('name', null, null)).toBe('duplicate')
  })
  it('email / phone matches are always duplicates', () => {
    expect(classifyDuplicateKind('email', 'Ellerslie', 'Ponsonby')).toBe('duplicate')
    expect(classifyDuplicateKind('phone', 'Ellerslie', 'Ponsonby')).toBe('duplicate')
  })
})

function makeClient(row: { name: string | null; company_name: string | null } | null) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: row })
  const selectEq = { eq: jest.fn().mockReturnValue({ maybeSingle }) }
  const updateEq = jest.fn().mockResolvedValue({ error: null })
  const update = jest.fn().mockReturnValue({ eq: updateEq })
  const insert = jest.fn().mockResolvedValue({ error: null })
  const from = jest.fn((table: string) => {
    if (table === 'audit_log') return { insert }
    return { select: jest.fn().mockReturnValue(selectEq), update }
  })
  return {
    client: { auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'a@sano.nz' } } }) }, from },
    update,
  }
}

describe('applyProposedAccountName', () => {
  it('renames the account and clears the company field', async () => {
    const { client, update } = makeClient({ name: 'Barfoot & Thompson', company_name: 'Ellerslie' })
    mockedCreate.mockReturnValue(client)

    const res = await applyProposedAccountName('cid')

    expect(res).toEqual({ ok: true, name: 'Barfoot & Thompson - Ellerslie' })
    expect(update).toHaveBeenCalledWith({ name: 'Barfoot & Thompson - Ellerslie', company_name: null })
  })

  it('refuses when there is no safe rename (e.g. person-led record)', async () => {
    const { client, update } = makeClient({ name: 'Kevin Maio', company_name: 'Barfoot & Thompson - Royal Heights' })
    mockedCreate.mockReturnValue(client)

    const res = await applyProposedAccountName('cid')

    expect('error' in res).toBe(true)
    expect(update).not.toHaveBeenCalled()
  })
})
