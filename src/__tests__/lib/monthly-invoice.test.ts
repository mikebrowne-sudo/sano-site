import {
  monthRange,
  visitDate,
  buildMonthlyLines,
  composeMonthlyDescription,
  formatVisitDates,
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

describe('formatVisitDates', () => {
  it('joins days naturally and groups by month', () => {
    expect(formatVisitDates(['2026-08-12'])).toBe('12 August')
    expect(formatVisitDates(['2026-08-14', '2026-08-12'])).toBe('12 and 14 August')
    expect(formatVisitDates(['2026-08-12', '2026-08-14', '2026-08-19', '2026-08-21', '2026-08-26', '2026-08-28']))
      .toBe('12, 14, 19, 21, 26 and 28 August')
    expect(formatVisitDates(['2026-10-02', '2026-09-30'])).toBe('30 September and 2 October')
  })
})

describe('composeMonthlyDescription', () => {
  it('summarises visits × rate with one line of dates', () => {
    const r = buildMonthlyLines(
      ['2026-08-12', '2026-08-14', '2026-08-19', '2026-08-21', '2026-08-26', '2026-08-28']
        .map((d, i) => job({ id: `j${i}`, scheduled_date: d })),
      315,
    )
    if ('error' in r) throw new Error(r.error)
    expect(composeMonthlyDescription('August 2026', r.lines)).toBe(
      'August 2026: 6 visits × $315.00 + GST\nVisit dates: 12, 14, 19, 21, 26 and 28 August',
    )
  })

  it('states the total, not a per-visit rate, when prices differ', () => {
    const r = buildMonthlyLines([
      job({ id: 'a', scheduled_date: '2026-08-12' }),
      job({ id: 'b', scheduled_date: '2026-08-14', job_price: 400 }),
    ], 315)
    if ('error' in r) throw new Error(r.error)
    expect(composeMonthlyDescription('August 2026', r.lines)).toBe(
      'August 2026: 2 visits (total $715.00 + GST)\nVisit dates: 12 and 14 August',
    )
  })

  it('singular visit', () => {
    const r = buildMonthlyLines([job({ id: 'a', scheduled_date: '2026-10-02' })], 315)
    if ('error' in r) throw new Error(r.error)
    expect(composeMonthlyDescription('October 2026', r.lines)).toBe(
      'October 2026: 1 visit × $315.00 + GST\nVisit dates: 2 October',
    )
  })
})
