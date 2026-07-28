import { validateAllocation, isFullyAllocated, round2, type AllocationContext } from '@/lib/payment-allocation'

function ctx(over: Partial<AllocationContext> = {}): AllocationContext {
  return {
    transactionAmount: 650,
    transactionAllocated: 0,
    invoices: { inv1: { total: 650, allocated: 0 } },
    ...over,
  }
}

describe('validateAllocation', () => {
  it('accepts a full allocation of a payment to one invoice (the INV-26022 case)', () => {
    const r = validateAllocation(ctx(), [{ invoiceId: 'inv1', amount: 650 }])
    expect(r.ok).toBe(true)
    expect(r.transactionRemaining).toBe(0)
  })

  it('accepts a partial allocation and reports the remaining payment balance', () => {
    const r = validateAllocation(
      ctx({ invoices: { inv1: { total: 1000, allocated: 0 } } }),
      [{ invoiceId: 'inv1', amount: 400 }],
    )
    expect(r.ok).toBe(true)
    expect(r.transactionRemaining).toBe(250)
  })

  it('accepts a split of one payment across two invoices', () => {
    const r = validateAllocation(
      ctx({ invoices: { inv1: { total: 400, allocated: 0 }, inv2: { total: 250, allocated: 0 } } }),
      [{ invoiceId: 'inv1', amount: 400 }, { invoiceId: 'inv2', amount: 250 }],
    )
    expect(r.ok).toBe(true)
    expect(r.transactionRemaining).toBe(0)
  })

  it('rejects allocating more than the payment amount (over-allocate the transaction)', () => {
    // Invoice is large enough to absorb it, so the TRANSACTION limit is what bites.
    const r = validateAllocation(
      ctx({ transactionAmount: 650, invoices: { inv1: { total: 5000, allocated: 0 } } }),
      [{ invoiceId: 'inv1', amount: 700 }],
    )
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/more than the payment/i)
  })

  it('rejects allocating more than an invoice total (over-allocate the invoice)', () => {
    const r = validateAllocation(
      ctx({ transactionAmount: 1000, invoices: { inv1: { total: 650, allocated: 0 } } }),
      [{ invoiceId: 'inv1', amount: 800 }],
    )
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/more than the invoice total/i)
    expect(r.error).toMatch(/650\.00 remaining/)
  })

  it('accounts for existing live allocations on the invoice (no double-paying an invoice)', () => {
    // Invoice already has 500 of its 650 allocated → only 150 left.
    const r = validateAllocation(
      ctx({ transactionAmount: 400, invoices: { inv1: { total: 650, allocated: 500 } } }),
      [{ invoiceId: 'inv1', amount: 400 }],
    )
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/150\.00 remaining/)
  })

  it('accounts for existing live allocations on the transaction', () => {
    // Payment already has 400 of its 650 allocated → only 250 left.
    const r = validateAllocation(
      ctx({ transactionAllocated: 400, invoices: { inv1: { total: 1000, allocated: 0 } } }),
      [{ invoiceId: 'inv1', amount: 300 }],
    )
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/250\.00 of this payment/i)
  })

  it('rejects zero / negative amounts', () => {
    expect(validateAllocation(ctx(), [{ invoiceId: 'inv1', amount: 0 }]).ok).toBe(false)
    expect(validateAllocation(ctx(), [{ invoiceId: 'inv1', amount: -5 }]).ok).toBe(false)
  })

  it('rejects the same invoice appearing twice in one allocation set', () => {
    const r = validateAllocation(
      ctx({ invoices: { inv1: { total: 650, allocated: 0 } } }),
      [{ invoiceId: 'inv1', amount: 300 }, { invoiceId: 'inv1', amount: 300 }],
    )
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/more than once/i)
  })

  it('rejects an empty allocation set and an unknown invoice', () => {
    expect(validateAllocation(ctx(), []).ok).toBe(false)
    expect(validateAllocation(ctx(), [{ invoiceId: 'nope', amount: 100 }]).ok).toBe(false)
  })

  it('tolerates sub-cent float noise', () => {
    const r = validateAllocation(
      ctx({ transactionAmount: 650.1, invoices: { inv1: { total: 650.1, allocated: 0 } } }),
      [{ invoiceId: 'inv1', amount: 650.1 }],
    )
    expect(r.ok).toBe(true)
  })
})

describe('isFullyAllocated', () => {
  it('is true when allocations cover the amount (within a cent)', () => {
    expect(isFullyAllocated(650, 650)).toBe(true)
    expect(isFullyAllocated(650, 649.999)).toBe(true)
    expect(isFullyAllocated(650, 400)).toBe(false)
  })
})

describe('round2', () => {
  it('rounds to cents', () => {
    expect(round2(650.005)).toBe(650.01)
    expect(round2(0.1 + 0.2)).toBe(0.3)
  })
})
