// Phase G.2 step 4 — tests for the pay-run variance helper.
//
// Covers the allowed-hours fallback chain
// (per-worker `hours_allocated` → split of `jobs.allowed_hours`),
// approved-hours vs allowed-hours arithmetic, dollar variance via
// the snapshotted pay rate, and the no-fabricated-number rule.

import {
  computePayRunVariance,
  resolveAllowedHours,
} from '@/lib/pay-run-variance'

describe('resolveAllowedHours', () => {
  it('returns hours_allocated when present', () => {
    expect(
      resolveAllowedHours({ hoursAllocated: 4, jobAllowedHours: 8, workerCount: 2 }),
    ).toBe(4)
  })

  it('falls back to the job split when hoursAllocated is null', () => {
    expect(
      resolveAllowedHours({ hoursAllocated: null, jobAllowedHours: 8, workerCount: 2 }),
    ).toBe(4)
  })

  it('returns null when neither hoursAllocated nor jobAllowedHours is set', () => {
    expect(
      resolveAllowedHours({ hoursAllocated: null, jobAllowedHours: null, workerCount: 2 }),
    ).toBeNull()
  })

  it('returns null when workerCount is zero (no split possible)', () => {
    expect(
      resolveAllowedHours({ hoursAllocated: null, jobAllowedHours: 8, workerCount: 0 }),
    ).toBeNull()
  })

  it('treats hoursAllocated=0 as a real (non-missing) value', () => {
    // 0 hours is a valid allocation (e.g. unpaid shadow worker).
    expect(
      resolveAllowedHours({ hoursAllocated: 0, jobAllowedHours: 8, workerCount: 2 }),
    ).toBe(0)
  })
})

describe('computePayRunVariance', () => {
  it('computes positive variance when approved exceeds allowed', () => {
    const v = computePayRunVariance({
      approvedHours: 4.5,
      payRate: 45,
      hoursAllocated: 4,
      jobAllowedHours: null,
      workerCount: 1,
    })
    expect(v.allowedHours).toBe(4)
    expect(v.approvedHours).toBe(4.5)
    expect(v.varianceHours).toBe(0.5)
    expect(v.varianceDollars).toBe(22.5)
  })

  it('computes negative variance when approved is under allowed', () => {
    const v = computePayRunVariance({
      approvedHours: 3,
      payRate: 45,
      hoursAllocated: 4,
      jobAllowedHours: null,
      workerCount: 1,
    })
    expect(v.varianceHours).toBe(-1)
    expect(v.varianceDollars).toBe(-45)
  })

  it('returns zero variance when approved equals allowed', () => {
    const v = computePayRunVariance({
      approvedHours: 4,
      payRate: 45,
      hoursAllocated: 4,
      jobAllowedHours: null,
      workerCount: 1,
    })
    expect(v.varianceHours).toBe(0)
    expect(v.varianceDollars).toBe(0)
  })

  it('uses the job-split fallback when hoursAllocated is missing', () => {
    // 8h allowed across 2 workers → 4h per worker.
    const v = computePayRunVariance({
      approvedHours: 5,
      payRate: 50,
      hoursAllocated: null,
      jobAllowedHours: 8,
      workerCount: 2,
    })
    expect(v.allowedHours).toBe(4)
    expect(v.varianceHours).toBe(1)
    expect(v.varianceDollars).toBe(50)
  })

  it('returns null variance when allowed cannot be resolved', () => {
    const v = computePayRunVariance({
      approvedHours: 5,
      payRate: 50,
      hoursAllocated: null,
      jobAllowedHours: null,
      workerCount: 1,
    })
    expect(v.allowedHours).toBeNull()
    expect(v.varianceHours).toBeNull()
    expect(v.varianceDollars).toBeNull()
  })

  it('returns null variance when approvedHours is missing', () => {
    const v = computePayRunVariance({
      approvedHours: null,
      payRate: 50,
      hoursAllocated: 4,
      jobAllowedHours: null,
      workerCount: 1,
    })
    expect(v.allowedHours).toBe(4)
    expect(v.approvedHours).toBeNull()
    expect(v.varianceHours).toBeNull()
    expect(v.varianceDollars).toBeNull()
  })

  it('returns dollar variance of zero (not null) when payRate is missing but hours variance exists', () => {
    // We can still surface the hours move; we just can't cost it.
    // Returning 0 rather than null keeps the hours signal visible
    // without fabricating a cost.
    const v = computePayRunVariance({
      approvedHours: 5,
      payRate: null,
      hoursAllocated: 4,
      jobAllowedHours: null,
      workerCount: 1,
    })
    expect(v.varianceHours).toBe(1)
    expect(v.varianceDollars).toBe(0)
  })
})
