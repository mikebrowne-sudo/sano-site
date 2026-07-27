import {
  canTransitionPayment, canModifyPayRun, isImmutable, validatePaymentDetails, markPaidPatch,
} from '@/lib/payroll/pay-run-lifecycle'

describe('canTransitionPayment — draft → approved → paid only', () => {
  it('allows the forward steps', () => {
    expect(canTransitionPayment('draft', 'approved').ok).toBe(true)
    expect(canTransitionPayment('approved', 'paid').ok).toBe(true)
  })
  it('blocks skips and backwards moves', () => {
    expect(canTransitionPayment('draft', 'paid').ok).toBe(false)
    expect(canTransitionPayment('approved', 'approved' as 'paid').ok).toBe(false)
    expect(canTransitionPayment('paid', 'paid').ok).toBe(false)
    expect(canTransitionPayment('completed', 'paid').ok).toBe(false) // legacy is terminal
    expect(canTransitionPayment(null, 'approved').ok).toBe(false)
  })
})

describe('immutability', () => {
  it('only a draft may be modified/recalculated', () => {
    expect(canModifyPayRun('draft')).toBe(true)
    for (const s of ['approved', 'paid', 'completed']) expect(canModifyPayRun(s)).toBe(false)
  })
  it('approved/paid/completed are immutable', () => {
    expect(isImmutable('draft')).toBe(false)
    for (const s of ['approved', 'paid', 'completed']) expect(isImmutable(s)).toBe(true)
  })
})

describe('validatePaymentDetails', () => {
  it('requires date, reference and method', () => {
    expect(validatePaymentDetails({ paymentDate: null, paymentReference: 'x', paymentMethod: 'y' }).ok).toBe(false)
    expect(validatePaymentDetails({ paymentDate: '2026-07-27', paymentReference: ' ', paymentMethod: 'y' }).ok).toBe(false)
    expect(validatePaymentDetails({ paymentDate: '2026-07-27', paymentReference: 'x', paymentMethod: '' }).ok).toBe(false)
    expect(validatePaymentDetails({ paymentDate: '2026-07-27', paymentReference: 'SANO PAYROLL 270726', paymentMethod: 'bank transfer' }).ok).toBe(true)
  })
})

describe('markPaidPatch — paid never implies filed or remitted', () => {
  it('carries only employee-payment fields', () => {
    const patch = markPaidPatch(
      { paymentDate: '2026-07-27', paymentReference: 'SANO PAYROLL 270726', paymentMethod: 'bank transfer' },
      '2026-07-28T00:00:00Z', 'user-1',
    )
    expect(patch.status).toBe('paid')
    expect(patch.payment_reference).toBe('SANO PAYROLL 270726')
    // No payday-filing or IRD-remittance keys leak in.
    const keys = Object.keys(patch)
    expect(keys.some((k) => k.includes('filing'))).toBe(false)
    expect(keys.some((k) => k.includes('ird') || k.includes('remit') || k.includes('liabilit'))).toBe(false)
  })
})
