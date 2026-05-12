import { getJobStatus } from '../job-status'

// Fix `now` so the future/past comparisons in Phase 4D's follow_up
// derivation are deterministic across CI clocks.
const NOW = '2026-05-01T00:00:00Z'
const FUTURE = '2026-06-01'
const PAST   = '2026-04-01'

describe('getJobStatus', () => {
  it('returns needs_scheduling when no schedule and no contractor', () => {
    expect(getJobStatus({ scheduled_date: null, contractor_id: null }, NOW)).toBe('needs_scheduling')
  })

  it('returns needs_scheduling when scheduled but no contractor', () => {
    expect(getJobStatus({ scheduled_date: FUTURE, contractor_id: null }, NOW)).toBe('needs_scheduling')
  })

  it('returns needs_scheduling when contractor set but no schedule', () => {
    expect(getJobStatus({ scheduled_date: null, contractor_id: 'c-1' }, NOW)).toBe('needs_scheduling')
  })

  it('returns scheduled when both schedule and contractor are set (future date)', () => {
    expect(getJobStatus({ scheduled_date: FUTURE, contractor_id: 'c-1' }, NOW)).toBe('scheduled')
  })

  it('treats assigned_to text as a valid worker for the scheduled state', () => {
    expect(getJobStatus({
      scheduled_date: FUTURE,
      contractor_id: null,
      assigned_to: 'Kelly',
    }, NOW)).toBe('scheduled')
  })

  // Phase 4D — past scheduled date with no start → follow_up.
  it('returns follow_up when scheduled date is in the past and no started_at', () => {
    expect(getJobStatus({
      scheduled_date: PAST,
      contractor_id: 'c-1',
    }, NOW)).toBe('follow_up')
  })

  it('returns in_progress once started_at is set (even if scheduled in the past)', () => {
    expect(getJobStatus({
      scheduled_date: PAST,
      contractor_id: 'c-1',
      started_at: '2026-05-01T08:00:00Z',
    }, NOW)).toBe('in_progress')
  })

  // Phase 4D — completed without an invoice → ready_to_invoice. This
  // replaces what was previously labelled "completed" so the operator
  // sees the next-step nudge rather than a terminal-success label.
  it('returns ready_to_invoice when completed_at is set but no invoice_id', () => {
    expect(getJobStatus({
      scheduled_date: PAST,
      contractor_id: 'c-1',
      started_at: '2026-05-01T08:00:00Z',
      completed_at: '2026-05-01T11:00:00Z',
    }, NOW)).toBe('ready_to_invoice')
  })

  it('returns invoiced once invoice_id is set, even if completed_at is also set', () => {
    expect(getJobStatus({
      scheduled_date: PAST,
      contractor_id: 'c-1',
      completed_at: '2026-05-01T11:00:00Z',
      invoice_id: 'inv-1',
    }, NOW)).toBe('invoiced')
  })

  it('returns invoiced from invoice_id even with no other fields', () => {
    expect(getJobStatus({
      scheduled_date: null,
      contractor_id: null,
      invoice_id: 'inv-1',
    }, NOW)).toBe('invoiced')
  })
})
