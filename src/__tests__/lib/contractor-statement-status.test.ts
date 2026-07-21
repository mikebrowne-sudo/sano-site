import { statementDisplayStatus } from '@/lib/contractor-statement-status'

const NOW = '2026-07-22T00:00:00Z'
const base = { viewed_at: null, review_due_at: null, confirmed_source: null }

describe('statementDisplayStatus', () => {
  it('draft / superseded / paid pass through', () => {
    expect(statementDisplayStatus({ ...base, status: 'draft' }, NOW)).toBe('draft')
    expect(statementDisplayStatus({ ...base, status: 'superseded' }, NOW)).toBe('superseded')
    expect(statementDisplayStatus({ ...base, status: 'paid' }, NOW)).toBe('paid')
  })

  it('confirmed splits by source', () => {
    expect(statementDisplayStatus({ ...base, status: 'confirmed', confirmed_source: 'contractor' }, NOW)).toBe('confirmed_contractor')
    expect(statementDisplayStatus({ ...base, status: 'confirmed', confirmed_source: 'sano' }, NOW)).toBe('confirmed_sano')
  })

  it('issued: not viewed → viewed → overdue', () => {
    expect(statementDisplayStatus({ ...base, status: 'issued', review_due_at: '2026-07-27T00:00:00Z' }, NOW)).toBe('not_viewed')
    expect(statementDisplayStatus({ ...base, status: 'issued', viewed_at: '2026-07-22T01:00:00Z', review_due_at: '2026-07-27T00:00:00Z' }, NOW)).toBe('viewed')
    // past the deadline, still issued → overdue (regardless of viewed)
    expect(statementDisplayStatus({ ...base, status: 'issued', viewed_at: '2026-07-20T00:00:00Z', review_due_at: '2026-07-21T00:00:00Z' }, NOW)).toBe('overdue')
  })
})
