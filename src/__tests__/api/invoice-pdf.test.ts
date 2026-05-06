/** @jest-environment node */
import type { NextRequest } from 'next/server'
import { GET as getStaffInvoicePdf } from '@/app/api/invoices/[id]/pdf/route'

jest.mock('@/lib/supabase-server', () => ({
  createClient: jest.fn(),
}))
jest.mock('@/lib/pdf/render-pdf', () => ({
  renderPdfFromUrl: jest.fn(),
  parseCookieHeader: jest.fn(() => []),
  RenderPdfError: class RenderPdfError extends Error {
    constructor(message: string, public status: number) {
      super(message)
    }
  },
}))

import { createClient } from '@/lib/supabase-server'
import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'

const mockedCreate = createClient as jest.Mock
const mockedRender = renderPdfFromUrl as jest.Mock

function makeStub(overrides: {
  user?: { id: string; email: string } | null
  invoice?: { invoice_number: string; deleted_at: string | null } | null
} = {}) {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: overrides.user ?? null } }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: overrides.invoice ?? null, error: overrides.invoice ? null : new Error('not found') }),
    }),
  }
}

function fakeRequest(): NextRequest {
  return {
    url: 'https://sano.nz/api/invoices/abc/pdf',
    headers: { get: () => '' },
  } as unknown as NextRequest
}

describe('GET /api/invoices/[id]/pdf', () => {
  beforeEach(() => {
    mockedCreate.mockReset()
    mockedRender.mockReset()
  })

  it('returns 401 when no user', async () => {
    mockedCreate.mockReturnValue(makeStub({ user: null }))
    expect((await getStaffInvoicePdf(fakeRequest(), { params: { id: 'abc' } })).status).toBe(401)
  })

  it('returns 404 when invoice missing', async () => {
    mockedCreate.mockReturnValue(makeStub({ user: { id: 'u', email: 'x@x' }, invoice: null }))
    expect((await getStaffInvoicePdf(fakeRequest(), { params: { id: 'abc' } })).status).toBe(404)
  })

  it('returns 200 with Sano Tax Invoice filename on success', async () => {
    mockedCreate.mockReturnValue(makeStub({
      user: { id: 'u', email: 'x@x' },
      invoice: { invoice_number: 'INV-9001', deleted_at: null },
    }))
    mockedRender.mockResolvedValue(Buffer.from('PDF'))
    const res = await getStaffInvoicePdf(fakeRequest(), { params: { id: 'abc' } })
    expect(res.status).toBe(200)
    const cd = res.headers.get('content-disposition') ?? ''
    expect(cd).toContain('filename="Sano Tax Invoice - INV-9001.pdf"')
    expect(cd).toContain("filename*=UTF-8''Sano%20Tax%20Invoice%20-%20INV-9001.pdf")
  })
})

import { GET as getShareInvoicePdf } from '@/app/api/share/invoice/[token]/pdf/route'

jest.mock('@/lib/supabase-service', () => ({
  getServiceSupabase: jest.fn(),
}))
import { getServiceSupabase } from '@/lib/supabase-service'
const mockedService = getServiceSupabase as jest.Mock

function shareStub(overrides: { invoice?: { invoice_number: string; deleted_at: string | null } | null } = {}) {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: overrides.invoice ?? null, error: overrides.invoice ? null : new Error('not found') }),
    }),
  }
}

function shareRequest(): NextRequest {
  return {
    url: 'https://sano.nz/api/share/invoice/tok123/pdf',
    headers: { get: () => '' },
  } as unknown as NextRequest
}

describe('GET /api/share/invoice/[token]/pdf', () => {
  beforeEach(() => {
    mockedService.mockReset()
    mockedRender.mockReset()
  })

  it('returns 404 when token unknown', async () => {
    mockedService.mockReturnValue(shareStub({ invoice: null }))
    expect((await getShareInvoicePdf(shareRequest(), { params: { token: 'tok123' } })).status).toBe(404)
  })

  it('returns 200 with Sano Tax Invoice filename', async () => {
    mockedService.mockReturnValue(shareStub({ invoice: { invoice_number: 'INV-12', deleted_at: null } }))
    mockedRender.mockResolvedValue(Buffer.from('PDF'))
    const res = await getShareInvoicePdf(shareRequest(), { params: { token: 'tok123' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition') ?? '').toContain('filename="Sano Tax Invoice - INV-12.pdf"')
  })

  it('does NOT forward cookies to the renderer even when request has them (public flow)', async () => {
    mockedService.mockReturnValue(shareStub({ invoice: { invoice_number: 'INV-12', deleted_at: null } }))
    mockedRender.mockResolvedValue(Buffer.from('PDF'))

    const reqWithCookies = {
      url: 'https://sano.nz/api/share/invoice/tok123/pdf',
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'cookie' ? 'sb-access-token=staff-session-token' : '',
      },
    } as unknown as NextRequest
    await getShareInvoicePdf(reqWithCookies, { params: { token: 'tok123' } })

    const lastCall = mockedRender.mock.calls.at(-1)
    expect(lastCall?.[1]?.cookies ?? []).toEqual([])
  })
})
