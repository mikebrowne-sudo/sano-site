/**
 * Splitting a job's allowed hours across its workers.
 *
 * `jobs.allowed_hours` is TOTAL labour, not per-worker hours. An 8h job with
 * two cleaners is 4h each. The original bug wrote the full 8h to every worker,
 * so a 2-worker job booked 16h of pay against an 8h job.
 *
 * The invariant that matters for money: the shares must sum to exactly the
 * job's allowed hours, never more.
 */

import {
  splitAllowedHours,
  shareForWorker,
  resolveWorkerHours,
  toQuarterHour,
  resplitJobHours,
} from '@/lib/job-hours-split'

const sum = (xs: (number | null)[]) =>
  Math.round(xs.reduce<number>((s, x) => s + (x ?? 0), 0) * 100) / 100

describe('toQuarterHour', () => {
  it.each([
    [1.6, 1.5],
    [1.7, 1.75],
    [1.66, 1.75],
    [2.0, 2.0],
    [2.13, 2.25],
    [0.1, 0.0],
  ])('rounds %s to %s', (input, expected) => {
    expect(toQuarterHour(input)).toBeCloseTo(expected, 5)
  })
})

describe('splitAllowedHours — the money invariant', () => {
  it('splits an even 8h job across 2 workers', () => {
    expect(splitAllowedHours(8, 2)).toEqual([4, 4])
  })

  it('splits 6.5h across 2 workers', () => {
    expect(splitAllowedHours(6.5, 2)).toEqual([3.25, 3.25])
  })

  it('gives a single worker the whole job', () => {
    expect(splitAllowedHours(8, 1)).toEqual([8])
  })

  it('keeps quarter-hour shares and puts the remainder last', () => {
    // 5 ÷ 3 = 1.666… → 1.75 / 1.75 / 1.50. Readable, and sums to exactly 5.
    expect(splitAllowedHours(5, 3)).toEqual([1.75, 1.75, 1.5])
  })

  // This is the regression that caused the overpayment.
  it.each([
    [8, 2], [6.5, 2], [5, 3], [4, 2], [5.5, 2], [2, 2],
    [7, 3], [10, 4], [3.5, 3], [9.25, 2], [12, 5], [1, 2],
  ])('shares of %sh across %s workers sum to exactly the allowed hours', (hours, count) => {
    expect(sum(splitAllowedHours(hours, count))).toBe(hours)
  })

  it('never returns a share greater than the whole job', () => {
    for (const [h, c] of [[8, 2], [5, 3], [1, 4], [0.5, 2]] as const) {
      for (const share of splitAllowedHours(h, c)) {
        expect(share ?? 0).toBeLessThanOrEqual(h)
      }
    }
  })

  it('never returns a negative share', () => {
    // 0.25h across 4 workers can't be quarter-houred; falls back to an even split.
    for (const share of splitAllowedHours(0.25, 4)) {
      expect(share ?? 0).toBeGreaterThanOrEqual(0)
    }
    expect(sum(splitAllowedHours(0.25, 4))).toBe(0.25)
  })

  it('preserves an unset pay basis as null rather than inventing 0', () => {
    expect(splitAllowedHours(null, 2)).toEqual([null, null])
    expect(splitAllowedHours(undefined, 2)).toEqual([null, null])
    expect(splitAllowedHours(0, 2)).toEqual([null, null])
  })

  it('returns [] for a non-positive worker count', () => {
    expect(splitAllowedHours(8, 0)).toEqual([])
    expect(splitAllowedHours(8, -1)).toEqual([])
  })
})

describe('shareForWorker', () => {
  it('returns the share at the given index', () => {
    expect(shareForWorker(5, 3, 0)).toBe(1.75)
    expect(shareForWorker(5, 3, 2)).toBe(1.5)
  })

  it('returns null for an out-of-range index', () => {
    expect(shareForWorker(8, 2, 5)).toBeNull()
  })
})

describe('resolveWorkerHours — the display fallback', () => {
  it('prefers the stored per-worker hours', () => {
    expect(resolveWorkerHours(3, 8, 2)).toBe(3)
  })

  it('respects an explicit 0 rather than falling through', () => {
    expect(resolveWorkerHours(0, 8, 2)).toBe(0)
  })

  // The bug: a null fallback returned the FULL job hours to every worker.
  it('splits the fallback instead of showing the whole job', () => {
    expect(resolveWorkerHours(null, 8, 2)).toBe(4)
    expect(resolveWorkerHours(null, 8, 4)).toBe(2)
  })

  it('gives a solo worker the full allowed hours', () => {
    expect(resolveWorkerHours(null, 8, 1)).toBe(8)
  })

  it('returns null when there are no allowed hours', () => {
    expect(resolveWorkerHours(null, null, 2)).toBeNull()
  })
})

describe('resplitJobHours — roster changes', () => {
  const w = (id: string, hours: number | null, over: Partial<{ pay_status: string; locked: boolean }> = {}) =>
    ({ contractor_id: id, hours_allocated: hours, ...over })

  it('re-splits when a second worker joins an 8h job', () => {
    const r = resplitJobHours(8, [w('a', 8), w('b', null)])
    expect(r.updates).toEqual([
      { contractor_id: 'a', hours_allocated: 4 },
      { contractor_id: 'b', hours_allocated: 4 },
    ])
    expect(r.skipped).toEqual([])
  })

  it('re-splits back to full when a worker leaves', () => {
    const r = resplitJobHours(8, [w('a', 4)])
    expect(r.updates).toEqual([{ contractor_id: 'a', hours_allocated: 8 }])
  })

  it.each(['included_in_pay_run', 'paid'])('never rewrites a %s worker', (status) => {
    const r = resplitJobHours(8, [w('a', 8, { pay_status: status }), w('b', null)])
    expect(r.updates).toEqual([{ contractor_id: 'b', hours_allocated: 0 }])
    expect(r.skipped).toEqual([{ contractor_id: 'a', hours_allocated: 8 }])
    expect(r.lockedHours).toBe(8)
    // Locked worker consumed the whole allowance — caller must warn.
    expect(r.remainingHours).toBe(0)
  })

  it('never rewrites a worker with a payable', () => {
    const r = resplitJobHours(8, [w('a', 4, { locked: true }), w('b', 4), w('c', null)])
    expect(r.skipped).toEqual([{ contractor_id: 'a', hours_allocated: 4 }])
    // 8 - 4 locked = 4 shared across b and c
    expect(r.updates).toEqual([
      { contractor_id: 'b', hours_allocated: 2 },
      { contractor_id: 'c', hours_allocated: 2 },
    ])
    expect(r.remainingHours).toBe(4)
  })

  it('keeps the total at the allowed hours including locked workers', () => {
    const r = resplitJobHours(9, [w('a', 3, { pay_status: 'paid' }), w('b', null), w('c', null)])
    const total = r.lockedHours + r.updates.reduce((s, u) => s + (u.hours_allocated ?? 0), 0)
    expect(total).toBe(9)
  })

  it('handles every worker being locked', () => {
    const r = resplitJobHours(8, [w('a', 4, { pay_status: 'paid' }), w('b', 4, { pay_status: 'paid' })])
    expect(r.updates).toEqual([])
    expect(r.skipped).toHaveLength(2)
    expect(r.lockedHours).toBe(8)
  })

  it('nulls the shares when the job has no allowed hours', () => {
    const r = resplitJobHours(null, [w('a', null), w('b', null)])
    expect(r.updates).toEqual([
      { contractor_id: 'a', hours_allocated: null },
      { contractor_id: 'b', hours_allocated: null },
    ])
  })
})
