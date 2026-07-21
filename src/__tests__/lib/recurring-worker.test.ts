import { buildRecurringWorkerRow } from '@/lib/recurring-worker'

describe('buildRecurringWorkerRow — recurring occurrence pay basis', () => {
  it('hourly recurring → snapshots the rate + hours + hourly pay_type', () => {
    const row = buildRecurringWorkerRow({ jobId: 'j-1', contractorId: 'c-1', contractorRate: 45, allowedHours: 3, payType: 'hourly' })
    expect(row).toEqual({ job_id: 'j-1', contractor_id: 'c-1', hours_allocated: 3, pay_rate: 45, pay_type: 'hourly' })
  })

  it('fixed recurring → carries the fixed pay basis (still snapshots the rate)', () => {
    const row = buildRecurringWorkerRow({ jobId: 'j-2', contractorId: 'c-1', contractorRate: 45, allowedHours: 3, payType: 'fixed' })
    expect(row.pay_type).toBe('fixed')
    expect(row.pay_rate).toBe(45)
  })

  it('rate-less contractor → null snapshot (job-cost falls back to live rate)', () => {
    const row = buildRecurringWorkerRow({ jobId: 'j-3', contractorId: 'c-1', contractorRate: null, allowedHours: 2, payType: 'hourly' })
    expect(row.pay_rate).toBeNull()
  })

  it('a later profile-rate change only affects FUTURE occurrences', () => {
    // occurrence generated while the rate was 40, then again after a rise to 60
    const before = buildRecurringWorkerRow({ jobId: 'j-a', contractorId: 'c-1', contractorRate: 40, allowedHours: 3, payType: 'hourly' })
    const after = buildRecurringWorkerRow({ jobId: 'j-b', contractorId: 'c-1', contractorRate: 60, allowedHours: 3, payType: 'hourly' })
    expect(before.pay_rate).toBe(40) // already-generated keeps its snapshot
    expect(after.pay_rate).toBe(60)  // future occurrence gets the new rate
  })

  it('defaults an unknown pay type to hourly', () => {
    const row = buildRecurringWorkerRow({ jobId: 'j-4', contractorId: 'c-1', contractorRate: 30, allowedHours: 1, payType: 'weird' as unknown as 'hourly' })
    expect(row.pay_type).toBe('hourly')
  })
})
