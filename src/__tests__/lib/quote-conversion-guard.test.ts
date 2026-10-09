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

/** Minimal Supabase stub: one quotes row (plus optional older versions in its
 *  chain), no live children unless asked. `jobOnQuoteIds` limits which quote
 *  ids the existing job belongs to, to test the version-chain lookup. */
function makeClient(
  quote: QuoteRow | null,
  opts: { job?: boolean; invoice?: boolean; chain?: string[]; jobOnQuoteIds?: string[] } = {},
) {
  const chain = opts.chain ?? (quote ? [quote.id] : [])
  const from = jest.fn((table: string) => {
    if (table === 'quotes') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ data: chain.map((id) => ({ id })), error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: quote ? { ...quote, parent_quote_id: null } : null, error: null }),
      }
    }
    if (table === 'jobs' || table === 'invoices') {
      let inIds: string[] | null = null
      const jobRows = () => {
        if (!opts.job) return []
        if (opts.jobOnQuoteIds && inIds && !inIds.some((id) => opts.jobOnQuoteIds!.includes(id))) return []
        return [{ id: 'j-1', job_number: 'JOB-0001' }]
      }
      const rowsFor = () => table === 'jobs'
        ? jobRows()
        : (opts.invoice ? [{ id: 'i-1', invoice_number: 'INV-0001' }] : [])
      // `.limit(1)` is awaited directly by the duplicate-child checks, but
      // chained into `.maybeSingle()` by findExistingChild — so it must be
      // both thenable and chainable.
      const limitResult = () => ({
        data: rowsFor(), error: null,
        maybeSingle: jest.fn().mockImplementation(async () => ({ data: rowsFor()[0] ?? null, error: null })),
        then: (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
          Promise.resolve({ data: rowsFor(), error: null }).then(resolve),
      })
      const api: Record<string, unknown> = {}
      Object.assign(api, {
        select: jest.fn(() => api),
        eq: jest.fn(() => api),
        in: jest.fn((_col: string, ids: string[]) => { inIds = ids; return api }),
        is: jest.fn(() => api),
        limit: jest.fn(() => limitResult()),
      })
      return api
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
      error: expect.stringContaining('already exists for this quote'),
      existing: { kind: 'job', id: 'j-1', number: 'JOB-0001' },
    })
  })

  it('still rejects when a live invoice already exists', async () => {
    const res = await assertQuoteConvertible(makeClient(accepted, { invoice: true }), 'q-1', 'invoice')
    expect(res).toMatchObject({
      error: expect.stringContaining('already exists for this quote'),
      existing: { kind: 'invoice', id: 'i-1', number: 'INV-0001' },
    })
  })

  it('still rejects a missing quote', async () => {
    const res = await assertQuoteConvertible(makeClient(null), 'q-1', 'invoice')
    expect(res).toMatchObject({ error: 'Quote not found.' })
  })
})


describe('assertQuoteConvertible — revised quotes (version chain)', () => {
  it('blocks converting v3 when a live job already exists on v2 (the QUO-0414 duplicate)', async () => {
    const v3 = { ...accepted, id: 'q-v3' }
    const client = makeClient(v3, { job: true, chain: ['q-v1', 'q-v2', 'q-v3'], jobOnQuoteIds: ['q-v2'] })
    const r = await assertQuoteConvertible(client, 'q-v3', 'job')
    expect('error' in r && r.error).toMatch(/already exists for this quote/)
  })

  it('allows it when no version of the quote has a job', async () => {
    const v3 = { ...accepted, id: 'q-v3' }
    const client = makeClient(v3, { job: true, chain: ['q-v1', 'q-v2', 'q-v3'], jobOnQuoteIds: ['some-other-quote'] })
    const r = await assertQuoteConvertible(client, 'q-v3', 'job')
    expect('ok' in r && r.ok).toBe(true)
  })
})
