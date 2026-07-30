import { readFileSync } from 'fs'
import { join } from 'path'
import { computeJobMargin, workerRowToInput } from '@/lib/job-margin'
import type { WorkerInput } from '@/lib/labour-calc'

const worker = (o: Partial<WorkerInput> = {}): WorkerInput => ({
  contractor_id: 'c1', full_name: 'Ann', hourly_rate: 30, pay_rate: 30,
  hours_allocated: 4, actual_hours: null, extra_hours: 0, extra_hours_status: 'none',
  worker_type: 'contractor', holiday_pay_method: null, holiday_pay_percent: null,
  kiwisaver_enrolled: false, kiwisaver_employer_rate: null, ...o,
})

describe('computeJobMargin — labour-based gross margin', () => {
  it('price − labour − ACC, with margin %', () => {
    // $400 job, one contractor 4h × $30 = $120 labour (+ACC). Profit ~ $400−$120−ACC.
    const m = computeJobMargin(400, 4, [worker()])
    expect(m.jobPrice).toBe(400)
    expect(m.labourCost).toBeGreaterThan(0)
    expect(m.grossProfit).toBeLessThan(400)
    expect(m.grossProfit).toBeGreaterThan(250)   // sane range after labour+ACC
    expect(m.marginPercent).toBe(Math.round((m.grossProfit / 400) * 100))
  })

  it('a job with no workers is 100% margin (full price, no cost)', () => {
    const m = computeJobMargin(500, null, [])
    expect(m.labourCost).toBe(0)
    expect(m.grossProfit).toBe(500)
    expect(m.marginPercent).toBe(100)
  })

  it('a loss-making job reports negative profit + margin', () => {
    // $100 job, 5h × $30 = $150 labour → negative.
    const m = computeJobMargin(100, 5, [worker({ hours_allocated: 5 })])
    expect(m.grossProfit).toBeLessThan(0)
    expect(m.marginPercent).toBeLessThan(0)
  })

  it('a $0 / null price never divides by zero (0% margin)', () => {
    expect(computeJobMargin(0, 4, [worker()]).marginPercent).toBe(0)
    expect(computeJobMargin(null, 4, [worker()]).jobPrice).toBe(0)
  })

  it('uses the ADJUSTED basis when approved extra hours exist', () => {
    const base = computeJobMargin(400, 4, [worker({ extra_hours: 0, extra_hours_status: 'none' })])
    const withExtra = computeJobMargin(400, 4, [worker({ extra_hours: 2, extra_hours_status: 'approved' })])
    expect(withExtra.hasAdjustment).toBe(true)
    // Extra approved hours cost more → lower profit than the no-extra baseline.
    expect(withExtra.grossProfit).toBeLessThan(base.grossProfit)
  })

  it('ignores UNAPPROVED extra hours (not a cost basis)', () => {
    const m = computeJobMargin(400, 4, [worker({ extra_hours: 5, extra_hours_status: 'pending' })])
    expect(m.hasAdjustment).toBe(false)
    // same as the plain 4h baseline
    expect(m.grossProfit).toBe(computeJobMargin(400, 4, [worker()]).grossProfit)
  })
})

describe('workerRowToInput — maps a job_workers row + joined contractor', () => {
  it('prefers the snapshotted pay_rate; pulls holiday/kiwisaver from the contractor', () => {
    const w = workerRowToInput({
      contractor_id: 'x', pay_rate: 35, hours_allocated: 3, actual_hours: null,
      extra_hours: 1, extra_hours_status: 'approved',
      contractors: { full_name: 'Bo', hourly_rate: 30, worker_type: 'employee', holiday_pay_method: 'pay_as_you_go', holiday_pay_percent: 8, kiwisaver_enrolled: true, kiwisaver_employer_rate: 3 },
    })
    expect(w.pay_rate).toBe(35)
    expect(w.hourly_rate).toBe(30)
    expect(w.worker_type).toBe('employee')
    expect(w.kiwisaver_enrolled).toBe(true)
    expect(w.extra_hours_status).toBe('approved')
  })
})

describe('surfaces are gated + read-only (source-level)', () => {
  const listPage = readFileSync(join(process.cwd(), 'src/app/portal/jobs/page.tsx'), 'utf8')
  const reportPage = readFileSync(join(process.cwd(), 'src/app/portal/finance/job-margins/page.tsx'), 'utf8')
  const reportLib = readFileSync(join(process.cwd(), 'src/app/portal/finance/_lib/job-margins.ts'), 'utf8')
  const csvRoute = readFileSync(join(process.cwd(), 'src/app/api/finance/job-margins-csv/route.ts'), 'utf8')

  it('the jobs-list Margin column + value are admin-gated', () => {
    // Column hidden for non-admins, and margin only computed for admins.
    expect(listPage).toMatch(/f\.key !== 'margin' \|\| isAdminForCols/)
    expect(listPage).toMatch(/if \(isAdminUser\(user\)\)[\s\S]{0,120}loadJobMargins/)
  })
  it('the margin query is bounded to the PAGINATED rows (not the whole table)', () => {
    expect(listPage).toMatch(/loadJobMargins\(\s*supabase,\s*rows\.map/)
  })
  it('the finance report + CSV are finance-gated', () => {
    expect(reportPage).toMatch(/isFinanceUser/)
    expect(csvRoute).toMatch(/isFinanceEmail/)
  })
  it('the report builder does NO writes', () => {
    for (const w of ['.insert(', '.update(', '.delete(', '.upsert(', '.rpc(']) {
      expect(reportLib).not.toContain(w)
    }
  })
})
