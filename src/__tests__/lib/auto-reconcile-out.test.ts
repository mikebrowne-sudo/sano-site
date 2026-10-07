import { ownAccountTransfer, payeeKeyOut, proposeDebitReconcile, type OutDebit, type OutExpense, type OutPayRun, type OutRemittance } from '@/lib/auto-reconcile-out'

const OWN = '12-3627-0005597-00'
function debit(p: Partial<OutDebit>): OutDebit {
  return { id: 'd1', date: '2026-09-30', amount: 100, payee: 'PMT TO FC00-0000-0000000-00', memo: '', allocated: 0, ...p }
}
function remit(p: Partial<OutRemittance>): OutRemittance {
  return { id: 'r1', number: 'RA-0001', reference: null, payeeLabel: null, paymentDate: '2026-09-30', total: 100, allocated: 0, ...p }
}
function expense(p: Partial<OutExpense>): OutExpense {
  return { id: 'e1', date: '2026-09-30', amount: 100, category: 'insurance', vendor: 'Elantis', reference: null, gstInclusive: true, linked: false, ...p }
}
function run(p: Partial<OutPayRun>): OutPayRun {
  return { id: 'p1', payDate: '2026-09-28', net: 505.5, reference: null, linked: false, ...p }
}
const go = (a: { debits: OutDebit[]; remittances?: OutRemittance[]; payRuns?: OutPayRun[]; expenses?: OutExpense[] }) =>
  proposeDebitReconcile({ remittances: [], payRuns: [], expenses: [], ownAccount: OWN, ...a })

describe('money-out auto-reconcile', () => {
  it('matches a remittance by its reference', () => {
    const r = go({
      debits: [debit({ amount: 630, memo: 'BILL PAYMENT TO PAYROLL MARINA 220726', date: '2026-07-22' })],
      remittances: [remit({ total: 630, reference: 'MARINA PAYROLL 220726', paymentDate: '2026-07-22' }), remit({ id: 'r2', total: 630, reference: 'OTHER 220726' })],
    })
    expect(r.proposals[0]).toMatchObject({ kind: 'remittance', method: 'reference', allocations: [{ remittanceId: 'r1', amount: 630 }] })
  })

  it('settles two same-day, same-amount remittances by the payee named in the bank text', () => {
    const r = go({
      debits: [
        debit({ id: 'nas', amount: 2625, memo: 'BILL PAYMENT TO PAYROLL Nasrin 300926' }),
        debit({ id: 'vmk', amount: 2625, memo: 'BILL PAYMENT TO SANO PAYROLL VMK 300926' }),
      ],
      remittances: [
        remit({ id: 'RA-39', total: 2625, payeeLabel: 'Nasrin Maleki', reference: 'NASRINPAYROLL300926' }),
        remit({ id: 'RA-41', total: 2625, payeeLabel: 'VMK LTD', reference: 'VMKPAYROLL300926' }),
      ],
    })
    const byDebit = Object.fromEntries(r.proposals.map((p) => [p.debitId, p.kind === 'remittance' ? p.allocations[0].remittanceId : null]))
    expect(byDebit).toEqual({ nas: 'RA-39', vmk: 'RA-41' })
  })

  it('pays a remittance before a duplicate expense row for the same money', () => {
    const r = go({
      debits: [debit({ amount: 1220, date: '2026-05-08' })],
      remittances: [remit({ total: 1220, paymentDate: '2026-05-08' })],
      expenses: [expense({ amount: 1220, date: '2026-05-08', category: 'contractor_payment' })],
    })
    expect(r.proposals[0].kind).toBe('remittance')
  })

  it('links a pay run by net pay, choosing the strictly closest date', () => {
    const r = go({
      debits: [debit({ amount: 505.5, date: '2026-08-04' })],
      payRuns: [run({ id: 'near', payDate: '2026-08-03' }), run({ id: 'far', payDate: '2026-08-10' })],
    })
    expect(r.proposals[0]).toMatchObject({ kind: 'pay_run', payRunId: 'near' })
  })

  it('treats a transfer to Sano’s own -51 account as internal, not an expense', () => {
    expect(ownAccountTransfer('TO 12-3627- 0005597-51 PAYE - Carol', OWN)).toBe(true)
    expect(ownAccountTransfer('TO 12-3627-0005597-00', OWN)).toBe(false)
    expect(ownAccountTransfer('PMT TO FC12-3051-0345555-50', OWN)).toBe(false)
    const r = go({ debits: [debit({ amount: 94.5, payee: 'FN TRANSFER', memo: 'TO 12-3627- 0005597-51 PAYE - Carol' })] })
    expect(r.proposals[0].kind).toBe('internal_transfer')
  })

  it('links an existing expense of the same amount near the date, one-to-one', () => {
    const r = go({
      debits: [debit({ id: 'a', amount: 80.63, date: '2026-09-14' }), debit({ id: 'b', amount: 80.63, date: '2026-09-15' })],
      expenses: [expense({ amount: 80.63, date: '2026-09-14' })],
    })
    expect(r.proposals.filter((p) => p.kind === 'expense')).toHaveLength(1)
    expect(r.proposals[0].debitId).toBe('a')
  })

  it('records IRD payments (no GST, below the line) and IRD card fees', () => {
    const r = go({
      debits: [
        debit({ id: 'paye', amount: 94.5, payee: 'INLAND REVENUE DEPT', memo: 'D/D PSO 060220360 501784416' }),
        debit({ id: 'fee', amount: 1.34, payee: 'IRD Conv FeeAuckland', memo: 'EFTPOS' }),
      ],
    })
    const byId = Object.fromEntries(r.proposals.map((p) => [p.debitId, p]))
    expect(byId.paye).toMatchObject({ kind: 'created_expense', category: 'ird_payment', gstInclusive: false })
    expect(byId.fee).toMatchObject({ kind: 'created_expense', category: 'bank_fees' })
  })

  it('records a repeat bill — same payee and amount as an earlier matched expense', () => {
    const r = go({
      debits: [
        debit({ id: 'aug', amount: 43.47, payee: 'Google Workspace_sano.nz Auckland', memo: 'EFTPOS', date: '2026-08-02' }),
        debit({ id: 'oct', amount: 43.47, payee: 'Google Workspace_sano.nz Auckland', memo: 'EFTPOS', date: '2026-10-03' }),
      ],
      expenses: [expense({ amount: 43.47, date: '2026-08-02', category: 'software_subscriptions', vendor: 'Google Workspace' })],
    })
    const oct = r.proposals.find((p) => p.debitId === 'oct')
    expect(oct).toMatchObject({ kind: 'created_expense', category: 'software_subscriptions', vendor: 'Google Workspace', gstInclusive: true })
    expect(payeeKeyOut('Google Workspace_sano.nz Auckland')).toBe(payeeKeyOut('Google Workspace_sano.nz  Auckland'))
  })

  it('does not record a repeat bill when the amount changed', () => {
    const r = go({
      debits: [debit({ id: 'oct', amount: 24, payee: 'Resene - NewLynn 067 New Lynn', memo: 'EFTPOS' })],
    })
    expect(r.proposals).toHaveLength(0)
    expect(r.review[0].why).toBe('Nothing recorded for this payment')
  })

  it('leaves unknown card spending for a human', () => {
    const r = go({ debits: [debit({ amount: 10.91, payee: 'SAIGON BAKERY AUCKLAND', memo: 'EFTPOS' })] })
    expect(r.proposals).toHaveLength(0)
  })

  it('matches a wage payment that includes mileage (payout = net + mileage)', () => {
    // The runner passes net pay + mileage reimbursement as the pay run's payout.
    const r = go({
      debits: [debit({ amount: 822.66, memo: 'BILL PAYMENT TO WAGES CAROL 10082026', date: '2026-08-10' })],
      payRuns: [run({ id: 'aug10', payDate: '2026-08-10', net: 505.5 + 317.16 })],
    })
    expect(r.proposals[0]).toMatchObject({ kind: 'pay_run', payRunId: 'aug10' })
  })

  it('flags two pay runs paid in one transfer for a human (one link per debit)', () => {
    const r = go({
      debits: [debit({ amount: 1501.2, memo: 'BILL PAYMENT TO WAGES CAROL 070926', date: '2026-09-07' })],
      payRuns: [run({ id: 'a', payDate: '2026-09-07', net: 505.5 }), run({ id: 'b', payDate: '2026-09-07', net: 995.7 })],
    })
    expect(r.proposals).toHaveLength(0)
    expect(r.review[0].why).toMatch(/Pays 2 pay runs together/)
  })
})
