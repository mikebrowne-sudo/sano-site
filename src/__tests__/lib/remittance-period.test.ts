import { splitByPeriod, sumInvoices, type EligibleInvoice } from '@/lib/remittance-period'

function inv(partial: Partial<EligibleInvoice> & { id: string }): EligibleInvoice {
  return {
    contractorId: 'c1',
    amount: 100,
    hours: 2,
    gstAmount: 15,
    serviceDate: null,
    invoiceNumber: 'CI-0001',
    ...partial,
  }
}

describe('splitByPeriod', () => {
  const first = inv({ id: 'a', serviceDate: '2026-07-05' })
  const mid = inv({ id: 'b', serviceDate: '2026-07-15' })
  const late = inv({ id: 'c', serviceDate: '2026-07-16' })
  const undated = inv({ id: 'd', serviceDate: null })
  const all = [first, mid, late, undated]

  it('with no range set, includes everything as inRange (current behaviour preserved)', () => {
    const r = splitByPeriod(all, {})
    expect(r.inRange.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(r.outOfRange).toHaveLength(0)
    expect(r.undated).toHaveLength(0)
  })

  it('includes only dated invoices within [from,to] inclusive', () => {
    const r = splitByPeriod(all, { from: '2026-07-01', to: '2026-07-15' })
    expect(r.inRange.map((i) => i.id)).toEqual(['a', 'b'])
    expect(r.outOfRange.map((i) => i.id)).toEqual(['c'])
  })

  it('treats both bounds as inclusive (boundary dates land in range)', () => {
    const r = splitByPeriod([first, mid], { from: '2026-07-05', to: '2026-07-15' })
    expect(r.inRange.map((i) => i.id)).toEqual(['a', 'b'])
    expect(r.outOfRange).toHaveLength(0)
  })

  it('excludes undated invoices from a ranged batch and reports them separately', () => {
    const r = splitByPeriod(all, { from: '2026-07-16', to: '2026-07-31' })
    expect(r.inRange.map((i) => i.id)).toEqual(['c'])
    expect(r.undated.map((i) => i.id)).toEqual(['d'])
  })

  it('open-start range (to only) includes everything on/before the upper bound', () => {
    const r = splitByPeriod(all, { to: '2026-07-15' })
    expect(r.inRange.map((i) => i.id)).toEqual(['a', 'b'])
    expect(r.outOfRange.map((i) => i.id)).toEqual(['c'])
    expect(r.undated.map((i) => i.id)).toEqual(['d'])
  })

  it('open-end range (from only) includes everything on/after the lower bound', () => {
    const r = splitByPeriod(all, { from: '2026-07-16' })
    expect(r.inRange.map((i) => i.id)).toEqual(['c'])
    expect(r.outOfRange.map((i) => i.id)).toEqual(['a', 'b'])
    expect(r.undated.map((i) => i.id)).toEqual(['d'])
  })

  it('models the two-run split: 1-15 then 16-EOM are disjoint and complete', () => {
    const firstHalf = splitByPeriod(all, { from: '2026-07-01', to: '2026-07-15' }).inRange.map((i) => i.id)
    const secondHalf = splitByPeriod(all, { from: '2026-07-16', to: '2026-07-31' }).inRange.map((i) => i.id)
    expect(firstHalf).toEqual(['a', 'b'])
    expect(secondHalf).toEqual(['c'])
    // no dated invoice appears in both halves
    expect(firstHalf.filter((id) => secondHalf.includes(id))).toHaveLength(0)
  })
})

describe('sumInvoices', () => {
  it('sums labour ex-GST, GST and hours with cent rounding', () => {
    const r = sumInvoices([
      inv({ id: 'a', amount: 100.005, gstAmount: 15.001, hours: 2 }),
      inv({ id: 'b', amount: 50, gstAmount: 7.5, hours: 1.5 }),
    ])
    expect(r.count).toBe(2)
    expect(r.total).toBe(150.01)
    expect(r.gst).toBe(22.5)
    expect(r.hours).toBe(3.5)
  })

  it('treats null hours/gst as zero', () => {
    const r = sumInvoices([inv({ id: 'a', amount: 80, gstAmount: null, hours: null })])
    expect(r.total).toBe(80)
    expect(r.gst).toBe(0)
    expect(r.hours).toBe(0)
  })
})
