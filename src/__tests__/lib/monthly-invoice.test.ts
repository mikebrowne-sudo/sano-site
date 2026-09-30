import {
  monthRange,
  visitDate,
  buildMonthlyLines,
  composeMonthlyDescription,
  type MonthlyJobInput,
} from '@/lib/monthly-invoice'

const job = (p: Partial<MonthlyJobInput> & { id: string }): MonthlyJobInput => ({
  job_number: p.id.toUpperCase(),
  scheduled_date: null,
  completed_at: null,
  allowed_hours: 7,
  job_price: null,
  ...p,
})

describe('monthRange', () => {
  it('returns the first/last day and a label', () => {
    expect(monthRange('2026-08')).toEqual({ start: '2026-08-01', end: '2026-08-31', label: 'August 2026' })
    expect(monthRange('2026-09')?.end).toBe('2026-09-30')
    expect(monthRange('2028-02')?.end).toBe('2028-02-29')
  })
  it('rejects junk', () => {
    expect(monthRange('2026-13')).toBeNull()
    expect(monthRange('Aug')).toBeNull()
  })
})

describe('visitDate', () => {
  it('prefers the scheduled date over a late completion tap', () => {
    expect(visitDate({ scheduled_date: '2026-08-12', completed_at: '2026-08-19T00:54:34Z' })).toBe('2026-08-12')
  })
  it('falls back to the completion date', () => {
    expect(visitDate({ scheduled_date: null, completed_at: '2026-08-19T00:54:34Z' })).toBe('2026-08-19')
  })
})

describe('buildMonthlyLines', () => {
  it('prices unpriced jobs at the per-visit rate and totals exactly', () => {
    const r = buildMonthlyLines([
      job({ id: 'b', scheduled_date: '2026-08-14' }),
      job({ id: 'a', scheduled_date: '2026-08-12' }),
      job({ id: 'c', scheduled_date: '2026-08-26', job_price: '315.00' }),
    ], 315)
    if ('error' in r) throw new Error(r.error)
    expect(r.total).toBe(945)
    expect(r.lines.map((l) => l.jobId)).toEqual(['a', 'b', 'c'])
    expect(r.lines.map((l) => l.priceFromRate)).toEqual([true, true, false])
  })

  it("keeps a job's own price over the rate", () => {
    const r = buildMonthlyLines([job({ id: 'a', scheduled_date: '2026-08-12', job_price: 400 })], 315)
    if ('error' in r) throw new Error(r.error)
    expect(r.total).toBe(400)
  })

  it('refuses to bill a visit with no price', () => {
    const r = buildMonthlyLines([job({ id: 'job-1', scheduled_date: '2026-08-12' })], null)
    expect(r).toEqual({ error: 'No price for JOB-1 — enter a per-visit rate.' })
  })

  it('refuses an empty selection', () => {
    expect(buildMonthlyLines([], 315)).toEqual({ error: 'Select at least one completed visit.' })
  })
})

describe('composeMonthlyDescription', () => {
  it('lists each visit with date, hours and amount', () => {
    const r = buildMonthlyLines([
      job({ id: 'a', scheduled_date: '2026-08-12' }),
      job({ id: 'b', scheduled_date: '2026-08-14', allowed_hours: '7.00' }),
    ], 315)
    if ('error' in r) throw new Error(r.error)
    expect(composeMonthlyDescription('August 2026', r.lines)).toBe(
      'August 2026 — 2 visits\nWed 12 Aug — 7 hrs — $315.00\nFri 14 Aug — 7 hrs — $315.00',
    )
  })
})
