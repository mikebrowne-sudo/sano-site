// Unit tests for the canonical contractor labour-cost helpers
// (allowed-hours model, 2026-06).
//
// Single source of truth for "what does this contractor cost on this
// job?" Basis: rate × (hours_allocated + approved extra_hours), where
// rate prefers job_workers.pay_rate over the contractor's hourly_rate.
// No fabricated cost — 0 when there's no rate or no allocated hours.

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
    extra_hours: 0,
    extra_hours_status: 'none',
    ...partial,
  }
}

describe('getWorkerPayableHours (allowed + approved extra)', () => {
  it('returns allocated hours when there is no extra', () => {
    expect(getWorkerPayableHours(jw({ hours_allocated: 4 }))).toBe(4)
  })

  it('adds admin-approved extra hours', () => {
    expect(getWorkerPayableHours(jw({ hours_allocated: 4, extra_hours: 2, extra_hours_status: 'approved' }))).toBe(6)
  })

  it('subtracts an admin-approved negative adjustment (job finished early)', () => {
    expect(getWorkerPayableHours(jw({ hours_allocated: 5, extra_hours: -1, extra_hours_status: 'approved' }))).toBe(4)
  })

  it('ignores unapproved (pending / rejected) extra hours', () => {
    expect(getWorkerPayableHours(jw({ hours_allocated: 4, extra_hours: 2, extra_hours_status: 'pending' }))).toBe(4)
    expect(getWorkerPayableHours(jw({ hours_allocated: 4, extra_hours: 2, extra_hours_status: 'rejected' }))).toBe(4)
  })

  it('returns null when allocated hours are not set', () => {
    expect(getWorkerPayableHours(jw({}))).toBeNull()
  })

  it('treats 0 allocated as a valid value (not missing)', () => {
    expect(getWorkerPayableHours(jw({ hours_allocated: 0 }))).toBe(0)
  })
})

describe('getWorkerEstimatedHours', () => {
  it('returns the allocated baseline', () => {
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
  it('uses pay_rate × allocated hours', () => {
    expect(getWorkerLabourCost(jw({ pay_rate: 50, hours_allocated: 4 }))).toBe(200)
  })

  it('adds approved extra hours to the cost', () => {
    expect(getWorkerLabourCost(jw({ pay_rate: 50, hours_allocated: 4, extra_hours: 1, extra_hours_status: 'approved' }))).toBe(250)
  })

  it('reduces the cost for an approved negative adjustment', () => {
    expect(getWorkerLabourCost(jw({ pay_rate: 50, hours_allocated: 5, extra_hours: -1, extra_hours_status: 'approved' }))).toBe(200)
  })

  it('falls back to contractor_hourly_rate when pay_rate is null (historical row)', () => {
    expect(getWorkerLabourCost(jw({ pay_rate: null, contractor_hourly_rate: 45, hours_allocated: 4 }))).toBe(180)
  })

  it('prefers pay_rate over contractor_hourly_rate when both are set', () => {
    expect(getWorkerLabourCost(jw({ pay_rate: 50, contractor_hourly_rate: 99, hours_allocated: 4 }))).toBe(200)
  })

  it('returns 0 when both pay_rate AND contractor_hourly_rate are null', () => {
    expect(getWorkerLabourCost(jw({ pay_rate: null, contractor_hourly_rate: null, hours_allocated: 4 }))).toBe(0)
  })

  it('returns 0 when allocated hours are null (no fabricated cost)', () => {
    expect(getWorkerLabourCost(jw({ pay_rate: 50, hours_allocated: null }))).toBe(0)
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
      jw({ pay_rate: 50, hours_allocated: 4 }), // 200
      jw({ pay_rate: 40, hours_allocated: 3 }), // 120
      jw({ pay_rate: null, contractor_hourly_rate: null, hours_allocated: 2 }), // 0 (no rate)
    ]
    expect(getJobLabourCost(workers)).toBe(320)
  })

  it('includes approved extra and mixes fallback-rate workers', () => {
    const workers = [
      jw({ pay_rate: 50, hours_allocated: 4, extra_hours: 1, extra_hours_status: 'approved' }), // 250
      jw({ pay_rate: null, contractor_hourly_rate: 45, hours_allocated: 3 }), // 135 (fallback)
      jw({ pay_rate: null, contractor_hourly_rate: null, hours_allocated: 2 }), //   0 (missing)
    ]
    expect(getJobLabourCost(workers)).toBe(385)
  })

  it('returns 0 for empty / null / undefined input', () => {
    expect(getJobLabourCost([])).toBe(0)
    expect(getJobLabourCost(null)).toBe(0)
    expect(getJobLabourCost(undefined)).toBe(0)
  })
})

describe('getWorkerVariance (approved extra hours)', () => {
  it('is zero when there are no approved extra hours', () => {
    expect(getWorkerVariance(jw({ pay_rate: 50, hours_allocated: 4 }))).toEqual({ hoursVariance: 0, costVariance: 0 })
  })

  it('reports approved extra hours and their cost', () => {
    const v = getWorkerVariance(jw({ pay_rate: 50, hours_allocated: 4, extra_hours: 2, extra_hours_status: 'approved' }))
    expect(v).toEqual({ hoursVariance: 2, costVariance: 100 })
  })

  it('ignores unapproved extra hours', () => {
    const v = getWorkerVariance(jw({ pay_rate: 50, hours_allocated: 4, extra_hours: 2, extra_hours_status: 'pending' }))
    expect(v).toEqual({ hoursVariance: 0, costVariance: 0 })
  })

  it('uses contractor_hourly_rate for the cost when pay_rate is null', () => {
    const v = getWorkerVariance(jw({ pay_rate: null, contractor_hourly_rate: 45, hours_allocated: 4, extra_hours: 2, extra_hours_status: 'approved' }))
    expect(v).toEqual({ hoursVariance: 2, costVariance: 90 })
  })
})
