// Cross-surface consistency guard (allowed-hours model, 2026-06).
//
// The finance dashboard (/portal/finance, via getJobLabourCost in
// job-cost.ts) and the job detail page Labour & Margin section (via
// calculateActualLabour in labour-calc.ts) must compute the SAME
// contractor labour cost. The canonical basis is now:
//
//   labour_cost = rate × (hours_allocated + approved extra_hours)
//
//   where rate prefers job_workers.pay_rate and falls back to the
//   contractor's hourly_rate for historical rows. Timestamp-actual
//   hours are no longer the basis.

import { calculateActualLabour, type WorkerInput } from '@/lib/labour-calc'
import { getJobLabourCost, type JobWorkerCostInput } from '@/lib/job-cost'

function fixture(
  workers: Array<{
    pay_rate: number | null
    contractor_hourly_rate?: number | null
    hours_allocated: number | null
    extra_hours?: number | null
    extra_hours_status?: string | null
  }>,
) {
  const jobCostInput: JobWorkerCostInput[] = workers.map((w) => ({
    pay_rate: w.pay_rate,
    contractor_hourly_rate: w.contractor_hourly_rate ?? null,
    approved_hours: null,
    actual_hours: null,
    hours_allocated: w.hours_allocated,
    extra_hours: w.extra_hours ?? 0,
    extra_hours_status: w.extra_hours_status ?? 'none',
  }))
  const labourCalcInput: WorkerInput[] = workers.map((w, i) => ({
    contractor_id: `c-${i}`,
    full_name: `Worker ${i}`,
    hourly_rate: w.contractor_hourly_rate ?? null, // fallback, same role as contractor_hourly_rate
    pay_rate: w.pay_rate,
    hours_allocated: w.hours_allocated,
    actual_hours: null,
    extra_hours: w.extra_hours ?? 0,
    extra_hours_status: w.extra_hours_status ?? 'none',
    worker_type: 'contractor', // pure contractor — no employer-side overhead
    holiday_pay_method: null,
    holiday_pay_percent: null,
    kiwisaver_enrolled: false,
    kiwisaver_employer_rate: null,
  }))
  return { jobCostInput, labourCalcInput }
}

describe('finance dashboard vs job page — same contractor cost (allowed-hours model)', () => {
  it('matches for a single contractor on allowed hours', () => {
    const { jobCostInput, labourCalcInput } = fixture([{ pay_rate: 50, hours_allocated: 4 }])
    const dashboard = getJobLabourCost(jobCostInput)
    const jobPage = calculateActualLabour(500, labourCalcInput).totalLabourCost
    expect(dashboard).toBe(200)
    expect(dashboard).toBe(jobPage)
  })

  it('adds approved extra hours on both surfaces', () => {
    const { jobCostInput, labourCalcInput } = fixture([
      { pay_rate: 50, hours_allocated: 4, extra_hours: 2, extra_hours_status: 'approved' }, // (4+2)×50 = 300
    ])
    const dashboard = getJobLabourCost(jobCostInput)
    const jobPage = calculateActualLabour(500, labourCalcInput).totalLabourCost
    expect(dashboard).toBe(300)
    expect(dashboard).toBe(jobPage)
  })

  it('ignores unapproved (pending) extra hours on both surfaces', () => {
    const { jobCostInput, labourCalcInput } = fixture([
      { pay_rate: 50, hours_allocated: 4, extra_hours: 2, extra_hours_status: 'pending' },
    ])
    const dashboard = getJobLabourCost(jobCostInput)
    const jobPage = calculateActualLabour(500, labourCalcInput).totalLabourCost
    expect(dashboard).toBe(200)
    expect(dashboard).toBe(jobPage)
  })

  it('matches for multiple workers with mixed extra-hours approval', () => {
    const { jobCostInput, labourCalcInput } = fixture([
      { pay_rate: 50, hours_allocated: 4, extra_hours: 1, extra_hours_status: 'approved' }, // (4+1)×50 = 250
      { pay_rate: 40, hours_allocated: 3 }, // 120
      { pay_rate: 45, hours_allocated: 2, extra_hours: 2, extra_hours_status: 'pending' }, // 2×45 = 90 (pending ignored)
    ])
    const dashboard = getJobLabourCost(jobCostInput)
    const jobPage = calculateActualLabour(1000, labourCalcInput).totalLabourCost
    expect(dashboard).toBe(460) // 250 + 120 + 90
    expect(dashboard).toBe(jobPage)
  })

  it('matches at zero when no rate is available anywhere', () => {
    const { jobCostInput, labourCalcInput } = fixture([
      { pay_rate: null, contractor_hourly_rate: null, hours_allocated: 4 },
    ])
    const dashboard = getJobLabourCost(jobCostInput)
    const jobPage = calculateActualLabour(500, labourCalcInput).totalLabourCost
    expect(dashboard).toBe(0)
    expect(dashboard).toBe(jobPage)
  })

  it('matches at zero when no allocated hours are set', () => {
    const { jobCostInput, labourCalcInput } = fixture([{ pay_rate: 50, hours_allocated: null }])
    const dashboard = getJobLabourCost(jobCostInput)
    const jobPage = calculateActualLabour(500, labourCalcInput).totalLabourCost
    expect(dashboard).toBe(0)
    expect(dashboard).toBe(jobPage)
  })

  it('falls back to the contractor hourly_rate for historical rows (pay_rate null)', () => {
    const { jobCostInput, labourCalcInput } = fixture([
      { pay_rate: null, contractor_hourly_rate: 45, hours_allocated: 4 },
    ])
    const dashboard = getJobLabourCost(jobCostInput)
    const jobPage = calculateActualLabour(500, labourCalcInput).totalLabourCost
    expect(dashboard).toBe(180)
    expect(dashboard).toBe(jobPage)
  })
})
