import { findCombos, type WorkItem } from '@/lib/reconcile-combos'

const w = (number: string, amount: number, kind: WorkItem['kind'] = 'invoice', date = '2026-10-01'): WorkItem =>
  ({ id: number, number, amount, kind, date, clientId: 'c', clientLabel: 'B&T Ellerslie' })

describe('findCombos — which open work adds up to a payment', () => {
  it('finds a bundle of invoices that sums exactly', () => {
    const combos = findCombos([w('INV-1', 200), w('INV-2', 325), w('INV-3', 999)], 525)
    expect(combos[0].items.map((i) => i.number)).toEqual(['INV-1', 'INV-2'])
  })

  it('a single exact item counts', () => {
    expect(findCombos([w('INV-1', 380), w('INV-2', 195)], 380)[0].items.map((i) => i.number)).toEqual(['INV-1'])
  })

  it('prefers fewer items', () => {
    const combos = findCombos([w('A', 100), w('B', 200), w('C', 300)], 300)
    expect(combos[0].items.map((i) => i.number)).toEqual(['C'])
    expect(combos[1].items.map((i) => i.number)).toEqual(['A', 'B'])
  })

  it('prefers sent invoices over drafts and un-invoiced jobs on a tie', () => {
    const combos = findCombos([w('JOB-9', 300, 'job'), w('INV-8', 300, 'draft'), w('INV-7', 300)], 300)
    expect(combos.map((c) => c.items[0].kind)).toEqual(['invoice', 'draft', 'job'])
  })

  it('penalises work dated after the payment', () => {
    const combos = findCombos([w('LATER', 300, 'invoice', '2026-11-01'), w('EARLIER', 300, 'invoice', '2026-09-01')], 300, { paymentDate: '2026-10-14' })
    expect(combos[0].items[0].number).toBe('EARLIER')
  })

  it('handles cents exactly', () => {
    expect(findCombos([w('A', 199.96), w('B', 140.04)], 340)[0].items).toHaveLength(2)
  })

  it('returns nothing when nothing adds up', () => {
    expect(findCombos([w('INV-0428', 380), w('INV-0275', 195), w('JOB-0510', 480, 'job')], 870)).toEqual([])
  })

  it('the real Ellerslie case: several answers, ranked, all exact', () => {
    const pool = [
      w('INV-0487', 360, 'paid_unmatched'), w('INV-0427', 1150, 'paid_unmatched'), w('INV-0421', 200, 'paid_unmatched'),
      w('INV-0417', 325, 'paid_unmatched'), w('INV-0388', 240), w('INV-0378', 545, 'draft'), w('INV-0413', 480, 'draft'),
      w('JOB-0316', 350, 'job'), w('JOB-0473', 235, 'job'), w('JOB-0489', 285, 'job'), w('JOB-0486', 360, 'job'),
    ]
    const combos = findCombos(pool, 2655, { limit: 10 })
    expect(combos.length).toBeGreaterThanOrEqual(5)
    for (const c of combos) expect(Math.round(c.items.reduce((s, i) => s + i.amount, 0) * 100)).toBe(265500)
    for (let k = 1; k < combos.length; k++) expect(combos[k].score).toBeGreaterThanOrEqual(combos[k - 1].score)
  })
})
