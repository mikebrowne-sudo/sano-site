import { projectRecurringMonth, summariseBookedJobs } from '@/app/portal/_lib/dashboard-finance'

const months = [{ y: 2026, m: 9 }, { y: 2026, m: 10 }, { y: 2026, m: 11 }]
const job = (scheduledDate: string, p: Partial<{ status: string; jobPrice: number | null; recurringJobId: string | null }> = {}) =>
  ({ scheduledDate, status: 'assigned', jobPrice: null, recurringJobId: null, ...p })

describe('jobs booked per month', () => {
  it('counts and values jobs by their scheduled month', () => {
    const r = summariseBookedJobs([job('2026-09-03', { jobPrice: 300, status: 'invoiced' }), job('2026-09-20', { jobPrice: 200 })], [], months, '2026-10')
    expect(r[0]).toMatchObject({ month: '2026-09', jobs: 2, done: 1, value: 500, doneValue: 300, future: false, current: false })
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

describe('jobs booked — invoiced amount beats a mistyped job price', () => {
  it('values an invoiced one-off job at what was billed (JOB-0427: $10,150 typed, $1,150 billed)', () => {
    const r = summariseBookedJobs(
      [{ ...job('2026-09-28', { jobPrice: 10150, status: 'invoiced' }), invoicedValue: 1150 }],
      [], months, '2026-10',
    )
    expect(r[0]).toMatchObject({ value: 1150, doneValue: 1150 })
  })

  it('ignores the invoice for a recurring visit (a monthly invoice covers many visits)', () => {
    const r = summariseBookedJobs(
      [{ ...job('2026-10-01', { recurringJobId: 'ot', status: 'invoiced' }), invoicedValue: 1260 }],
      [{ id: 'ot', billingMode: 'completed_visits', monthlyValue: null, perVisitRate: 315 }],
      months, '2026-10',
    )
    expect(r[1].value).toBe(315)
  })
})

describe('income projection — recurring contracts', () => {
  const nov = { start: '2026-11-01', end: '2026-11-30' }
  it('projects a completed-visits contract at rate × visits scheduled that month', () => {
    expect(projectRecurringMonth({ billingMode: 'completed_visits', monthlyValue: null, perVisitRate: 315, serviceDaysOfWeek: null }, nov, 4)).toBe(1260)
  })
  it('falls back to service days when no visits are scheduled yet', () => {
    // Tuesdays in Nov 2026: 3, 10, 17, 24.
    expect(projectRecurringMonth({ billingMode: 'completed_visits', monthlyValue: null, perVisitRate: 180, serviceDaysOfWeek: [2] }, nov, 0)).toBe(720)
  })
  it('keeps fixed contracts at their monthly value', () => {
    expect(projectRecurringMonth({ billingMode: 'fixed', monthlyValue: 2740, perVisitRate: null, serviceDaysOfWeek: null }, nov, 3)).toBe(2740)
  })
})
