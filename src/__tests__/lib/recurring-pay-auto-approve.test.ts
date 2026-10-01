/** @jest-environment node */

jest.mock('@/lib/approve-contractor-pay-core', () => ({ approveContractorPayCore: jest.fn() }))

import {
  autoApproveBlocker,
  autoApproveRecurringJobPay,
  scheduleHasMonthlyContractorPayable,
} from '@/lib/recurring-pay-auto-approve'
import { approveContractorPayCore } from '@/lib/approve-contractor-pay-core'

const mockCore = approveContractorPayCore as unknown as jest.Mock

const HOURLY = { pay_type: 'hourly', pay_rate: 32.2, hours_allocated: 7, extra_hours: 0, extra_hours_status: 'none' }

describe('scheduleHasMonthlyContractorPayable', () => {
  it('flat monthly contractor pay → yes (Pukekohe)', () => {
    expect(scheduleHasMonthlyContractorPayable({ contractor_pay_mode: 'fixed', contractor_monthly_pay: '1500.00', contractor_per_visit_rate: null })).toBe(true)
  })
  it('per-visit contractor mode → no, paid per completed visit (NZCL)', () => {
    expect(scheduleHasMonthlyContractorPayable({ contractor_pay_mode: 'per_visit', contractor_monthly_pay: null, contractor_per_visit_rate: '126.00' })).toBe(false)
  })
  it('no schedule-level contractor pay → no (Celtic)', () => {
    expect(scheduleHasMonthlyContractorPayable({ contractor_pay_mode: 'fixed', contractor_monthly_pay: null, contractor_per_visit_rate: null })).toBe(false)
  })
})

describe('autoApproveBlocker', () => {
  it('clean hourly row → approvable', () => {
    expect(autoApproveBlocker(HOURLY, null)).toBeNull()
  })
  it('falls back to the profile rate', () => {
    expect(autoApproveBlocker({ ...HOURLY, pay_rate: null }, 35)).toBeNull()
  })
  it('retainer → blocked', () => {
    expect(autoApproveBlocker({ ...HOURLY, pay_type: 'fixed' }, null)).toBe('retainer')
  })
  it('pending extra-hours claim → blocked for a human', () => {
    expect(autoApproveBlocker({ ...HOURLY, extra_hours: 7, extra_hours_status: 'pending' }, null)).toBe('extra hours awaiting review')
  })
  it('no hours → blocked', () => {
    expect(autoApproveBlocker({ ...HOURLY, hours_allocated: null }, null)).toBe('no hours')
  })
  it('no rate anywhere → blocked', () => {
    expect(autoApproveBlocker({ ...HOURLY, pay_rate: null }, null)).toBe('no pay rate')
  })
  it('per-visit amount → approvable without hours', () => {
    expect(autoApproveBlocker({ ...HOURLY, pay_type: 'per_visit', pay_rate: 126, hours_allocated: null }, null)).toBeNull()
  })
})

function chain(value: unknown) {
  const c: Record<string, unknown> = {}
  c.select = () => c
  c.eq = () => c
  c.maybeSingle = jest.fn().mockResolvedValue({ data: value })
  c.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: value }).then(res)
  return c
}

function svc(cfg: { job: unknown; rec?: unknown; workers?: unknown[] }) {
  return {
    from: (t: string) => {
      if (t === 'jobs') return chain(cfg.job)
      if (t === 'recurring_jobs') return chain(cfg.rec ?? null)
      if (t === 'job_workers') return chain(cfg.workers ?? [])
      return chain(null)
    },
  } as never
}

const REC_JOB = { id: 'j1', job_number: 'JOB-0399', status: 'completed', deleted_at: null, recurring_job_id: 'r1' }
const CELTIC = { contractor_pay_mode: 'fixed', contractor_monthly_pay: null, contractor_per_visit_rate: null }

beforeEach(() => mockCore.mockReset())

describe('autoApproveRecurringJobPay', () => {
  it('approves a completed recurring occurrence via the shared core, as the system', async () => {
    mockCore.mockResolvedValue({ ok: true })
    const res = await autoApproveRecurringJobPay(svc({ job: REC_JOB, rec: CELTIC, workers: [{ ...HOURLY, contractor_id: 'c1', contractors: { hourly_rate: 35 } }] }), 'j1')
    expect(res.approved).toBe(1)
    expect(mockCore).toHaveBeenCalledWith(expect.anything(), 'j1', 'c1', {}, { id: null, source: 'recurring_auto_approve' })
  })

  it('ignores one-off (non-recurring) jobs', async () => {
    const res = await autoApproveRecurringJobPay(svc({ job: { ...REC_JOB, recurring_job_id: null } }), 'j1')
    expect(res.approved).toBe(0)
    expect(mockCore).not.toHaveBeenCalled()
  })

  it('ignores jobs that are not completed', async () => {
    await autoApproveRecurringJobPay(svc({ job: { ...REC_JOB, status: 'assigned' }, rec: CELTIC }), 'j1')
    expect(mockCore).not.toHaveBeenCalled()
  })

  it('never approves per visit when the schedule pays monthly (double-pay guard)', async () => {
    const res = await autoApproveRecurringJobPay(svc({
      job: REC_JOB,
      rec: { contractor_pay_mode: 'fixed', contractor_monthly_pay: 1500, contractor_per_visit_rate: null },
      workers: [{ ...HOURLY, contractor_id: 'c1', contractors: null }],
    }), 'j1')
    expect(res.skipped).toContain('schedule pays contractor monthly')
    expect(mockCore).not.toHaveBeenCalled()
  })

  it('leaves a pending extra-hours claim for staff', async () => {
    const res = await autoApproveRecurringJobPay(svc({
      job: REC_JOB, rec: CELTIC,
      workers: [{ ...HOURLY, extra_hours: 2, extra_hours_status: 'pending', contractor_id: 'c1', contractors: null }],
    }), 'j1')
    expect(res.approved).toBe(0)
    expect(mockCore).not.toHaveBeenCalled()
  })

  it('treats an existing payable as skipped, not an error (idempotent re-run)', async () => {
    mockCore.mockResolvedValue({ error: 'This job is already approved for pay for this contractor.', alreadyApprovedId: 'ci1' })
    const res = await autoApproveRecurringJobPay(svc({ job: REC_JOB, rec: CELTIC, workers: [{ ...HOURLY, contractor_id: 'c1', contractors: null }] }), 'j1')
    expect(res.errors).toEqual([])
    expect(res.skipped[0]).toMatch(/already approved/)
  })
})
