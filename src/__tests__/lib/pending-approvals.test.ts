import { classifyApprovalRow } from '@/lib/pending-approvals'

const base = {
  payType: 'hourly' as string | null,
  rate: 35 as number | null,
  allowedHours: 4 as number | null,
  submittedHours: null as number | null,
  payableHours: 4 as number | null,
  hasExistingCI: false,
  workersOnJob: 1,
}

describe('classifyApprovalRow', () => {
  it('hourly with rate + hours is ready, amount = payable × rate', () => {
    const r = classifyApprovalRow(base)
    expect(r.mode).toBe('hourly')
    expect(r.readiness).toBe('ready')
    expect(r.computedAmount).toBe(140)
    expect(r.flags).toEqual([])
  })

  it('flags + excludes already-approved rows', () => {
    const r = classifyApprovalRow({ ...base, hasExistingCI: true })
    expect(r.readiness).toBe('already_approved')
    expect(r.flags).toContain('already_approved')
  })

  it('missing rate → fixed mode, needs input, missing_rate flag', () => {
    const r = classifyApprovalRow({ ...base, rate: null })
    expect(r.mode).toBe('fixed')
    expect(r.flags).toContain('missing_rate')
    expect(r.computedAmount).toBeNull()
  })

  it('missing hours (hourly) → needs review', () => {
    const r = classifyApprovalRow({ ...base, payableHours: null })
    expect(r.mode).toBe('fixed') // can't do hourly maths without hours
    expect(r.flags).toContain('fixed_needs_amount')
  })

  it('explicit fixed pay_type → fixed, needs input', () => {
    const r = classifyApprovalRow({ ...base, payType: 'fixed' })
    expect(r.mode).toBe('fixed')
    expect(r.readiness).toBe('needs_input')
    expect(r.flags).toContain('fixed_needs_amount')
  })

  it('submitted exceeding allowed is flagged', () => {
    const r = classifyApprovalRow({ ...base, submittedHours: 6 })
    expect(r.flags).toContain('submitted_exceeds_allowed')
  })

  it('multiple contractors on a job is flagged', () => {
    const r = classifyApprovalRow({ ...base, workersOnJob: 2 })
    expect(r.flags).toContain('multiple_contractors')
  })
})
