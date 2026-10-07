/**
 * @jest-environment node
 */
// Portal access is allow-list only: admins (Mike + Carol) get the staff
// portal, accountants get the finance area, contractors/clients go to their
// own surfaces, and ANY other signed-in account is signed out — never treated
// as staff.

let mockUser: { id: string; email: string } | null = null
let mockIsContractor = false
let mockIsClient = false
const mockSignOut = jest.fn()

jest.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: mockUser } }),
      signOut: mockSignOut,
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: (table === 'contractors' && mockIsContractor) || (table === 'clients' && mockIsClient) ? { id: 'x' } : null,
          }),
        }),
      }),
    }),
  }),
}))

import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'

function as(email: string | null, opts: { contractor?: boolean; client?: boolean } = {}) {
  mockUser = email ? { id: 'u1', email } : null
  mockIsContractor = !!opts.contractor
  mockIsClient = !!opts.client
}

async function visit(path: string): Promise<string | null> {
  const res = await middleware(new NextRequest(new URL(`https://sano.nz${path}`)))
  const loc = res.headers.get('location')
  return loc ? new URL(loc).pathname + new URL(loc).search : null
}

beforeEach(() => mockSignOut.mockClear())

describe('portal access allow-list', () => {
  it('lets Mike and Carol into the staff portal', async () => {
    as('michael@sano.nz')
    expect(await visit('/portal/invoices')).toBeNull()
    as('Carol@Sano.nz')
    expect(await visit('/portal/jobs')).toBeNull()
  })

  it('signs out any other non-contractor, non-client login', async () => {
    for (const email of ['hello@sano.nz', 'ups05@hotmail.com', 'random@example.com']) {
      as(email)
      expect(await visit('/portal')).toBe('/portal/login?error=no_access')
    }
    expect(mockSignOut).toHaveBeenCalledTimes(3)
  })

  it('also refuses unknown logins on the contractor and client surfaces', async () => {
    as('hello@sano.nz')
    expect(await visit('/contractor/jobs')).toBe('/portal/login?error=no_access')
    expect(await visit('/client/dashboard')).toBe('/portal/login?error=no_access')
  })

  it('keeps accountants in the finance area only', async () => {
    as('jason@taxaction.co.nz')
    expect(await visit('/portal/finance/profit-loss')).toBeNull()
    expect(await visit('/portal/jobs')).toBe('/portal/finance')
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('sends contractors and clients to their own surfaces', async () => {
    as('kritika55@hotmail.com', { contractor: true })
    expect(await visit('/portal/invoices')).toBe('/contractor/jobs')
    expect(await visit('/contractor/jobs')).toBeNull()
    as('client@example.com', { client: true })
    expect(await visit('/portal/invoices')).toBe('/client/dashboard')
  })

  it('leaves the login and password-reset pages reachable for unknown logins', async () => {
    as('hello@sano.nz')
    expect(await visit('/portal/login')).toBeNull()
    expect(await visit('/portal/reset-password')).toBeNull()
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('still sends signed-out visitors to the login page', async () => {
    as(null)
    expect(await visit('/portal/invoices')).toBe('/portal/login')
  })
})
