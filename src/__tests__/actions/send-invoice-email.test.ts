/** @jest-environment node */

// Verify the fail-fast contract for sendInvoiceEmail. When PDF render
// fails, the action returns the user-visible error string AND does NOT
// call Resend AND does NOT update invoice status. Mirrors the
// equivalent test for sendQuoteEmail.

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

// SMS notification path runs after the status update on the success
// path and is wrapped in try/catch in the action. Mock sendNotification
// to a no-op so the success test doesn't have to mock the full SMS
// fetch chain.
jest.mock('@/lib/notifications/send', () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}))

import { sendInvoiceEmail } from '@/app/portal/invoices/[id]/_actions'
import { createClient } from '@/lib/supabase-server'
import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'

const mockedCreate = createClient as unknown as jest.Mock
const mockedRender = renderPdfFromUrl as unknown as jest.Mock

function makeInvoiceSelect(row: Record<string, unknown> | null) {
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

describe('sendInvoiceEmail — fail-fast PDF render', () => {
  it('returns the user-visible error string and does NOT call Resend or update status', async () => {
    // First .from('invoices') call: fetch share_token + invoice_number for PDF.
    const fromMock = jest.fn().mockImplementation(() =>
      makeInvoiceSelect({ share_token: 'tok-x', invoice_number: 'INV-99' }),
    )
    mockedCreate.mockReturnValue({ from: fromMock })

    mockedRender.mockRejectedValue(new Error('puppeteer launch failed'))

    const result = await sendInvoiceEmail({
      invoice_id: 'i-1',
      invoice_number: 'INV-99',
      to: 'a@b.com',
      subject: 'Invoice',
      message: 'hi',
      print_url: 'https://sano.nz/share/invoice/tok-x',
    })

    expect(result).toMatchObject({
      error: 'PDF generation failed, so the email was not sent. Please try again.',
    })
    expect(mockResendSend).not.toHaveBeenCalled()

    // Verify no .update() was invoked.
    const allCalls = fromMock.mock.results.flatMap((r) => r.value.update?.mock?.calls ?? [])
    expect(allCalls).toEqual([])
  })

  it('attaches the PDF buffer with the correct filename when render succeeds', async () => {
    let call = 0
    const updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
    const fromMock = jest.fn().mockImplementation(() => {
      call += 1
      // Call 1: fetch share_token + invoice_number for PDF render.
      if (call === 1) return makeInvoiceSelect({ share_token: 'tok-x', invoice_number: 'INV-99' })
      // Call 2: post-Resend, fetch existing date_issued.
      if (call === 2) return makeInvoiceSelect({ date_issued: null })
      // Call 3: status update.
      if (call === 3) return { update: updateMock }
      // Subsequent calls (e.g. SMS notification fetch): inert.
      return makeInvoiceSelect(null)
    })
    mockedCreate.mockReturnValue({ from: fromMock })

    mockedRender.mockResolvedValue(Buffer.from('PDF-CONTENT'))
    mockResendSend.mockResolvedValue({ error: null })

    const result = await sendInvoiceEmail({
      invoice_id: 'i-1',
      invoice_number: 'INV-99',
      to: 'a@b.com',
      subject: 'Invoice',
      message: 'hi',
      print_url: 'https://sano.nz/share/invoice/tok-x',
    })

    expect(result).toEqual({ success: true })
    const sendArgs = mockResendSend.mock.calls[0][0]
    expect(sendArgs.attachments).toEqual([
      { filename: 'Sano Tax Invoice - INV-99.pdf', content: Buffer.from('PDF-CONTENT') },
    ])
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'sent' }),
    )
  })
})
