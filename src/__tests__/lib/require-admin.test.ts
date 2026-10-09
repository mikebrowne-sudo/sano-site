/** @jest-environment node */
import { assertAdminAction } from '@/lib/require-admin'

const getUser = jest.fn()
jest.mock('@/lib/supabase-server', () => ({ createClient: () => ({ auth: { getUser } }) }))

describe('assertAdminAction', () => {
  it('lets Sano staff through', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'carol@sano.nz' } } })
    await expect(assertAdminAction()).resolves.toBeUndefined()
  })
  it('blocks a read-only accountant login', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'accounts@someaccountant.co.nz' } } })
    await expect(assertAdminAction()).rejects.toThrow('Only Sano staff')
  })
  it('blocks when nobody is signed in', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    await expect(assertAdminAction()).rejects.toThrow('Only Sano staff')
  })
})
