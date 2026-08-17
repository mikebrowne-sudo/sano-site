/** @jest-environment node */

// Server-side invariant: an accepted quote is never mutated in place.
//
// Before this guard the rule lived only in EditQuoteForm, which forks a new
// draft version before saving. Any other caller could overwrite an accepted
// quote silently — a production audit found 15 quotes whose price had been
// changed after acceptance that way. These tests prove the write does not
// happen, not merely that an error string comes back.

jest.mock('@/lib/supabase-server')
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('next/navigation', () => ({ redirect: jest.fn(), notFound: jest.fn() }))
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: jest.fn() } })) }))
jest.mock('@/lib/pdf/render-pdf', () => ({ renderPdfFromUrl: jest.fn() }))
jest.mock('@/lib/amendment-lock', () => {
  const actual = jest.requireActual('@/lib/amendment-lock')
  return {
    ...actual,
    // Keep the real accepted-quote guard; stub only the invoice lock so
    // these tests isolate the new invariant.
    assertCanAmend: jest.fn().mockReturnValue({ ok: true, overridden: false }),
    findLockingInvoiceForQuote: jest.fn().mockResolvedValue(null),
    writeAmendmentAudit: jest.fn().mockResolvedValue(undefined),
  }
})

import { updateQuote } from '@/app/portal/quotes/[id]/_actions'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock

function makeClient(status: string) {
  const quotesUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
  const itemsDelete = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
  const from = jest.fn((table: string) => {
    if (table === 'quotes') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            is_price_overridden: false, override_confirmed_by: null, override_confirmed_at: null,
            base_price: 500, discount: 0, share_token: 'tok-1', status,
          },
          error: null,
        }),
        update: quotesUpdate,
      }
    }
    if (table === 'quote_items') {
      return { delete: itemsDelete, insert: jest.fn().mockResolvedValue({ error: null }) }
    }
    return {
      select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    }
  })
  return {
    client: { from, auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u-1', email: 'staff@sano.nz' } } }) } },
    spies: { quotesUpdate, itemsDelete },
  }
}

const input = {
  id: 'q-1', client_id: 'cl-1', status: 'accepted',
  base_price: 900, discount: 0, gst_included: false, addons: [],
}

beforeEach(() => mockedCreate.mockReset())

it('refuses to overwrite an ACCEPTED quote — and performs no write', async () => {
  const { client, spies } = makeClient('accepted')
  mockedCreate.mockReturnValue(client)

  const res = await updateQuote(input)

  expect(res).toMatchObject({ error: expect.stringContaining('already been accepted') })
  // The invariant that matters: nothing was written.
  expect(spies.quotesUpdate).not.toHaveBeenCalled()
  expect(spies.itemsDelete).not.toHaveBeenCalled()
})

it('leaves the accepted row untouched — price is not changed to the new value', async () => {
  const { client, spies } = makeClient('accepted')
  mockedCreate.mockReturnValue(client)

  await updateQuote({ ...input, base_price: 9999 })

  expect(spies.quotesUpdate).not.toHaveBeenCalled()
})

it.each(['draft', 'sent', 'viewed', 'declined'])(
  'still allows an in-place edit of a %s quote (unchanged behaviour)',
  async (status) => {
    const { client, spies } = makeClient(status)
    mockedCreate.mockReturnValue(client)

    const res = await updateQuote({ ...input, status })

    expect(res).not.toMatchObject({ error: expect.stringContaining('already been accepted') })
    expect(spies.quotesUpdate).toHaveBeenCalled()
  },
)
