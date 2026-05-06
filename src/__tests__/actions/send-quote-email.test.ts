/** @jest-environment node */

// Verify the fail-fast contract: when the PDF render throws, the
// action returns the user-visible error string AND does NOT call
// Resend AND does NOT update quote status.

jest.mock('@/lib/supabase-server')
jest.mock('@/lib/pdf/render-pdf')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/headers', () => ({
  headers: () => ({ get: () => 'sano.nz' }),
}))

const mockResendSend = jest.fn()
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
}))

import { sendQuoteEmail } from '@/app/portal/quotes/[id]/_actions'
import { createClient } from '@/lib/supabase-server'
import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'

const mockedCreate = createClient as unknown as jest.Mock
const mockedRender = renderPdfFromUrl as unknown as jest.Mock

function makeQuoteSelect(row: Record<string, unknown> | null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: row, error: row ? null : new Error('not found') }),
    update: jest.fn().mockReturnThis(),
  }
}

beforeEach(() => {
  mockedCreate.mockReset()
  mockedRender.mockReset()
  mockResendSend.mockReset()
})

describe('sendQuoteEmail — fail-fast PDF render', () => {
  it('returns the user-visible error string and does NOT call Resend or update status', async () => {
    // First .from('quotes') call: dedupe check (returns a quote with no recent sent_at).
    // Second .from('quotes') call: fetch share_token + quote_number for PDF.
    let call = 0
    const fromMock = jest.fn().mockImplementation(() => {
      call += 1
      if (call === 1) return makeQuoteSelect({ date_issued: null, valid_until: null, sent_at: null })
      return makeQuoteSelect({ share_token: 'tok-x', quote_number: 'QT-99' })
    })
    mockedCreate.mockReturnValue({ from: fromMock })

    mockedRender.mockRejectedValue(new Error('puppeteer launch failed'))

    const result = await sendQuoteEmail({
      quote_id: 'q-1',
      quote_number: 'QT-99',
      to: 'a@b.com',
      subject: 'Quote',
      message: 'hi',
      print_url: 'https://sano.nz/share/quote/tok-x',
    })

    expect(result).toMatchObject({
      error: 'PDF generation failed, so the email was not sent. Please try again.',
    })
    expect(mockResendSend).not.toHaveBeenCalled()

    // Verify no .update() was invoked on quotes.
    const allCalls = fromMock.mock.results.flatMap((r) => r.value.update?.mock?.calls ?? [])
    expect(allCalls).toEqual([])
  })

  it('attaches the PDF buffer with the correct filename when render succeeds', async () => {
    let call = 0
    const updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
    const fromMock = jest.fn().mockImplementation(() => {
      call += 1
      if (call === 1) return makeQuoteSelect({ date_issued: null, valid_until: null, sent_at: null })
      if (call === 2) return makeQuoteSelect({ share_token: 'tok-x', quote_number: 'QT-99' })
      return { update: updateMock }
    })
    mockedCreate.mockReturnValue({ from: fromMock })

    mockedRender.mockResolvedValue(Buffer.from('PDF-CONTENT'))
    mockResendSend.mockResolvedValue({ error: null })

    const result = await sendQuoteEmail({
      quote_id: 'q-1',
      quote_number: 'QT-99',
      to: 'a@b.com',
      subject: 'Quote',
      message: 'hi',
      print_url: 'https://sano.nz/share/quote/tok-x',
    })

    expect(result).toEqual({ success: true })
    const sendArgs = mockResendSend.mock.calls[0][0]
    expect(sendArgs.attachments).toEqual([
      { filename: 'Sano Quote - QT-99.pdf', content: Buffer.from('PDF-CONTENT') },
    ])
  })
})
