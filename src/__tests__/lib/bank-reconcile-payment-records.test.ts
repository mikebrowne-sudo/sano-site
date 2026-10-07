import { reconcile, type BankTxn, type ReconPaymentRecord, type ReconExpense } from '@/lib/bank-reconcile'

// A bank debit. `uniqueId` and `tranType` are required by BankTxn but
// irrelevant to debit matching.
function debit(date: string, amount: number, payee = 'PMT TO FC06-0878-0765722-00'): BankTxn {
  return {
    uniqueId: `${date}-${amount}`,
    date,
    tranType: 'DEBIT',
    payee,
    memo: '',
    amount: -Math.abs(amount),
    direction: 'out',
  } as BankTxn
}

const NO_INVOICES: never[] = []

describe('reconcile — debits already paid via remittance or pay run', () => {
  const remittance: ReconPaymentRecord = {
    kind: 'remittance',
    label: 'RA-0042 · VMK LTD',
    amount: 2165,
    paymentDate: '2026-09-30',
  }

  it('marks a contractor remittance debit as already paid, not "not recorded"', () => {
    // The real defect: 20 contractor payments showed "Not recorded" and invited
    // an expense entry, double-counting ~$22,000 and its GST.
    const r = reconcile({
      transactions: [debit('2026-09-30', 2165)],
      invoices: NO_INVOICES,
      expenses: [],
      paymentRecords: [remittance],
    })
    expect(r.debits[0].status).toBe('already_paid_elsewhere')
    expect(r.debits[0].paymentRecord?.label).toBe('RA-0042 · VMK LTD')
    expect(r.summary.debitsToRecord).toBe(0)
    expect(r.summary.debitsPaidElsewhere).toBe(1)
  })

  it('matches an employee pay run by net pay', () => {
    const payRun: ReconPaymentRecord = {
      kind: 'pay_run',
      label: 'Pay run 2026-09-28',
      amount: 505.5,
      paymentDate: '2026-09-28',
    }
    const r = reconcile({
      transactions: [debit('2026-09-28', 505.5, 'BILL PAYMENT TO WAGES CAROL')],
      invoices: NO_INVOICES,
      expenses: [],
      paymentRecords: [payRun],
    })
    expect(r.debits[0].status).toBe('already_paid_elsewhere')
    expect(r.debits[0].paymentRecord?.kind).toBe('pay_run')
  })

  it('an EXPENSE row still wins over a payment record', () => {
    // Expenses are checked first: a real expense row is the better explanation,
    // and must not be relabelled as payroll.
    const expense: ReconExpense = { amount: 2165, expenseDate: '2026-09-30' }
    const r = reconcile({
      transactions: [debit('2026-09-30', 2165)],
      invoices: NO_INVOICES,
      expenses: [expense],
      paymentRecords: [remittance],
    })
    expect(r.debits[0].status).toBe('recorded')
    expect(r.debits[0].expense).toBe(expense)
  })

  it('still reports a genuine expense gap as not recorded', () => {
    // Google Workspace $43.47 — a real expense nobody has entered.
    const r = reconcile({
      transactions: [debit('2026-09-02', 43.47, 'Google Workspace_sano.nz Auckland')],
      invoices: NO_INVOICES,
      expenses: [],
      paymentRecords: [remittance],
    })
    expect(r.debits[0].status).toBe('not_recorded')
    expect(r.summary.debitsToRecord).toBe(1)
    expect(r.summary.debitsPaidElsewhere).toBe(0)
  })

  it('does not match on amount alone when the date is far away', () => {
    // Same amount, three months apart — a coincidence, not this payment.
    const r = reconcile({
      transactions: [debit('2026-06-30', 2165)],
      invoices: NO_INVOICES,
      expenses: [],
      paymentRecords: [remittance],
    })
    expect(r.debits[0].status).toBe('not_recorded')
  })

  it('picks the closest remittance when several share an amount', () => {
    const near: ReconPaymentRecord = { ...remittance, label: 'RA-0099 · near', paymentDate: '2026-09-30' }
    const far: ReconPaymentRecord = { ...remittance, label: 'RA-0001 · far', paymentDate: '2026-09-26' }
    const r = reconcile({
      transactions: [debit('2026-09-30', 2165)],
      invoices: NO_INVOICES,
      expenses: [],
      paymentRecords: [far, near],
    })
    expect(r.debits[0].paymentRecord?.label).toBe('RA-0099 · near')
  })

  it('behaves exactly as before when no payment records are supplied', () => {
    // Back-compat: the parameter is optional, so existing callers are unchanged.
    const r = reconcile({
      transactions: [debit('2026-09-30', 2165)],
      invoices: NO_INVOICES,
      expenses: [],
    })
    expect(r.debits[0].status).toBe('not_recorded')
    expect(r.summary.debitsPaidElsewhere).toBe(0)
  })

  it('counts a realistic mixed month correctly', () => {
    const r = reconcile({
      transactions: [
        debit('2026-09-30', 2165),                                        // remittance
        debit('2026-09-30', 2625),                                        // remittance
        debit('2026-09-28', 505.5, 'WAGES CAROL'),                        // pay run
        debit('2026-09-02', 43.47, 'Google Workspace'),                   // real expense
        debit('2026-09-14', 80.63, 'ELANTIS PREMIUM'),                    // real expense
      ],
      invoices: NO_INVOICES,
      expenses: [],
      paymentRecords: [
        remittance,
        { kind: 'remittance', label: 'RA-0041 · VMK LTD', amount: 2625, paymentDate: '2026-09-30' },
        { kind: 'pay_run', label: 'Pay run 2026-09-28', amount: 505.5, paymentDate: '2026-09-28' },
      ],
    })
    expect(r.summary.debitsPaidElsewhere).toBe(3)
    expect(r.summary.debitsToRecord).toBe(2)
  })
})
