import {
  validateRemitAllocation,
  isDebitFullyAllocated,
  matchOutgoing,
  searchRemittances,
  type RemitAllocationContext,
  type OutgoingDebit,
  type ReconRemittance,
} from '@/lib/remittance-reconcile'

function remit(p: Partial<ReconRemittance> & { id: string }): ReconRemittance {
  return {
    remittanceNumber: 'RA-0001',
    reference: null,
    payeeLabel: null,
    paymentDate: '2026-07-22',
    total: 630,
    paidAt: null,
    paymentConfirmed: false,
    allocatedTotal: 0,
    ...p,
  }
}

function debit(p: Partial<OutgoingDebit> & { id: string }): OutgoingDebit {
  return {
    date: '2026-07-22',
    payee: 'PMT TO FC38-9015-0118352-03',
    memo: 'BILL PAYMENT TO PAYROLL MARINA 220726',
    amount: -630,
    cleared: false,
    allocatedTotal: 0,
    ...p,
  }
}

describe('validateRemitAllocation', () => {
  const ctx = (over: Partial<RemitAllocationContext> = {}): RemitAllocationContext => ({
    transactionAmount: 630,
    transactionAllocated: 0,
    remittances: { r1: { total: 630, allocated: 0 } },
    ...over,
  })

  it('accepts a clean full allocation', () => {
    const r = validateRemitAllocation(ctx(), [{ remittanceId: 'r1', amount: 630 }])
    expect(r.ok).toBe(true)
    expect(r.transactionRemaining).toBe(0)
  })

  it('rejects an empty proposal', () => {
    expect(validateRemitAllocation(ctx(), []).ok).toBe(false)
  })

  it('rejects a non-positive amount', () => {
    expect(validateRemitAllocation(ctx(), [{ remittanceId: 'r1', amount: 0 }]).ok).toBe(false)
  })

  it('rejects duplicate remittance in the set', () => {
    const r = validateRemitAllocation(ctx({ transactionAmount: 1260, remittances: { r1: { total: 630, allocated: 0 } } }), [
      { remittanceId: 'r1', amount: 300 },
      { remittanceId: 'r1', amount: 300 },
    ])
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/more than once/)
  })

  it('rejects over-allocating a remittance (fires before txn limit)', () => {
    const r = validateRemitAllocation(ctx({ transactionAmount: 1000, remittances: { r1: { total: 630, allocated: 400 } } }), [
      { remittanceId: 'r1', amount: 300 },
    ])
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/more than the remittance total/)
  })

  it('rejects over-allocating the bank debit', () => {
    const r = validateRemitAllocation(ctx({ transactionAmount: 630, transactionAllocated: 500, remittances: { r1: { total: 5000, allocated: 0 } } }), [
      { remittanceId: 'r1', amount: 200 },
    ])
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/more than the payment amount/)
  })

  it('supports splitting one debit across two remittances', () => {
    const r = validateRemitAllocation(
      ctx({ transactionAmount: 1000, remittances: { r1: { total: 600, allocated: 0 }, r2: { total: 400, allocated: 0 } } }),
      [{ remittanceId: 'r1', amount: 600 }, { remittanceId: 'r2', amount: 400 }],
    )
    expect(r.ok).toBe(true)
    expect(r.transactionRemaining).toBe(0)
  })

  it('supports paying one remittance with a partial (second debit later)', () => {
    const r = validateRemitAllocation(
      ctx({ transactionAmount: 300, remittances: { r1: { total: 630, allocated: 330 } } }),
      [{ remittanceId: 'r1', amount: 300 }],
    )
    expect(r.ok).toBe(true)
  })
})

describe('isDebitFullyAllocated', () => {
  it('true within a sub-cent tolerance', () => {
    expect(isDebitFullyAllocated(630, 629.999)).toBe(true)
    expect(isDebitFullyAllocated(630, 629.9)).toBe(false)
  })
})

describe('matchOutgoing', () => {
  it('reference-matches the Marina $630 debit to RA-0016 by reference stem', () => {
    const rows = matchOutgoing({
      debits: [debit({ id: 'd1' })],
      remittances: [remit({ id: 'r16', remittanceNumber: 'RA-0016', reference: 'MARINA PAYROLL 220726', payeeLabel: 'Marina Rabangaki', total: 630 })],
    })
    expect(rows[0].status).toBe('reference_match')
    expect(rows[0].remittance?.remittanceNumber).toBe('RA-0016')
  })

  it('does not reference-match when the name is absent from the debit text', () => {
    const rows = matchOutgoing({
      debits: [debit({ id: 'd1', payee: 'PMT', memo: 'BILL PAYMENT TO PAYROLL UPASNI 220726' })],
      remittances: [remit({ id: 'r16', remittanceNumber: 'RA-0016', reference: 'MARINA PAYROLL 220726', payeeLabel: 'Marina Rabangaki', total: 630 })],
    })
    // amount+date still unique → falls through to amount_date_match
    expect(rows[0].status).toBe('amount_date_match')
  })

  it('amount+date-matches when there is no usable reference but a unique amount near the date', () => {
    const rows = matchOutgoing({
      debits: [debit({ id: 'd1', payee: 'PMT', memo: 'TRANSFER' })],
      remittances: [remit({ id: 'r16', total: 630, paymentDate: '2026-07-22' })],
    })
    expect(rows[0].status).toBe('amount_date_match')
  })

  it('is unmatched when two open remittances share the amount and neither reference matches', () => {
    const rows = matchOutgoing({
      debits: [debit({ id: 'd1', payee: 'PMT', memo: 'TRANSFER' })],
      remittances: [remit({ id: 'a', total: 630 }), remit({ id: 'b', total: 630 })],
    })
    expect(rows[0].status).toBe('unmatched')
  })

  it('marks an already fully-allocated debit as reconciled', () => {
    const rows = matchOutgoing({
      debits: [debit({ id: 'd1', allocatedTotal: 630 })],
      remittances: [remit({ id: 'r16', total: 630 })],
    })
    expect(rows[0].status).toBe('reconciled')
    expect(rows[0].remaining).toBe(0)
  })

  it('ignores a remittance already fully allocated when matching', () => {
    const rows = matchOutgoing({
      debits: [debit({ id: 'd1' })],
      remittances: [remit({ id: 'r16', total: 630, allocatedTotal: 630, reference: 'MARINA PAYROLL 220726', payeeLabel: 'Marina Rabangaki' })],
    })
    expect(rows[0].status).toBe('unmatched')
  })

  it('date window excludes a same-amount remittance paid weeks away (no ref)', () => {
    const rows = matchOutgoing({
      debits: [debit({ id: 'd1', date: '2026-07-22', payee: 'PMT', memo: 'TRANSFER' })],
      remittances: [remit({ id: 'r16', total: 630, paymentDate: '2026-06-01' })],
    })
    expect(rows[0].status).toBe('unmatched')
  })
})

describe('searchRemittances', () => {
  const all = [
    remit({ id: 'a', remittanceNumber: 'RA-0016', payeeLabel: 'Marina Rabangaki', reference: 'MARINA PAYROLL 220726', total: 630, paymentDate: '2026-07-22' }),
    remit({ id: 'b', remittanceNumber: 'RA-0018', payeeLabel: 'Mrytle McGoon', reference: 'MRYTLE PAYROLL 220726', total: 1650, paymentDate: '2026-07-22', allocatedTotal: 1650 }),
    remit({ id: 'c', remittanceNumber: 'RA-0019', payeeLabel: 'Marina Rabangaki', reference: 'MARINA PAYROLL 290726', total: 647.5, paymentDate: '2026-07-29' }),
  ]

  it('matches by remittance number', () => {
    expect(searchRemittances(all, { text: 'ra-0018' }).map((r) => r.id)).toEqual(['b'])
  })
  it('matches by contractor name across multiple', () => {
    expect(searchRemittances(all, { text: 'marina' }).map((r) => r.id)).toEqual(['a', 'c'])
  })
  it('matches by reference', () => {
    expect(searchRemittances(all, { text: '290726' }).map((r) => r.id)).toEqual(['c'])
  })
  it('matches by exact amount', () => {
    expect(searchRemittances(all, { amount: 1650 }).map((r) => r.id)).toEqual(['b'])
  })
  it('filters by date range', () => {
    expect(searchRemittances(all, { from: '2026-07-25' }).map((r) => r.id)).toEqual(['c'])
  })
  it('openOnly hides fully-allocated remittances', () => {
    expect(searchRemittances(all, { openOnly: true }).map((r) => r.id)).toEqual(['a', 'c'])
  })
})
