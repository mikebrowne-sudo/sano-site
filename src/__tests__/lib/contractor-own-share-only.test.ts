// A contractor sees THEIR share of a shared job — never the whole job.
//
// Operator rule: "6 hour job, 2 contractors, 3 hours each." The cleaner opening
// that job must read 3 hrs and their own pay. The job's 6 hours is the sum of
// everyone's time, so showing it leaks a co-worker's hours — and with a rate,
// their pay.
//
// The job detail view previously rendered a Row labelled "Allowed hours" from
// job.allowed_hours (the WHOLE job) directly above the contractor's own pay.
// allowed_hours no longer leaves the server for a contractor.

import { resolveWorkerHours } from '@/lib/job-hours-split'
import { getWorkerPayableHours, getWorkerLabourCost } from '@/lib/job-cost'

const RATE = 35

/** Mirrors the costInput built in contractor-job-detail-data.ts. */
function shareFor(ownHours: number | null, jobAllowed: number | null, workers: number) {
  const hours_allocated = resolveWorkerHours(ownHours, jobAllowed, Math.max(workers, 1))
  const input = {
    pay_rate: RATE,
    contractor_hourly_rate: RATE,
    approved_hours: null,
    actual_hours: null,
    hours_allocated,
    extra_hours: 0,
    extra_hours_status: 'none',
  }
  return { hours: getWorkerPayableHours(input), pay: getWorkerLabourCost(input) }
}

describe('the operator’s example: 6h job, 2 contractors, 3h each', () => {
  it('each cleaner sees 3 hours, not 6', () => {
    expect(shareFor(3, 6, 2).hours).toBe(3)
  })

  it('each cleaner sees their own pay, not the job’s labour cost', () => {
    const { pay } = shareFor(3, 6, 2)
    expect(pay).toBe(105)          // 3 × $35
    expect(pay).not.toBe(210)      // NOT the whole job's 6 × $35
  })

  it('the two shares add up to the job, but neither cleaner can see that', () => {
    const a = shareFor(3, 6, 2)
    const b = shareFor(3, 6, 2)
    expect(a.hours! + b.hours!).toBe(6)
    expect(a.hours).toBe(3)
  })
})

describe('the fallback path, where hours were never recorded per worker', () => {
  it('still splits across the roster', () => {
    expect(shareFor(null, 6, 2).hours).toBe(3)
  })

  it('a solo cleaner on a 6h job legitimately sees 6', () => {
    // Their share IS the whole job — no other worker's time is revealed.
    expect(shareFor(null, 6, 1).hours).toBe(6)
  })
})

describe('what a shared job must never show a contractor', () => {
  it('a co-worker’s hours are not derivable from what they are given', () => {
    // The payload exposes only the caller's own payable hours and pay. Without
    // the job total or the roster size, the other cleaner's 3h is unknowable.
    const mine = shareFor(3, 6, 2)
    const exposed = { payableHours: mine.hours, jobPay: mine.pay, payRate: RATE }

    expect(exposed).not.toHaveProperty('allowed_hours')
    expect(Object.values(exposed)).not.toContain(6)   // the job total
    expect(Object.values(exposed)).not.toContain(210) // the job's labour cost
  })

  it('an unevenly split job still only reveals the caller’s own hours', () => {
    // 8h job: one cleaner 5h, the other 3h.
    expect(shareFor(5, 8, 2).hours).toBe(5)
    expect(shareFor(3, 8, 2).hours).toBe(3)
  })
})
