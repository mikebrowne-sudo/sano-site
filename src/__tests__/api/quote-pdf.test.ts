/** @jest-environment node */
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

function fakeRequest(): any {
  return {
    url: 'https://sano.nz/api/quotes/abc/pdf',
    headers: { get: () => '' },
  }
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
