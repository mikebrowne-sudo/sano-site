/** @jest-environment node */
import type { NextRequest } from 'next/server'
import { GET as getStaffQuotePdf } from '@/app/api/quotes/[id]/pdf/route'

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

function makeSupabaseStub(overrides: {
  user?: { id: string; email: string } | null
  quote?: { quote_number: string; service_category: string | null; deleted_at: string | null } | null
} = {}) {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: overrides.user ?? null } }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: overrides.quote ?? null, error: overrides.quote ? null : new Error('not found') }),
    }),
  }
}

function fakeRequest(): NextRequest {
  return {
    url: 'https://sano.nz/api/quotes/abc/pdf',
    headers: { get: () => '' },
  } as unknown as NextRequest
}

describe('GET /api/quotes/[id]/pdf', () => {
  beforeEach(() => {
    mockedCreate.mockReset()
    mockedRender.mockReset()
  })

  it('returns 401 when no user', async () => {
    mockedCreate.mockReturnValue(makeSupabaseStub({ user: null }))
    const res = await getStaffQuotePdf(fakeRequest(), { params: { id: 'abc' } })
    expect(res.status).toBe(401)
  })

  it('returns 404 when quote is missing or soft-deleted', async () => {
    mockedCreate.mockReturnValue(makeSupabaseStub({ user: { id: 'u', email: 'x@x' }, quote: null }))
    const res = await getStaffQuotePdf(fakeRequest(), { params: { id: 'abc' } })
    expect(res.status).toBe(404)
  })

  it('returns 400 with redirect message when quote is commercial', async () => {
    mockedCreate.mockReturnValue(makeSupabaseStub({
      user: { id: 'u', email: 'x@x' },
      quote: { quote_number: 'QT-1', service_category: 'commercial', deleted_at: null },
    }))
    const res = await getStaffQuotePdf(fakeRequest(), { params: { id: 'abc' } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('/api/proposals/')
  })

  it('returns 200 with proper Content-Disposition on success', async () => {
    mockedCreate.mockReturnValue(makeSupabaseStub({
      user: { id: 'u', email: 'x@x' },
      quote: { quote_number: 'QT-1234', service_category: 'residential', deleted_at: null },
    }))
    mockedRender.mockResolvedValue(Buffer.from('PDF'))
    const res = await getStaffQuotePdf(fakeRequest(), { params: { id: 'abc' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    const cd = res.headers.get('content-disposition') ?? ''
    expect(cd).toContain('filename="Sano Quote - QT-1234.pdf"')
    expect(cd).toContain("filename*=UTF-8''Sano%20Quote%20-%20QT-1234.pdf")
  })
})

import { GET as getShareQuotePdf } from '@/app/api/share/quote/[token]/pdf/route'

jest.mock('@/lib/supabase-service', () => ({
  getServiceSupabase: jest.fn(),
}))
import { getServiceSupabase } from '@/lib/supabase-service'
const mockedService = getServiceSupabase as jest.Mock

function shareStub(overrides: { quote?: { quote_number: string; deleted_at: string | null } | null } = {}) {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: overrides.quote ?? null, error: overrides.quote ? null : new Error('not found') }),
    }),
  }
}

function shareRequest(): NextRequest {
  return {
    url: 'https://sano.nz/api/share/quote/tok123/pdf',
    headers: { get: () => '' },
  } as unknown as NextRequest
}

describe('GET /api/share/quote/[token]/pdf', () => {
  beforeEach(() => {
    mockedService.mockReset()
    mockedRender.mockReset()
  })

  it('returns 404 when token does not match (or record soft-deleted)', async () => {
    mockedService.mockReturnValue(shareStub({ quote: null }))
    const res = await getShareQuotePdf(shareRequest(), { params: { token: 'tok123' } })
    expect(res.status).toBe(404)
  })

  it('returns 200 with Sano Quote filename on success', async () => {
    mockedService.mockReturnValue(shareStub({ quote: { quote_number: 'QT-7', deleted_at: null } }))
    mockedRender.mockResolvedValue(Buffer.from('PDF'))
    const res = await getShareQuotePdf(shareRequest(), { params: { token: 'tok123' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition') ?? '').toContain('filename="Sano Quote - QT-7.pdf"')
  })

  it('does NOT forward cookies to the renderer even when request has them (public flow)', async () => {
    mockedService.mockReturnValue(shareStub({ quote: { quote_number: 'QT-7', deleted_at: null } }))
    mockedRender.mockResolvedValue(Buffer.from('PDF'))

    // Simulate a request that DOES carry cookies (e.g. from a staff browser
    // session also visiting the public share link). The route must NOT
    // forward these to the Puppeteer render — it would leak the session.
    const reqWithCookies = {
      url: 'https://sano.nz/api/share/quote/tok123/pdf',
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'cookie' ? 'sb-access-token=staff-session-token' : '',
      },
    } as unknown as NextRequest
    await getShareQuotePdf(reqWithCookies, { params: { token: 'tok123' } })

    const lastCall = mockedRender.mock.calls.at(-1)
    expect(lastCall?.[1]?.cookies ?? []).toEqual([])
  })
})
