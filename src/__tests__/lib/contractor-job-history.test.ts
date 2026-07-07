import { groupJobHistoryByMonth, type HistoryEntry } from '@/app/contractor/_lib/contractor-job-history'

function entry(over: Partial<HistoryEntry> & { jobId: string }): HistoryEntry {
  return {
    jobNumber: 'JOB-' + over.jobId,
    title: 'Clean',
    address: '1 Test St',
    date: '2026-06-10',
    payStatus: 'paid',
    amount: 100,
    docHref: null,
    ...over,
  }
}

describe('groupJobHistoryByMonth', () => {
  it('groups entries by calendar month with a readable label + total', () => {
    const out = groupJobHistoryByMonth([
      entry({ jobId: '1', date: '2026-06-10', amount: 100 }),
      entry({ jobId: '2', date: '2026-06-28', amount: 50 }),
      entry({ jobId: '3', date: '2026-05-02', amount: 75 }),
    ])
    expect(out).toHaveLength(2)
    expect(out[0].label).toBe('June 2026')
    expect(out[0].total).toBe(150)
    expect(out[0].entries).toHaveLength(2)
    expect(out[1].label).toBe('May 2026')
    expect(out[1].total).toBe(75)
  })

  it('sorts months newest-first and jobs within a month newest-first', () => {
    const out = groupJobHistoryByMonth([
      entry({ jobId: 'old', date: '2026-04-01' }),
      entry({ jobId: 'new', date: '2026-07-01' }),
      entry({ jobId: 'mid-early', date: '2026-06-03' }),
      entry({ jobId: 'mid-late', date: '2026-06-20' }),
    ])
    expect(out.map((m) => m.key)).toEqual(['2026-07', '2026-06', '2026-04'])
    const june = out.find((m) => m.key === '2026-06')!
    expect(june.entries.map((e) => e.jobId)).toEqual(['mid-late', 'mid-early'])
  })

  it('does not shift months across timezones (groups by the literal YYYY-MM)', () => {
    // A UTC-midnight date that would roll back a day in NZ still groups in July.
    const out = groupJobHistoryByMonth([entry({ jobId: '1', date: '2026-07-01' })])
    expect(out[0].label).toBe('July 2026')
  })

  it('buckets undated entries into an Undated group sorted last', () => {
    const out = groupJobHistoryByMonth([
      entry({ jobId: 'dated', date: '2026-06-10' }),
      entry({ jobId: 'undated', date: null }),
    ])
    expect(out[0].key).toBe('2026-06')
    expect(out[out.length - 1].key).toBe('undated')
    expect(out[out.length - 1].label).toBe('Undated')
  })

  it('ignores null amounts in the month total', () => {
    const out = groupJobHistoryByMonth([
      entry({ jobId: '1', date: '2026-06-10', amount: 100 }),
      entry({ jobId: '2', date: '2026-06-11', amount: null }),
    ])
    expect(out[0].total).toBe(100)
  })
})
