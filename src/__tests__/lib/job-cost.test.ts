// Unit tests for the canonical contractor labour-cost helpers
// (Phase G.1).
//
// These helpers are the single source of truth for "what does this
// contractor cost on this job?" The tests guard the no-fabricated-cost
// rule, the approved → actual fallback, and the pay_rate / hourly_rate
// precedence.

import {
  getWorkerPayableHours,
  getWorkerEstimatedHours,
  getWorkerRate,
  getWorkerRateSource,
  getWorkerLabourCost,
  getJobLabourCost,
  getWorkerVariance,
  type JobWorkerCostInput,
} from '@/lib/job-cost'

function jw(partial: Partial<JobWorkerCostInput> = {}): JobWorkerCostInput {
  return {
    pay_rate: null,
    contractor_hourly_rate: null,
    approved_hours: null,
    actual_hours: null,
    hours_allocated: null,
    ...partial,
  }
}

describe('getWorkerPayableHours', () => {
  it('returns approved_hours when present', () => {
    expect(getWorkerPayableHours(jw({ approved_hours: 4, actual_hours: 5 }))).toBe(4)
  })

  it('falls back to actual_hours when approved is null', () => {
    expect(getWorkerPayableHours(jw({ approved_hours: null, actual_hours: 5 }))).toBe(5)
  })

  it('does NOT fall back to hours_allocated', () => {
    expect(getWorkerPayableHours(jw({ approved_hours: null, actual_hours: null, hours_allocated: 4 }))).toBeNull()
  })

  it('returns null when both approved and actual are null', () => {
    expect(getWorkerPayableHours(jw({}))).toBeNull()
  })

  it('treats 0 as a valid value (not a missing value)', () => {
    expect(getWorkerPayableHours(jw({ approved_hours: 0 }))).toBe(0)
    expect(getWorkerPayableHours(jw({ approved_hours: null, actual_hours: 0 }))).toBe(0)
  })
})

describe('getWorkerEstimatedHours', () => {
  it('follows approved → actual → allocated fallback chain', () => {
    expect(getWorkerEstimatedHours(jw({ approved_hours: 3, actual_hours: 5, hours_allocated: 4 }))).toBe(3)
    expect(getWorkerEstimatedHours(jw({ actual_hours: 5, hours_allocated: 4 }))).toBe(5)
    expect(getWorkerEstimatedHours(jw({ hours_allocated: 4 }))).toBe(4)
    expect(getWorkerEstimatedHours(jw({}))).toBeNull()
  })
})

describe('getWorkerRate', () => {
  it('prefers pay_rate when present', () => {
    expect(getWorkerRate({ pay_rate: 50 }, 99)).toBe(50)
  })

  it('falls back to the explicit fallback argument when pay_rate is null', () => {
    expect(getWorkerRate({ pay_rate: null }, 30)).toBe(30)
  })

  it('returns null when both are null', () => {
    expect(getWorkerRate({ pay_rate: null }, null)).toBeNull()
    expect(getWorkerRate({ pay_rate: null })).toBeNull()
  })

  it('never silently uses an undefined fallback as 0', () => {
    expect(getWorkerRate({ pay_rate: null }, undefined)).toBeNull()
  })
})

describe('getWorkerLabourCost', () => {
  it('uses pay_rate × approved_hours when both present', () => {
    expect(getWorkerLabourCost(jw({ pay_rate: 50, approved_hours: 4 }))).toBe(200)
  })

  it('uses pay_rate × actual_hours when approved is missing', () => {
    expect(getWorkerLabourCost(jw({ pay_rate: 50, actual_hours: 4.5 }))).toBe(225)
  })

  it('falls back to contractor_hourly_rate when pay_rate is null', () => {
    // Transitional path for historical rows that pre-date the
    // Phase G.1 assignment-time snapshot.
    expect(getWorkerLabourCost(jw({ pay_rate: null, contractor_hourly_rate: 45, approved_hours: 4 }))).toBe(180)
  })

  it('prefers pay_rate over contractor_hourly_rate when both are set', () => {
    expect(getWorkerLabourCost(jw({ pay_rate: 50, contractor_hourly_rate: 99, approved_hours: 4 }))).toBe(200)
  })

  it('returns 0 only when both pay_rate AND contractor_hourly_rate are null', () => {
    expect(getWorkerLabourCost(jw({ pay_rate: null, contractor_hourly_rate: null, approved_hours: 4 }))).toBe(0)
  })

  it('returns 0 when payable hours are null (no fabricated cost)', () => {
    expect(getWorkerLabourCost(jw({ pay_rate: 50, approved_hours: null, actual_hours: null }))).toBe(0)
  })

  it('does NOT fall back to hours_allocated for the cost calculation', () => {
    expect(getWorkerLabourCost(jw({ pay_rate: 50, hours_allocated: 4 }))).toBe(0)
  })
})

describe('getWorkerRateSource', () => {
  it('returns "snapshot" when pay_rate is set', () => {
    expect(getWorkerRateSource(jw({ pay_rate: 50 }))).toBe('snapshot')
  })

  it('returns "snapshot" even when contractor_hourly_rate is also set', () => {
    expect(getWorkerRateSource(jw({ pay_rate: 50, contractor_hourly_rate: 99 }))).toBe('snapshot')
  })

  it('returns "estimate" when only contractor_hourly_rate is available', () => {
    expect(getWorkerRateSource(jw({ pay_rate: null, contractor_hourly_rate: 45 }))).toBe('estimate')
  })

  it('returns "missing" when neither rate is available', () => {
    expect(getWorkerRateSource(jw({}))).toBe('missing')
  })

  it('treats pay_rate=0 as a valid snapshot (not missing)', () => {
    expect(getWorkerRateSource(jw({ pay_rate: 0, contractor_hourly_rate: 50 }))).toBe('snapshot')
  })
})

describe('getJobLabourCost', () => {
  it('sums per-worker labour cost across an array', () => {
    const workers = [
      jw({ pay_rate: 50, approved_hours: 4 }), // 200
      jw({ pay_rate: 40, actual_hours: 3 }),   // 120
      jw({ pay_rate: null, contractor_hourly_rate: null, approved_hours: 2 }), // 0 (no rate at all)
    ]
    expect(getJobLabourCost(workers)).toBe(320)
  })

  it('mixes snapshotted and fallback-rate workers correctly', () => {
    const workers = [
      jw({ pay_rate: 50, approved_hours: 4 }),                                   // 200 (snapshot)
      jw({ pay_rate: null, contractor_hourly_rate: 45, actual_hours: 3 }),       // 135 (estimate)
      jw({ pay_rate: null, contractor_hourly_rate: null, approved_hours: 2 }),   //   0 (missing)
    ]
    expect(getJobLabourCost(workers)).toBe(335)
  })

  it('returns 0 for empty / null / undefined input', () => {
    expect(getJobLabourCost([])).toBe(0)
    expect(getJobLabourCost(null)).toBe(0)
    expect(getJobLabourCost(undefined)).toBe(0)
  })
})

describe('getWorkerVariance', () => {
  it('returns null when allowedHours is null', () => {
    expect(getWorkerVariance(jw({ pay_rate: 50, actual_hours: 4 }), null)).toBeNull()
  })

  it('returns null when payable hours are not yet known', () => {
    expect(getWorkerVariance(jw({ pay_rate: 50 }), 4)).toBeNull()
  })

  it('computes positive variance when over allowed', () => {
    const v = getWorkerVariance(jw({ pay_rate: 50, actual_hours: 5 }), 4)
    expect(v).toEqual({ hoursVariance: 1, costVariance: 50 })
  })

  it('computes negative variance when under allowed', () => {
    const v = getWorkerVariance(jw({ pay_rate: 50, approved_hours: 3 }), 4)
    expect(v).toEqual({ hoursVariance: -1, costVariance: -50 })
  })

  it('prefers approved over actual for the variance', () => {
    const v = getWorkerVariance(jw({ pay_rate: 50, approved_hours: 4, actual_hours: 6 }), 4)
    expect(v).toEqual({ hoursVariance: 0, costVariance: 0 })
  })

  it('uses pay_rate=0 fallback for cost variance when rate is null', () => {
    const v = getWorkerVariance(jw({ pay_rate: null, actual_hours: 5 }), 4)
    expect(v).toEqual({ hoursVariance: 1, costVariance: 0 })
  })

  it('uses contractor_hourly_rate for cost variance when pay_rate is null', () => {
    const v = getWorkerVariance(jw({ pay_rate: null, contractor_hourly_rate: 45, actual_hours: 5 }), 4)
    expect(v).toEqual({ hoursVariance: 1, costVariance: 45 })
  })
})
