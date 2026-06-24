import { parseAsbCsv } from '@/lib/asb-import'
import { reconcile, type ReconInvoice, type ReconExpense } from '@/lib/bank-reconcile'

const SAMPLE = `Date,Unique Id,Tran Type,Cheque Number,Payee,Memo,Amount
3/04/2026,2026040301,CREDIT,,CREDIT,,0
18/04/2026,2026041801,D/C,,D/C FROM From MS C J BROWNE,start up,1000
20/04/2026,2026042001,D/C,,"D/C FROM BIRCHALL,TOBI",INV-0018,475
13/05/2026,2026051301,D/C,,D/C FROM E WORK,78 Browns Rd  Cleaning,867
8/05/2026,2026050802,BILLPAY,,PMT TO FC06-0878-0765722-00,BILL PAYMENT TO KRITIKA PAYROLL 08-05-26,-1220
19/06/2026,2026061901,EFTPOS,,MICROSOFT*MICROSOFT 36,EFTPOS,-179`

const { transactions } = parseAsbCsv(SAMPLE)

const invoices: ReconInvoice[] = [
  { id: 'a', invoiceNumber: 'INV-0018', status: 'paid', total: 475, datePaid: '2026-04-29' },
  { id: 'b', invoiceNumber: 'INV-0050', status: 'sent', total: 867, datePaid: null }, // matches E Work by amount
]
const expenses: ReconExpense[] = [
  { amount: 1220, expenseDate: '2026-05-08' }, // matches KRITIKA payroll
  // Microsoft $179 deliberately NOT recorded
]

const result = reconcile({ transactions, invoices, expenses })

describe('reconcile', () => {
  it('skips zero-value lines', () => {
    expect(result.credits.find((c) => c.txn.uniqueId === '2026040301')).toBeUndefined()
  })

  it('marks an owner contribution as financing, not income', () => {
    const c = result.credits.find((c) => c.txn.uniqueId === '2026041801')!
    expect(c.status).toBe('financing')
  })

  it('reconciles a credit whose memo references an already-paid invoice', () => {
    const c = result.credits.find((c) => c.txn.uniqueId === '2026042001')!
    expect(c.status).toBe('reconciled')
    expect(c.invoice?.invoiceNumber).toBe('INV-0018')
  })

  it('flags a credit that matches an UNPAID invoice by amount (action: mark paid)', () => {
    const c = result.credits.find((c) => c.txn.uniqueId === '2026051301')!
    expect(c.status).toBe('amount_match')
    expect(c.invoice?.invoiceNumber).toBe('INV-0050')
  })

  it('marks a debit as recorded when a same-amount expense exists near the date', () => {
    const d = result.debits.find((d) => d.txn.uniqueId === '2026050802')!
    expect(d.status).toBe('recorded')
  })

  it('flags a debit with no matching expense (action: add expense)', () => {
    const d = result.debits.find((d) => d.txn.uniqueId === '2026061901')!
    expect(d.status).toBe('not_recorded')
  })

  it('summarises actionable counts', () => {
    expect(result.summary.invoicesToMarkPaid).toBe(1)
    expect(result.summary.debitsToRecord).toBe(1)
    expect(result.summary.financingCredits).toBe(1)
    expect(result.summary.creditCount).toBe(3) // excludes the zero line
    expect(result.summary.debitCount).toBe(2)
  })
})
