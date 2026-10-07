import { summariseBookedJobs } from '@/app/portal/_lib/dashboard-finance'

const months = [{ y: 2026, m: 9 }, { y: 2026, m: 10 }, { y: 2026, m: 11 }]
const job = (scheduledDate: string, p: Partial<{ status: string; jobPrice: number | null; recurringJobId: string | null }> = {}) =>
  ({ scheduledDate, status: 'assigned', jobPrice: null, recurringJobId: null, ...p })

describe('jobs booked per month', () => {
  it('counts and values jobs by their scheduled month', () => {
    const r = summariseBookedJobs([job('2026-09-03', { jobPrice: 300, status: 'invoiced' }), job('2026-09-20', { jobPrice: 200 })], [], months, '2026-10')
    expect(r[0]).toMatchObject({ month: '2026-09', jobs: 2, done: 1, value: 500, future: false, current: false })
    expect(r[1].current).toBe(true)
    expect(r[2].future).toBe(true)
  })

  it('values unpriced recurring visits from the contract: per-visit and completed-visits rates', () => {
    const r = summariseBookedJobs(
      [job('2026-11-04', { recurringJobId: 'ot' }), job('2026-11-11', { recurringJobId: 'ot' }), job('2026-11-03', { recurringJobId: 'bella' })],
      [{ id: 'ot', billingMode: 'completed_visits', monthlyValue: null, perVisitRate: 315 }, { id: 'bella', billingMode: 'per_visit', monthlyValue: null, perVisitRate: 180 }],
      months, '2026-10',
    )
    expect(r[2]).toMatchObject({ jobs: 3, value: 810, unpriced: 0 })
  })

  it('spreads a fixed monthly contract across that month\'s visits so the month totals the contract', () => {
    const r = summariseBookedJobs(
      [job('2026-10-03', { recurringJobId: 'fx' }), job('2026-10-10', { recurringJobId: 'fx' }), job('2026-10-17', { recurringJobId: 'fx' })],
      [{ id: 'fx', billingMode: 'fixed', monthlyValue: 2740, perVisitRate: null }],
      months, '2026-10',
    )
    expect(r[1].value).toBe(2740)
  })

  it('a job\'s own price wins, and jobs with no price anywhere are counted as unpriced', () => {
    const r = summariseBookedJobs(
      [job('2026-10-01', { recurringJobId: 'ot', jobPrice: 400 }), job('2026-10-02', { recurringJobId: 'noval' }), job('2026-10-03')],
      [{ id: 'ot', billingMode: 'completed_visits', monthlyValue: null, perVisitRate: 315 }, { id: 'noval', billingMode: 'fixed', monthlyValue: null, perVisitRate: null }],
      months, '2026-10',
    )
    expect(r[1]).toMatchObject({ jobs: 3, value: 400, unpriced: 2 })
  })
})
