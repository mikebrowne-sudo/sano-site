import { statementBucket } from '@/lib/contractor-statement-bucket'

const NOW = '2026-07-22T00:00:00Z'
const base = { review_due_at: null as string | null, remittance_id: null as string | null }

describe('statementBucket', () => {
  it('draft → ready_to_issue', () => {
    expect(statementBucket({ ...base, status: 'draft' }, NOW)).toBe('ready_to_issue')
  })
  it('issued before deadline → awaiting_review', () => {
    expect(statementBucket({ ...base, status: 'issued', review_due_at: '2026-07-27T00:00:00Z' }, NOW)).toBe('awaiting_review')
  })
  it('issued past deadline → ready_to_pay', () => {
    expect(statementBucket({ ...base, status: 'issued', review_due_at: '2026-07-20T00:00:00Z' }, NOW)).toBe('ready_to_pay')
  })
  it('confirmed early (deadline not passed) → ready_to_pay', () => {
    expect(statementBucket({ ...base, status: 'confirmed', review_due_at: '2026-07-27T00:00:00Z' }, NOW)).toBe('ready_to_pay')
  })
  it('linked to an unpaid remittance → remittance_unpaid', () => {
    expect(statementBucket({ ...base, status: 'confirmed', remittance_id: 'r1' }, NOW)).toBe('remittance_unpaid')
    expect(statementBucket({ ...base, status: 'issued', remittance_id: 'r1', review_due_at: '2026-07-20T00:00:00Z' }, NOW)).toBe('remittance_unpaid')
  })
  it('paid → paid', () => {
    expect(statementBucket({ ...base, status: 'paid', remittance_id: 'r1' }, NOW)).toBe('paid')
  })
  it('superseded → needs_attention', () => {
    expect(statementBucket({ ...base, status: 'superseded' }, NOW)).toBe('needs_attention')
  })
})
