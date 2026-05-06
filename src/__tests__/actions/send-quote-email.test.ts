/** @jest-environment node */

// Verify the fail-fast contract AND the pre-render date-stamp
// regression guard.
//
// Two contracts under test:
// 1. PDF render failure: action returns the canonical error string,
//    Resend is NOT called, status is NOT flipped.
// 2. Missing date_issued / valid_until at send time: BOTH columns
//    must be persisted via UPDATE BEFORE the PDF render call. The
//    PDF reads these fields from the DB via the share page; if we
//    render-then-stamp the customer receives a blank-dates PDF.

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

function makeUpdateChain() {
  return jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
}

beforeEach(() => {
  mockedCreate.mockReset()
  mockedRender.mockReset()
  mockResendSend.mockReset()
})

describe('sendQuoteEmail — fail-fast PDF render', () => {
  it('returns the user-visible error string and does NOT call Resend or update status', async () => {
    // Single combined fetch with dates already populated — the pre-render
    // date-stamp UPDATE doesn't fire on this path, so the only update we
    // need to guard against is the post-send status flip.
    const fromMock = jest.fn().mockImplementation(() =>
      makeQuoteSelect({
        date_issued: '2026-05-01',
        valid_until: '2026-05-31',
        sent_at: null,
        share_token: 'tok-x',
        quote_number: 'QT-99',
      }),
    )
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
    const statusUpdate = makeUpdateChain()
    const fromMock = jest.fn().mockImplementation(() => {
      call += 1
      // Call 1: combined upfront fetch — dates already populated.
      if (call === 1) {
        return makeQuoteSelect({
          date_issued: '2026-05-01',
          valid_until: '2026-05-31',
          sent_at: null,
          share_token: 'tok-x',
          quote_number: 'QT-99',
        })
      }
      // Call 2: post-send status flip.
      return { update: statusUpdate }
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
    expect(statusUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'sent',
        sent_at: expect.any(String),
      }),
    )
  })
})

describe('sendQuoteEmail — pre-render date-stamp', () => {
  it('persists missing date_issued and valid_until BEFORE rendering the PDF', async () => {
    let call = 0
    const dateUpdate = makeUpdateChain()
    const statusUpdate = makeUpdateChain()
    const fromMock = jest.fn().mockImplementation(() => {
      call += 1
      // Call 1: combined upfront fetch — both dates are null.
      if (call === 1) {
        return makeQuoteSelect({
          date_issued: null,
          valid_until: null,
          sent_at: null,
          share_token: 'tok-x',
          quote_number: 'QT-99',
        })
      }
      // Call 2: pre-render update filling missing dates.
      if (call === 2) return { update: dateUpdate }
      // Call 3: post-send status flip.
      return { update: statusUpdate }
    })
    mockedCreate.mockReturnValue({ from: fromMock })

    mockedRender.mockResolvedValue(Buffer.from('PDF'))
    mockResendSend.mockResolvedValue({ error: null })

    await sendQuoteEmail({
      quote_id: 'q-1',
      quote_number: 'QT-99',
      to: 'a@b.com',
      subject: 'Quote',
      message: 'hi',
      print_url: 'https://sano.nz/share/quote/tok-x',
    })

    // Pre-render update fills both columns.
    expect(dateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        date_issued: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        valid_until: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )

    // The pre-render update must run BEFORE renderPdfFromUrl —
    // otherwise the share-page render reads stale (null) values
    // and the customer receives a blank-dates PDF.
    const updateOrder = dateUpdate.mock.invocationCallOrder[0]
    const renderOrder = mockedRender.mock.invocationCallOrder[0]
    expect(updateOrder).toBeLessThan(renderOrder)

    // Status flip happens after render+send and only carries
    // status + sent_at (dates were already stamped pre-render).
    expect(statusUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'sent',
        sent_at: expect.any(String),
      }),
    )
    const statusCallArg = statusUpdate.mock.calls[0][0]
    expect(statusCallArg).not.toHaveProperty('date_issued')
    expect(statusCallArg).not.toHaveProperty('valid_until')
  })

  it('does NOT issue a pre-render update when both dates are already populated', async () => {
    let call = 0
    const statusUpdate = makeUpdateChain()
    const fromMock = jest.fn().mockImplementation(() => {
      call += 1
      if (call === 1) {
        return makeQuoteSelect({
          date_issued: '2026-04-01',
          valid_until: '2026-05-01',
          sent_at: null,
          share_token: 'tok-x',
          quote_number: 'QT-99',
        })
      }
      // Only one update expected: the status flip.
      return { update: statusUpdate }
    })
    mockedCreate.mockReturnValue({ from: fromMock })

    mockedRender.mockResolvedValue(Buffer.from('PDF'))
    mockResendSend.mockResolvedValue({ error: null })

    await sendQuoteEmail({
      quote_id: 'q-1',
      quote_number: 'QT-99',
      to: 'a@b.com',
      subject: 'Quote',
      message: 'hi',
      print_url: 'https://sano.nz/share/quote/tok-x',
    })

    // Exactly one update on the entire flow — the status flip.
    expect(statusUpdate).toHaveBeenCalledTimes(1)
    expect(statusUpdate.mock.calls[0][0]).toEqual(
      expect.objectContaining({ status: 'sent', sent_at: expect.any(String) }),
    )
  })
})
