import { buildRecurringWorkerRow } from '@/lib/recurring-worker'

describe('buildRecurringWorkerRow — recurring occurrence pay basis', () => {
  it('hourly recurring → snapshots the rate + hours + hourly pay_type', () => {
    const row = buildRecurringWorkerRow({ jobId: 'j-1', contractorId: 'c-1', contractorRate: 45, allowedHours: 3, payType: 'hourly' })
    expect(row).toEqual({ job_id: 'j-1', contractor_id: 'c-1', hours_allocated: 3, pay_rate: 45, pay_type: 'hourly' })
  })

  it('fixed recurring → fixed basis, rate snapshotted, but NO allocated hours (no misleading payable)', () => {
    const row = buildRecurringWorkerRow({ jobId: 'j-2', contractorId: 'c-1', contractorRate: 45, allowedHours: 3, payType: 'fixed' })
    expect(row.pay_type).toBe('fixed')
    expect(row.pay_rate).toBe(45) // kept for reference
    expect(row.hours_allocated).toBeNull() // not payable per occurrence
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

describe('buildRecurringWorkerRow — per-client rate', () => {
  it('uses the client rate over the contractor profile rate', () => {
    // The Oranga Tamariki case: profile $35, agreed OT rate $32.20.
    const row = buildRecurringWorkerRow({
      jobId: 'j-ot', contractorId: 'c-1', contractorRate: 35, clientRate: 32.2,
      allowedHours: 7, payType: 'hourly',
    })
    expect(row.pay_rate).toBe(32.2)
  })

  it('falls back to the profile rate when no client rate applies', () => {
    const row = buildRecurringWorkerRow({
      jobId: 'j-res', contractorId: 'c-1', contractorRate: 35, clientRate: null,
      allowedHours: 3, payType: 'hourly',
    })
    expect(row.pay_rate).toBe(35)
  })

  it('omitting clientRate entirely keeps the previous behaviour', () => {
    const row = buildRecurringWorkerRow({
      jobId: 'j-old', contractorId: 'c-1', contractorRate: 45,
      allowedHours: 3, payType: 'hourly',
    })
    expect(row.pay_rate).toBe(45)
  })

  it('snapshots the client rate on a fixed-pay occurrence too', () => {
    const row = buildRecurringWorkerRow({
      jobId: 'j-fix', contractorId: 'c-1', contractorRate: 35, clientRate: 30,
      allowedHours: 4, payType: 'fixed',
    })
    expect(row.pay_rate).toBe(30)
    expect(row.hours_allocated).toBeNull()
  })
})

describe('buildRecurringWorkerRow — per-visit set amount', () => {
  it('pays the set amount, never hours x rate', () => {
    // NZCL 58B Trias Road: $126 per clean, NOT 3h x $30.
    const row = buildRecurringWorkerRow({
      jobId: 'j-nzcl', contractorId: 'c-1',
      contractorRate: 35, clientRate: 30, perVisitRate: 126,
      allowedHours: 3, payType: 'hourly',
    })
    expect(row.pay_rate).toBe(126)
    expect(row.pay_type).toBe('fixed')
    // Hours must NOT be seeded, or the pay UI shows 3 x $126.
    expect(row.hours_allocated).toBeNull()
  })

  it('wins over both the client rate and the profile rate', () => {
    const row = buildRecurringWorkerRow({
      jobId: 'j-1', contractorId: 'c-1',
      contractorRate: 35, clientRate: 32.2, perVisitRate: 126,
      allowedHours: 7, payType: 'hourly',
    })
    expect(row.pay_rate).toBe(126)
  })

  it('falls back to the normal rate chain when there is no per-visit rate', () => {
    const row = buildRecurringWorkerRow({
      jobId: 'j-2', contractorId: 'c-1',
      contractorRate: 35, clientRate: 32.2, perVisitRate: null,
      allowedHours: 7, payType: 'hourly',
    })
    expect(row.pay_rate).toBe(32.2)
    expect(row.pay_type).toBe('hourly')
    expect(row.hours_allocated).toBe(7)
  })

  it('ignores a zero or negative per-visit rate', () => {
    const row = buildRecurringWorkerRow({
      jobId: 'j-3', contractorId: 'c-1',
      contractorRate: 35, clientRate: 30, perVisitRate: 0,
      allowedHours: 3, payType: 'hourly',
    })
    expect(row.pay_rate).toBe(30)
    expect(row.pay_type).toBe('hourly')
  })
})
