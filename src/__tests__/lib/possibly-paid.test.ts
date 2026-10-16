import { addressKey, possiblyPaidNote, type PaidLine } from '@/lib/possibly-paid'

const paid = (p: Partial<PaidLine>): PaidLine => ({
  invoiceNumber: 'CI-1', contractorId: 'c-other', contractorName: 'Kritika', jobId: 'j-other', jobNumber: 'JOB-9',
  address: null, date: null, hours: null, status: 'paid', ...p,
})

describe('possiblyPaidNote — the cross-check before approving pay', () => {
  it('JOB-0233: another contractor already paid ~the job hours on the same job', () => {
    const note = possiblyPaidNote(
      { jobId: 'j233', contractorId: 'c-lose', jobNumber: 'JOB-0233', address: '27 Murdoch Rd', date: null, hours: 2 },
      [paid({ jobId: 'j233', invoiceNumber: 'CI-0113', hours: 3 })],
    )
    expect(note).toMatch(/CI-0113 3h on this job/)
  })

  it('JOB-0389: same address within 3 weeks, this job has no hours → flagged to check', () => {
    const note = possiblyPaidNote(
      { jobId: 'j389', contractorId: 'c-k', jobNumber: 'JOB-0389', address: 'Unit 2/2 Mountain View Rd, Western Springs', date: '2026-08-25', hours: null },
      [paid({ jobId: 'j322', jobNumber: 'JOB-0322', invoiceNumber: 'CI-0134', address: 'Unit 2/2 Mountain View Rd', date: '2026-08-27', hours: 17 })],
    )
    expect(note).toMatch(/CI-0134 17h on JOB-0322 \(2026-08-27\), same address/)
  })

  it('same address, hours far apart → genuine separate work, no flag (JOB-0437 vs the $225 extra)', () => {
    expect(possiblyPaidNote(
      { jobId: 'j437', contractorId: 'c-k', jobNumber: 'JOB-0437', address: '11 Gray Crescent, Torbay', date: '2026-10-01', hours: 8 },
      [paid({ jobId: 'j475', address: '11 Gray Crescent', date: '2026-10-01', hours: null, contractorId: 'c-k' }),
       paid({ jobId: 'j476', address: '11 Gray Crescent', date: '2026-10-01', hours: 3 })],
    )).toBeNull()
  })

  it('two-cleaner job: the other cleaner\'s half share is not "already paid"', () => {
    expect(possiblyPaidNote(
      { jobId: 'j487', contractorId: 'c-radhika', jobNumber: 'JOB-0487', address: '33 Ennis Avenue', date: '2026-10-07', hours: 5 },
      [paid({ jobId: 'j487', contractorId: 'c-nasrin', hours: 2.5 })],
    )).toBeNull()
  })

  it('same address but more than 3 weeks apart → no flag', () => {
    expect(possiblyPaidNote(
      { jobId: 'a', contractorId: 'c', jobNumber: 'JOB-1', address: '5 Main St', date: '2026-10-01', hours: 4 },
      [paid({ address: '5 Main St', date: '2026-08-01', hours: 4 })],
    )).toBeNull()
  })

  it('normalises addresses on the street line', () => {
    expect(addressKey('Unit 2/2 Mountain View Rd, Western Springs')).toBe(addressKey('unit 2/2 mountain view rd'))
  })
})
