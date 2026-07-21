import { pickSnapshotRate, toPositiveRate } from '@/lib/contractor-rate-snapshot'

describe('toPositiveRate', () => {
  it('accepts positive numbers + numeric strings', () => {
    expect(toPositiveRate(50)).toBe(50)
    expect(toPositiveRate('45.5')).toBe(45.5)
  })
  it('rejects null, zero, negative, non-numeric', () => {
    expect(toPositiveRate(null)).toBeNull()
    expect(toPositiveRate(undefined)).toBeNull()
    expect(toPositiveRate(0)).toBeNull()
    expect(toPositiveRate(-5)).toBeNull()
    expect(toPositiveRate('abc')).toBeNull()
  })
})

describe('pickSnapshotRate — the snapshot rule', () => {
  it('new assignment (no existing snapshot) → snapshots the current contractor rate', () => {
    expect(pickSnapshotRate(null, 50)).toBe(50) // e.g. assignJob / addJobWorker / createJob
  })

  it('later contractor-rate change does NOT alter an existing snapshot', () => {
    // existing snapshot 45; profile rate has since risen to 99 → keep 45
    expect(pickSnapshotRate(45, 99)).toBe(45)
  })

  it('historical job keeps its original snapshotted rate', () => {
    expect(pickSnapshotRate(38.5, 60)).toBe(38.5)
  })

  it('a null/zero existing snapshot is replaced by the current rate', () => {
    expect(pickSnapshotRate(null, 50)).toBe(50)
    expect(pickSnapshotRate(0, 50)).toBe(50)
    expect(pickSnapshotRate(-1, 50)).toBe(50)
  })

  it('legacy row with no rate anywhere → null (job-cost falls back to live rate + "est." badge)', () => {
    expect(pickSnapshotRate(null, null)).toBeNull()
    expect(pickSnapshotRate(null, 0)).toBeNull()
  })

  it('multiple contractors on one job resolve independently', () => {
    const workers = [
      { existing: null, current: 50 }, // fresh → 50
      { existing: 30, current: 80 },   // preserved → 30
      { existing: null, current: null }, // legacy → null
    ]
    expect(workers.map((w) => pickSnapshotRate(w.existing, w.current))).toEqual([50, 30, null])
  })

  it('handles DB numeric strings for both inputs', () => {
    expect(pickSnapshotRate('45', '99')).toBe(45)
    expect(pickSnapshotRate(null, '52.50')).toBe(52.5)
  })
})
