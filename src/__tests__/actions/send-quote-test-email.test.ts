/** @jest-environment node */

// Contract tests for the internal "Send test email" quote action. The whole
// point of this action is that it must NOT mark the quote as sent — so the
// key assertions are: (a) it never writes status/sent_at, (b) it defaults the
// recipient to the logged-in staff member, and (c) it records a test-labelled
// audit row. External I/O (Resend, Puppeteer, headers) is mocked.

jest.mock('@/lib/supabase-server')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/headers', () => ({ headers: () => ({ get: () => 'sano.nz' }) }))
jest.mock('@/lib/email-reply-to', () => ({ getCustomerReplyToEmail: () => 'carol@sano.nz' }))
jest.mock('@/lib/pdf/render-pdf', () => ({
  renderPdfFromUrl: jest.fn().mockResolvedValue(Buffer.from('%PDF-fake')),
}))

const sendMock = jest.fn().mockResolvedValue({ error: null })
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: sendMock } })) }))

import { sendQuoteTestEmail } from '@/app/portal/quotes/[id]/_actions'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock

interface Tracked {
  updatedTables: string[]
  updatePatches: Record<string, unknown>[]
  auditInserts: Record<string, unknown>[]
}

function makeClient(
  quoteRow: Record<string, unknown>,
  staffEmail: string | null,
): { client: unknown; tracked: Tracked } {
  const tracked: Tracked = { updatedTables: [], updatePatches: [], auditInserts: [] }

  const from = jest.fn((table: string) => {
    if (table === 'quotes') {
      return {
        select: () => ({
          eq: () => ({ single: async () => ({ data: quoteRow, error: null }) }),
        }),
        // Any date-backfill update is tracked so the test can assert it never
        // touches status/sent_at.
        update: (patch: Record<string, unknown>) => {
          tracked.updatedTables.push('quotes')
          tracked.updatePatches.push(patch)
          return { eq: async () => ({ error: null }) }
        },
      }
    }
    if (table === 'audit_log') {
      return {
        insert: async (row: Record<string, unknown>) => {
          tracked.auditInserts.push(row)
          return { error: null }
        },
      }
    }
    throw new Error(`unexpected table ${table}`)
  })

  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: staffEmail } } }) },
    from,
  }
  return { client, tracked }
}

const baseQuote = {
  date_issued: '2026-07-01',
  valid_until: '2026-07-31',
  share_token: 'tok_abc',
  quote_number: 'QUO-0261',
}

beforeEach(() => {
  mockedCreate.mockReset()
  sendMock.mockClear()
})

describe('sendQuoteTestEmail', () => {
  it('NEVER sets status or sent_at (quote stays a draft)', async () => {
    const { client, tracked } = makeClient(baseQuote, 'carol@sano.nz')
    mockedCreate.mockReturnValue(client)

    const res = await sendQuoteTestEmail({ quote_id: 'q1', print_url: 'https://sano.nz/x' })

    expect(res).toMatchObject({ success: true })
    // No update patch may carry status or sent_at.
    for (const patch of tracked.updatePatches) {
      expect(patch).not.toHaveProperty('status')
      expect(patch).not.toHaveProperty('sent_at')
    }
  })

  it('defaults the recipient to the logged-in staff email', async () => {
    const { client } = makeClient(baseQuote, 'carol@sano.nz')
    mockedCreate.mockReturnValue(client)

    const res = await sendQuoteTestEmail({ quote_id: 'q1', print_url: 'https://sano.nz/x' })

    expect(res).toMatchObject({ success: true, recipient: 'carol@sano.nz' })
    expect(sendMock).toHaveBeenCalledTimes(1)
    const emailArg = sendMock.mock.calls[0][0]
    expect(emailArg.to).toBe('carol@sano.nz')
    // Clearly marked as a test in the subject.
    expect(emailArg.subject).toBe('TEST – Quote preview – QUO-0261')
  })

  it('honours a typed internal override without touching the customer', async () => {
    const { client } = makeClient(baseQuote, 'carol@sano.nz')
    mockedCreate.mockReturnValue(client)

    const res = await sendQuoteTestEmail({ quote_id: 'q1', to: 'michael@sano.nz', print_url: 'https://sano.nz/x' })

    expect(res).toMatchObject({ success: true, recipient: 'michael@sano.nz' })
    expect(sendMock.mock.calls[0][0].to).toBe('michael@sano.nz')
  })

  it('records a test-labelled audit row (not a customer send)', async () => {
    const { client, tracked } = makeClient(baseQuote, 'carol@sano.nz')
    mockedCreate.mockReturnValue(client)

    await sendQuoteTestEmail({ quote_id: 'q1', print_url: 'https://sano.nz/x' })

    expect(tracked.auditInserts).toHaveLength(1)
    expect(tracked.auditInserts[0]).toMatchObject({
      action: 'quote.test_sent',
      entity_table: 'quotes',
      entity_id: 'q1',
    })
  })

  it('fails cleanly when no internal email is available', async () => {
    const { client } = makeClient(baseQuote, null)
    mockedCreate.mockReturnValue(client)

    const res = await sendQuoteTestEmail({ quote_id: 'q1', to: '', print_url: 'https://sano.nz/x' })

    expect(res.error).toMatch(/no internal email/i)
    expect(sendMock).not.toHaveBeenCalled()
  })
})
