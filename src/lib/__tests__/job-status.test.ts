import { getJobStatus } from '../job-status'

describe('getJobStatus', () => {
  it('returns needs_scheduling when no schedule and no contractor', () => {
    expect(getJobStatus({ scheduled_date: null, contractor_id: null })).toBe('needs_scheduling')
  })

  it('returns needs_scheduling when scheduled but no contractor', () => {
    expect(getJobStatus({ scheduled_date: '2026-05-01', contractor_id: null })).toBe('needs_scheduling')
  })

  it('returns needs_scheduling when contractor set but no schedule', () => {
    expect(getJobStatus({ scheduled_date: null, contractor_id: 'c-1' })).toBe('needs_scheduling')
  })

  it('returns scheduled when both schedule and contractor are set', () => {
    expect(getJobStatus({ scheduled_date: '2026-05-01', contractor_id: 'c-1' })).toBe('scheduled')
  })

  it('treats assigned_to text as a valid worker for the scheduled state', () => {
    expect(getJobStatus({
      scheduled_date: '2026-05-01',
      contractor_id: null,
      assigned_to: 'Kelly',
    })).toBe('scheduled')
  })

  it('returns in_progress once started_at is set', () => {
    expect(getJobStatus({
      scheduled_date: '2026-05-01',
      contractor_id: 'c-1',
      started_at: '2026-05-01T08:00:00Z',
    })).toBe('in_progress')
  })

  it('returns completed once completed_at is set', () => {
    expect(getJobStatus({
      scheduled_date: '2026-05-01',
      contractor_id: 'c-1',
      started_at: '2026-05-01T08:00:00Z',
      completed_at: '2026-05-01T11:00:00Z',
    })).toBe('completed')
  })

  it('returns invoiced once invoice_id is set, even if completed_at is also set', () => {
    expect(getJobStatus({
      scheduled_date: '2026-05-01',
      contractor_id: 'c-1',
      completed_at: '2026-05-01T11:00:00Z',
      invoice_id: 'inv-1',
    })).toBe('invoiced')
  })

  it('returns invoiced from invoice_id even with no other fields', () => {
    expect(getJobStatus({
      scheduled_date: null,
      contractor_id: null,
      invoice_id: 'inv-1',
    })).toBe('invoiced')
  })
})
