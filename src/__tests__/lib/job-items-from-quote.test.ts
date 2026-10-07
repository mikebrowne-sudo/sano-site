import { buildQuoteSourcedItems, copyQuoteItemsToJob } from '@/lib/job-items-from-quote'
import { sumJobItemCharges, sumJobItemCosts } from '@/lib/job-items'

const JOB = '22222222-2222-2222-2222-222222222222'
const USER = '33333333-3333-3333-3333-333333333333'

describe('buildQuoteSourcedItems', () => {
  it('marks every row source=quote so its charge is never billed twice', () => {
    const rows = buildQuoteSourcedItems(
      JOB,
      [{ label: 'Carpet clean', price: 300, sort_order: 0 }],
      USER,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      job_id: JOB,
      label: 'Carpet clean',
      price: 300,
      source: 'quote',
      contractor_id: null,
      cost_amount: null,
      created_by: USER,
    })
  })

  it('leaves the contractor unset — the quote does not know who will do it', () => {
    const rows = buildQuoteSourcedItems(JOB, [{ label: 'Oven', price: 80 }], USER)
    expect(rows[0].contractor_id).toBeNull()
    expect(rows[0].cost_amount).toBeNull()
  })

  it('drops blank labels, which the DB check constraint would reject', () => {
    const rows = buildQuoteSourcedItems(
      JOB,
      [{ label: '   ', price: 50 }, { label: 'Windows', price: 120 }],
      USER,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].label).toBe('Windows')
  })

  it('falls back to index when sort_order is missing', () => {
    const rows = buildQuoteSourcedItems(
      JOB,
      [{ label: 'A', price: 1 }, { label: 'B', price: 2 }],
      USER,
    )
    expect(rows.map((r) => r.sort_order)).toEqual([0, 1])
  })

  it('handles null/undefined/empty addon lists', () => {
    expect(buildQuoteSourcedItems(JOB, null, USER)).toEqual([])
    expect(buildQuoteSourcedItems(JOB, undefined, USER)).toEqual([])
    expect(buildQuoteSourcedItems(JOB, [], USER)).toEqual([])
  })

  it('normalises a missing price to zero rather than null', () => {
    const rows = buildQuoteSourcedItems(JOB, [{ label: 'Freebie' }], USER)
    expect(rows[0].price).toBe(0)
  })
})

describe('quote-sourced items do not double-bill', () => {
  it('contributes no CHARGE, because job_price already contains it', () => {
    const rows = buildQuoteSourcedItems(JOB, [{ label: 'Carpet', price: 300 }], USER)
    expect(sumJobItemCharges(rows as never)).toBe(0)
  })

  it('DOES contribute cost once a contractor and amount are set on the job', () => {
    const rows = buildQuoteSourcedItems(JOB, [{ label: 'Carpet', price: 300 }], USER)
    const assigned = rows.map((r) => ({ ...r, contractor_id: 'x', cost_amount: 180 }))
    expect(sumJobItemCosts(assigned as never)).toBe(180)
    // Still never charged again.
    expect(sumJobItemCharges(assigned as never)).toBe(0)
  })
})

describe('copyQuoteItemsToJob', () => {
  function client(error: { message: string } | null) {
    const insert = jest.fn().mockResolvedValue({ error })
    return { client: { from: () => ({ insert }) }, insert }
  }

  it('inserts the built rows and reports the count', async () => {
    const { client: c, insert } = client(null)
    const res = await copyQuoteItemsToJob(c, JOB, [{ label: 'Carpet', price: 300 }], USER)
    expect(res).toEqual({ inserted: 1 })
    expect(insert).toHaveBeenCalledTimes(1)
  })

  it('skips the insert entirely when there is nothing to copy', async () => {
    const { client: c, insert } = client(null)
    const res = await copyQuoteItemsToJob(c, JOB, [], USER)
    expect(res).toEqual({ inserted: 0 })
    expect(insert).not.toHaveBeenCalled()
  })

  it('returns the error instead of throwing — a copy failure must not fail the conversion', async () => {
    const { client: c } = client({ message: 'relation "job_items" does not exist' })
    const res = await copyQuoteItemsToJob(c, JOB, [{ label: 'Carpet', price: 300 }], USER)
    expect(res.inserted).toBe(0)
    expect(res.error).toContain('job_items')
  })

  it('swallows a thrown client error the same way', async () => {
    const c = { from: () => ({ insert: () => { throw new Error('network down') } }) }
    const res = await copyQuoteItemsToJob(c as never, JOB, [{ label: 'X', price: 1 }], USER)
    expect(res.inserted).toBe(0)
    expect(res.error).toBe('network down')
  })
})
