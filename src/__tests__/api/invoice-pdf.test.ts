/** @jest-environment node */
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

function fakeRequest(): any {
  return { url: 'https://sano.nz/api/invoices/abc/pdf', headers: { get: () => '' } }
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
