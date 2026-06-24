import { findSubsets, toCents } from '@/lib/subset-sum'

const items = (...pairs: [string, number][]) => pairs.map(([id, amount]) => ({ id, amount }))

describe('findSubsets', () => {
  it('finds a 3-invoice bundle (the real B&T Onehunga $810 case)', () => {
    const pool = items(['INV-0056', 220], ['INV-0059', 195], ['INV-0062', 395], ['INV-0050', 200])
    const res = findSubsets(810, pool)
    expect(res).toContainEqual(expect.arrayContaining(['INV-0056', 'INV-0059', 'INV-0062']))
    // and that combo sums correctly
    const combo = res.find((c) => c.length === 3)!
    const sum = combo.reduce((s, id) => s + pool.find((p) => p.id === id)!.amount, 0)
    expect(sum).toBe(810)
  })

  it('finds a 2-invoice bundle ($500 = 300 + 200)', () => {
    const res = findSubsets(500, items(['a', 300], ['b', 200], ['c', 195]))
    expect(res[0]).toEqual(['a', 'b'])
  })

  it('returns single-item matches and prefers fewer items first', () => {
    const res = findSubsets(200, items(['x', 200], ['y', 100], ['z', 100]))
    expect(res[0]).toEqual(['x']) // 1-item combo first
    expect(res).toContainEqual(['y', 'z'])
  })

  it('handles cents without float drift', () => {
    const res = findSubsets(67.73, items(['m', 67.73], ['n', 0.01]))
    expect(res[0]).toEqual(['m'])
  })

  it('returns nothing when no combination matches', () => {
    expect(findSubsets(1000, items(['a', 100], ['b', 250]))).toEqual([])
  })

  it('ignores items larger than the target', () => {
    const res = findSubsets(100, items(['big', 5000], ['a', 60], ['b', 40]))
    expect(res).toEqual([['a', 'b']])
  })

  it('toCents rounds correctly', () => {
    expect(toCents(8.10)).toBe(810)
    expect(toCents(0.07)).toBe(7)
  })
})
