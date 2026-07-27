import { ks10DaysOutstanding, ks10Urgency, loadPendingKs10Submissions } from '@/lib/kiwisaver-ks10-reminders'

describe('ks10DaysOutstanding', () => {
  it('counts whole days since the KS10 was received', () => {
    expect(ks10DaysOutstanding('2026-08-10', '2026-08-10')).toBe(0)
    expect(ks10DaysOutstanding('2026-08-10', '2026-08-13')).toBe(3)
  })
  it('is null with no received date, and never negative', () => {
    expect(ks10DaysOutstanding(null, '2026-08-10')).toBeNull()
    expect(ks10DaysOutstanding('2026-08-20', '2026-08-10')).toBe(0)
  })
})

describe('ks10Urgency', () => {
  it('is "due" while fresh and "overdue" once it has sat', () => {
    expect(ks10Urgency(0)).toBe('due')
    expect(ks10Urgency(5)).toBe('due')
    expect(ks10Urgency(6)).toBe('overdue')
    expect(ks10Urgency(null)).toBe('due')
  })
})

describe('loadPendingKs10Submissions', () => {
  it('queries received-but-not-submitted employee KS10s and sorts oldest first', async () => {
    const filters: Array<[string, unknown, unknown]> = []
    const client = {
      from() {
        const chain: Record<string, unknown> = {}
        chain.select = () => chain
        chain.eq = (c: string, v: unknown) => { filters.push(['eq', c, v]); return chain }
        chain.not = (c: string, op: unknown, v: unknown) => { filters.push(['not', c, v]); return chain }
        chain.is = (c: string, v: unknown) => { filters.push(['is', c, v]); return Promise.resolve({
          data: [
            { id: 'a', full_name: 'Newer', kiwisaver_ks10_received_date: '2026-08-12', kiwisaver_ks10_signed_date: '2026-08-10' },
            { id: 'b', full_name: 'Older', kiwisaver_ks10_received_date: '2026-08-01', kiwisaver_ks10_signed_date: '2026-07-30' },
          ],
          error: null,
        }) }
        return chain
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await loadPendingKs10Submissions(client as any, '2026-08-15')
    // Only employees, received not null, submitted-to-ird is null.
    expect(filters).toContainEqual(['eq', 'worker_type', 'employee'])
    expect(filters).toContainEqual(['not', 'kiwisaver_ks10_received_date', null])
    expect(filters).toContainEqual(['is', 'kiwisaver_optout_submitted_to_ird_date', null])
    // Oldest (most days outstanding) first.
    expect(res.map((r) => r.id)).toEqual(['b', 'a'])
    expect(res[0].daysOutstanding).toBe(14)
  })
})
