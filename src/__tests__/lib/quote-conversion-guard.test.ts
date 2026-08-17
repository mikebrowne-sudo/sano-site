/** @jest-environment node */

// Server-side conversion invariants.
//
// A production audit found that `assertQuoteConvertible` checked archived /
// already-converted / duplicate-child, but NOT status==='accepted' or
// is_latest_version. The three job actions re-checked those themselves, but
// `convertToInvoice` did not — so only the `canConvert` UI gate kept a draft
// from being invoiced. These lock the rule in at the guard.

import { assertQuoteConvertible } from '@/lib/quote-conversion-guard'

type QuoteRow = {
  id: string
  status: string | null
  accepted_at: string | null
  deleted_at: string | null
  is_latest_version: boolean | null
}

/** Minimal Supabase stub: one quotes row, no live children unless asked. */
function makeClient(quote: QuoteRow | null, opts: { job?: boolean; invoice?: boolean } = {}) {
  const from = jest.fn((table: string) => {
    if (table === 'quotes') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: quote, error: null }),
      }
    }
    if (table === 'jobs' || table === 'invoices') {
      const rows = table === 'jobs'
        ? (opts.job ? [{ id: 'j-1', job_number: 'JOB-0001' }] : [])
        : (opts.invoice ? [{ id: 'i-1', invoice_number: 'INV-0001' }] : [])
      // `.limit(1)` is awaited directly by the duplicate-child checks, but
      // chained into `.maybeSingle()` by findExistingChild — so it must be
      // both thenable and chainable.
      const limitResult = {
        data: rows, error: null,
        maybeSingle: jest.fn().mockResolvedValue({ data: rows[0] ?? null, error: null }),
        then: (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
          Promise.resolve({ data: rows, error: null }).then(resolve),
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnValue(limitResult),
      }
    }
    throw new Error(`unexpected table ${table}`)
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from } as any
}

const accepted: QuoteRow = {
  id: 'q-1', status: 'accepted', accepted_at: '2026-08-01T00:00:00Z',
  deleted_at: null, is_latest_version: true,
}

describe('assertQuoteConvertible — accepted + latest required', () => {
  it('rejects a DRAFT quote for invoice conversion', async () => {
    const res = await assertQuoteConvertible(makeClient({ ...accepted, status: 'draft', accepted_at: null }), 'q-1', 'invoice')
    expect(res).toMatchObject({ error: expect.stringContaining('Only an accepted quote') })
    expect('ok' in res).toBe(false)
  })

  it('rejects a SENT but unaccepted quote for invoice conversion', async () => {
    const res = await assertQuoteConvertible(makeClient({ ...accepted, status: 'sent', accepted_at: null }), 'q-1', 'invoice')
    expect(res).toMatchObject({ error: expect.stringContaining('Only an accepted quote') })
  })

  it('rejects a VIEWED but unaccepted quote for invoice conversion', async () => {
    const res = await assertQuoteConvertible(makeClient({ ...accepted, status: 'viewed', accepted_at: null }), 'q-1', 'invoice')
    expect(res).toMatchObject({ error: expect.stringContaining('Only an accepted quote') })
  })

  it('rejects a SUPERSEDED accepted version (is_latest_version false)', async () => {
    const res = await assertQuoteConvertible(makeClient({ ...accepted, is_latest_version: false }), 'q-1', 'invoice')
    expect(res).toMatchObject({ error: expect.stringContaining('superseded version') })
  })

  it('ACCEPTS the latest accepted version', async () => {
    const res = await assertQuoteConvertible(makeClient(accepted), 'q-1', 'invoice')
    expect(res).toMatchObject({ ok: true })
  })

  it('grandfathers a null is_latest_version (pre-versioning row)', async () => {
    const res = await assertQuoteConvertible(makeClient({ ...accepted, is_latest_version: null }), 'q-1', 'invoice')
    expect(res).toMatchObject({ ok: true })
  })

  it('applies the same rule to job and both kinds', async () => {
    const draft = { ...accepted, status: 'draft', accepted_at: null }
    await expect(assertQuoteConvertible(makeClient(draft), 'q-1', 'job'))
      .resolves.toMatchObject({ error: expect.stringContaining('Only an accepted quote') })
    await expect(assertQuoteConvertible(makeClient(draft), 'q-1', 'both'))
      .resolves.toMatchObject({ error: expect.stringContaining('Only an accepted quote') })
  })
})

describe('assertQuoteConvertible — pre-existing guards unchanged', () => {
  it('still rejects an archived quote, before the accepted check', async () => {
    const res = await assertQuoteConvertible(
      makeClient({ ...accepted, status: 'draft', deleted_at: '2026-08-02T00:00:00Z' }), 'q-1', 'invoice')
    expect(res).toMatchObject({ error: 'Cannot convert an archived quote.' })
  })

  it('still rejects an already-converted quote with its own message', async () => {
    const res = await assertQuoteConvertible(
      makeClient({ ...accepted, status: 'converted' }, { invoice: true }), 'q-1', 'invoice')
    expect(res).toMatchObject({ error: expect.stringContaining('already been converted') })
  })

  it('still rejects when a live job already exists', async () => {
    const res = await assertQuoteConvertible(makeClient(accepted, { job: true }), 'q-1', 'job')
    expect(res).toMatchObject({
      error: expect.stringContaining('job already exists'),
      existing: { kind: 'job', id: 'j-1', number: 'JOB-0001' },
    })
  })

  it('still rejects when a live invoice already exists', async () => {
    const res = await assertQuoteConvertible(makeClient(accepted, { invoice: true }), 'q-1', 'invoice')
    expect(res).toMatchObject({
      error: expect.stringContaining('invoice already exists'),
      existing: { kind: 'invoice', id: 'i-1', number: 'INV-0001' },
    })
  })

  it('still rejects a missing quote', async () => {
    const res = await assertQuoteConvertible(makeClient(null), 'q-1', 'invoice')
    expect(res).toMatchObject({ error: 'Quote not found.' })
  })
})
