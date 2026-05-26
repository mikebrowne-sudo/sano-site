// Phase G.1 — cross-surface consistency guard.
//
// The finance dashboard (/portal/finance) and the job detail page
// Labour & Margin section must compute contractor labour cost from
// the same canonical helper. This test pins that contract.
//
// The job detail page uses calculateLabour / calculateActualLabour
// from labour-calc.ts (which now prefers pay_rate over hourly_rate).
// The finance dashboard uses getJobLabourCost from job-cost.ts.
//
// Both should produce the same per-job total when fed the same
// job_workers rows — modulo employer-side overhead that the
// dashboard doesn't (and shouldn't) include in the operational
// contractor-cost figure. For pure contractor workers (the dashboard's
// target), the figures must match to the cent.

import { calculateActualLabour, type WorkerInput } from '@/lib/labour-calc'
import { getJobLabourCost, type JobWorkerCostInput } from '@/lib/job-cost'

/**
 * Build matched inputs for both surfaces from a single source-of-truth
 * fixture. Real `job_workers` rows carry both shapes' fields, so
 * deriving each helper's input from the same fixture mirrors what the
 * portal does in production.
 */
function fixture(
  workers: Array<{ pay_rate: number | null; approved_hours: number | null; actual_hours: number | null; hours_allocated?: number | null }>,
) {
  const jobCostInput: JobWorkerCostInput[] = workers.map((w) => ({
    pay_rate: w.pay_rate,
    approved_hours: w.approved_hours,
    actual_hours: w.actual_hours,
    hours_allocated: w.hours_allocated ?? null,
  }))
  // labour-calc uses actual hours via calculateActualLabour. To make
  // its output comparable we feed it the same payable hours the
  // dashboard derives (approved → actual) by setting actual_hours
  // accordingly. This mirrors the dashboard rule.
  const labourCalcInput: WorkerInput[] = workers.map((w, i) => ({
    contractor_id: `c-${i}`,
    full_name: `Worker ${i}`,
    hourly_rate: null,
    pay_rate: w.pay_rate,
    hours_allocated: w.hours_allocated ?? null,
    actual_hours: w.approved_hours ?? w.actual_hours ?? null,
    worker_type: 'contractor', // pure contractor — no employer-side overhead
    holiday_pay_method: null,
    holiday_pay_percent: null,
    kiwisaver_enrolled: false,
    kiwisaver_employer_rate: null,
  }))
  return { jobCostInput, labourCalcInput }
}

describe('finance dashboard vs job page — same contractor cost', () => {
  it('matches for a single contractor with approved hours', () => {
    const { jobCostInput, labourCalcInput } = fixture([
      { pay_rate: 50, approved_hours: 4, actual_hours: 4.5 },
    ])
    const dashboard = getJobLabourCost(jobCostInput)
    const jobPage = calculateActualLabour(500, labourCalcInput).totalLabourCost
    expect(dashboard).toBe(200)
    expect(dashboard).toBe(jobPage)
  })

  it('matches for multiple workers with mixed approval state', () => {
    const { jobCostInput, labourCalcInput } = fixture([
      { pay_rate: 50, approved_hours: 4, actual_hours: 4.5 }, // 200 (approved wins)
      { pay_rate: 40, approved_hours: null, actual_hours: 3 }, // 120 (actual fallback)
      { pay_rate: 45, approved_hours: 2, actual_hours: 2 }, // 90
    ])
    const dashboard = getJobLabourCost(jobCostInput)
    const jobPage = calculateActualLabour(1000, labourCalcInput).totalLabourCost
    expect(dashboard).toBe(410)
    expect(dashboard).toBe(jobPage)
  })

  it('matches at zero when no pay rates are snapshotted', () => {
    const { jobCostInput, labourCalcInput } = fixture([
      { pay_rate: null, approved_hours: 4, actual_hours: 4 },
    ])
    const dashboard = getJobLabourCost(jobCostInput)
    const jobPage = calculateActualLabour(500, labourCalcInput).totalLabourCost
    expect(dashboard).toBe(0)
    expect(dashboard).toBe(jobPage)
  })

  it('matches at zero when no hours have been captured', () => {
    const { jobCostInput, labourCalcInput } = fixture([
      { pay_rate: 50, approved_hours: null, actual_hours: null, hours_allocated: 4 },
    ])
    const dashboard = getJobLabourCost(jobCostInput)
    const jobPage = calculateActualLabour(500, labourCalcInput).totalLabourCost
    expect(dashboard).toBe(0)
    expect(dashboard).toBe(jobPage)
  })
})
