/** @jest-environment node */

// Verify the fail-fast contract AND the pre-render date-stamp
// regression guard for sendInvoiceEmail. Mirrors send-quote-email.test.ts
// with invoice-specific date semantics: due_date is computed via the
// shared computeInvoiceDueDate helper when missing, which requires a
// supplemental clients.payment_terms fetch.

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

function makeClientSelect(row: Record<string, unknown> | null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
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

describe('sendInvoiceEmail — fail-fast PDF render', () => {
  it('returns the user-visible error string and does NOT call Resend or update status', async () => {
    // Single combined fetch — dates already populated so the pre-render
    // path doesn't fire. Renderer will throw, which must bail before
    // any update or Resend call.
    const fromMock = jest.fn().mockImplementation(() =>
      makeInvoiceSelect({
        share_token: 'tok-x',
        invoice_number: 'INV-99',
        date_issued: '2026-05-01',
        due_date: '2026-05-15',
        payment_type: 'on_account',
        scheduled_clean_date: null,
        client_id: 'c-1',
      }),
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
        return makeInvoiceSelect({
          share_token: 'tok-x',
          invoice_number: 'INV-99',
          date_issued: '2026-05-01',
          due_date: '2026-05-15',
          payment_type: 'on_account',
          scheduled_clean_date: null,
          client_id: 'c-1',
        })
      }
      // Call 2: post-send status flip.
      if (call === 2) return { update: statusUpdate }
      // Call 3+ (SMS path fetch): inert null row so the try/catch
      // gate suppresses everything downstream.
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
    // Replies must route to Carol so customers reach a real inbox
    // instead of the noreply sender.
    expect(sendArgs.replyTo).toBe('carol@sano.nz')
    expect(statusUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'sent' }),
    )
    // After the fix, the status flip should NOT carry date_issued —
    // dates are stamped earlier (or were already populated as here).
    expect(statusUpdate.mock.calls[0][0]).not.toHaveProperty('date_issued')
    expect(statusUpdate.mock.calls[0][0]).not.toHaveProperty('due_date')
  })
})

describe('sendInvoiceEmail — pre-render date-stamp', () => {
  it('persists missing date_issued and computed due_date BEFORE rendering the PDF', async () => {
    let call = 0
    const dateUpdate = makeUpdateChain()
    const statusUpdate = makeUpdateChain()
    const fromMock = jest.fn().mockImplementation(() => {
      call += 1
      // Call 1: invoice fetch — both dates null, on_account payment.
      if (call === 1) {
        return makeInvoiceSelect({
          share_token: 'tok-x',
          invoice_number: 'INV-99',
          date_issued: null,
          due_date: null,
          payment_type: 'on_account',
          scheduled_clean_date: null,
          client_id: 'c-1',
        })
      }
      // Call 2: clients.payment_terms fetch — left null so
      // computeInvoiceDueDate falls through to the on_account axis
      // (issued + 14 days).
      if (call === 2) return makeClientSelect({ payment_terms: null })
      // Call 3: pre-render update filling both date columns.
      if (call === 3) return { update: dateUpdate }
      // Call 4: post-send status flip.
      if (call === 4) return { update: statusUpdate }
      // Subsequent: SMS path — inert.
      return makeInvoiceSelect(null)
    })
    mockedCreate.mockReturnValue({ from: fromMock })

    mockedRender.mockResolvedValue(Buffer.from('PDF'))
    mockResendSend.mockResolvedValue({ error: null })

    await sendInvoiceEmail({
      invoice_id: 'i-1',
      invoice_number: 'INV-99',
      to: 'a@b.com',
      subject: 'Invoice',
      message: 'hi',
      print_url: 'https://sano.nz/share/invoice/tok-x',
    })

    // Pre-render update fills both columns. due_date should be
    // exactly 14 days after date_issued (on_account fallback).
    expect(dateUpdate).toHaveBeenCalledTimes(1)
    const datePatch = dateUpdate.mock.calls[0][0] as { date_issued: string; due_date: string }
    expect(datePatch.date_issued).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(datePatch.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const issuedMs = new Date(datePatch.date_issued + 'T00:00:00Z').getTime()
    const dueMs = new Date(datePatch.due_date + 'T00:00:00Z').getTime()
    expect((dueMs - issuedMs) / (24 * 60 * 60 * 1000)).toBe(14)

    // The pre-render update must run BEFORE renderPdfFromUrl —
    // otherwise the share-page render reads stale (null) values
    // and the customer receives a blank-dates PDF.
    const updateOrder = dateUpdate.mock.invocationCallOrder[0]
    const renderOrder = mockedRender.mock.invocationCallOrder[0]
    expect(updateOrder).toBeLessThan(renderOrder)

    // Status flip carries only status (no date columns).
    expect(statusUpdate).toHaveBeenCalledWith({ status: 'sent' })
  })

  it('does NOT issue a pre-render update when both dates are already populated', async () => {
    let call = 0
    const statusUpdate = makeUpdateChain()
    const fromMock = jest.fn().mockImplementation(() => {
      call += 1
      if (call === 1) {
        return makeInvoiceSelect({
          share_token: 'tok-x',
          invoice_number: 'INV-99',
          date_issued: '2026-05-01',
          due_date: '2026-05-15',
          payment_type: 'on_account',
          scheduled_clean_date: null,
          client_id: 'c-1',
        })
      }
      if (call === 2) return { update: statusUpdate }
      return makeInvoiceSelect(null)
    })
    mockedCreate.mockReturnValue({ from: fromMock })

    mockedRender.mockResolvedValue(Buffer.from('PDF'))
    mockResendSend.mockResolvedValue({ error: null })

    await sendInvoiceEmail({
      invoice_id: 'i-1',
      invoice_number: 'INV-99',
      to: 'a@b.com',
      subject: 'Invoice',
      message: 'hi',
      print_url: 'https://sano.nz/share/invoice/tok-x',
    })

    // Exactly one update — the status flip.
    expect(statusUpdate).toHaveBeenCalledTimes(1)
    expect(statusUpdate.mock.calls[0][0]).toEqual({ status: 'sent' })
  })
})
