/** @jest-environment node */

// "Send again" on an accepted quote must not demote it back to 'sent'.
//
// sendQuoteEmail previously wrote `status: 'sent'` unconditionally. Adding a
// plain re-send to the accepted action bar would therefore have wiped the
// acceptance from the workflow bar, re-armed "Mark as accepted", and left
// accepted_at contradicting the status — the same class of silent-state-loss
// bug as the accepted-quote overwrite this work started from.
//
// These assert the status PATCH itself, not just the return value.

jest.mock('@/lib/supabase-server')
jest.mock('@/lib/pdf/render-pdf')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/headers', () => ({ headers: () => ({ get: () => 'sano.nz' }) }))

const mockResendSend = jest.fn()
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockResendSend } })),
}))

import { sendQuoteEmail } from '@/app/portal/quotes/[id]/_actions'
import { createClient } from '@/lib/supabase-server'
import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'

const mockedCreate = createClient as unknown as jest.Mock
const mockedRender = renderPdfFromUrl as unknown as jest.Mock

/** Captures every quotes UPDATE payload so we can assert on the status patch. */
function makeClient(status: string) {
  const updates: Record<string, unknown>[] = []
  const update = jest.fn((payload: Record<string, unknown>) => {
    updates.push(payload)
    return { eq: jest.fn().mockResolvedValue({ error: null }) }
  })
  const from = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: {
        date_issued: '2026-05-01',
        valid_until: '2026-05-31',
        sent_at: '2026-05-01T00:00:00Z',
        share_token: 'tok-x',
        quote_number: 'QT-99',
        status,
      },
      error: null,
    }),
    update,
  }))
  return { client: { from }, updates }
}

const input = {
  quote_id: 'q-1', quote_number: 'QT-99', to: 'a@b.com',
  subject: 'Quote QT-99', message: 'Hi', print_url: 'https://sano.nz/share/quote/tok-x',
}

beforeEach(() => {
  mockedCreate.mockReset()
  mockedRender.mockReset()
  mockResendSend.mockReset()
  mockedRender.mockResolvedValue(Buffer.from('pdf'))
  mockResendSend.mockResolvedValue({ error: null })
})

describe('sendQuoteEmail — status preserved on re-send', () => {
  it('does NOT demote an ACCEPTED quote back to sent', async () => {
    const { client, updates } = makeClient('accepted')
    mockedCreate.mockReturnValue(client)

    const res = await sendQuoteEmail(input)

    expect(res).toMatchObject({ success: true })
    const statusWrites = updates.filter((u) => 'status' in u)
    expect(statusWrites).toHaveLength(0)
    // sent_at is still refreshed — the email genuinely went out.
    expect(updates.some((u) => 'sent_at' in u)).toBe(true)
  })

  it('does NOT demote a CONVERTED quote', async () => {
    const { client, updates } = makeClient('converted')
    mockedCreate.mockReturnValue(client)
    await sendQuoteEmail(input)
    expect(updates.filter((u) => 'status' in u)).toHaveLength(0)
  })

  it('does NOT discard VIEWED (client engagement is more than "sent")', async () => {
    const { client, updates } = makeClient('viewed')
    mockedCreate.mockReturnValue(client)
    await sendQuoteEmail(input)
    expect(updates.filter((u) => 'status' in u)).toHaveLength(0)
  })

  it.each(['draft', 'sent', 'declined'])(
    'still advances a %s quote to sent (unchanged behaviour)',
    async (status) => {
      const { client, updates } = makeClient(status)
      mockedCreate.mockReturnValue(client)

      await sendQuoteEmail(input)

      expect(updates.some((u) => u.status === 'sent')).toBe(true)
    },
  )
})
