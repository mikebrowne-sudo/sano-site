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

  it('a credit referencing an already-paid but UNALLOCATED invoice → allocate_match (payment needs allocating)', () => {
    const c = result.credits.find((c) => c.txn.uniqueId === '2026042001')!
    expect(c.status).toBe('allocate_match')
    expect(c.invoice?.invoiceNumber).toBe('INV-0018')
  })

  it('a credit referencing an already-paid AND fully-allocated invoice → reconciled (nothing to do)', () => {
    const paidAndAllocated: ReconInvoice[] = [
      { id: 'a', invoiceNumber: 'INV-0018', status: 'paid', total: 475, datePaid: '2026-04-29', allocatedTotal: 475 },
    ]
    const r = reconcile({ transactions, invoices: paidAndAllocated, expenses: [] })
    const c = r.credits.find((c) => c.txn.uniqueId === '2026042001')!
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

// The real-world failure that motivated the allocation model: a manual invoice
// (INV-26022, Sue Bunce, $650) marked paid BEFORE the bank line was reconciled;
// the bank memo is a bare "Sue Bunce 26022" (no "INV" token) from a payer whose
// account name ("The Swainston T") is not the client; and THREE paid invoices
// total $650 (so unique-amount matching can't disambiguate).
describe('reconcile — INV-26022 scenario (bare number, payer ≠ client, ambiguous amount)', () => {
  const CSV = `Date,Unique Id,Tran Type,Cheque Number,Payee,Memo,Amount
23/05/2026,2026052301,D/C,,D/C FROM The Swainston T,Sue Bunce  26022,650`
  const { transactions } = parseAsbCsv(CSV)

  const threePaid650: ReconInvoice[] = [
    { id: 'x1', invoiceNumber: 'INV-0033', status: 'paid', total: 650, datePaid: '2026-04-25', client: 'H Suzuki' },
    { id: 'x2', invoiceNumber: 'INV-0053', status: 'paid', total: 650, datePaid: '2026-05-01', client: 'A Client' },
    { id: 'x3', invoiceNumber: 'INV-26022', status: 'paid', total: 650, datePaid: '2026-05-24', client: 'Sue Bunce' },
  ]

  it('extracts the bare "26022" as a candidate ref', () => {
    expect(transactions[0].numberRefs).toContain('INV-26022')
    expect(transactions[0].invoiceRefs).toEqual([]) // no "INV" token → no high-confidence ref
  })

  it('reaches INV-26022 via the bare-number ref → allocate_match (payment allocatable to the paid invoice)', () => {
    const r = reconcile({ transactions, invoices: threePaid650, expenses: [] })
    const c = r.credits.find((c) => c.txn.uniqueId === '2026052301')!
    expect(c.status).toBe('allocate_match')
    expect(c.invoice?.invoiceNumber).toBe('INV-26022')
    expect(r.summary.allocationsToRecord).toBe(1)
  })

  it('once INV-26022 is fully allocated, the same line reads as reconciled', () => {
    const allocated = threePaid650.map((i) =>
      i.invoiceNumber === 'INV-26022' ? { ...i, allocatedTotal: 650 } : i,
    )
    const r = reconcile({ transactions, invoices: allocated, expenses: [] })
    const c = r.credits.find((c) => c.txn.uniqueId === '2026052301')!
    expect(c.status).toBe('reconciled')
  })

  it('customer-name match also finds it when the invoice number is absent from the memo', () => {
    const CSV2 = `Date,Unique Id,Tran Type,Cheque Number,Payee,Memo,Amount
23/05/2026,2026052302,D/C,,D/C FROM The Swainston T,Sue Bunce,650`
    const { transactions: t2 } = parseAsbCsv(CSV2)
    // Only ONE $650 invoice is Sue Bunce's, so the name step resolves uniquely.
    const r = reconcile({ transactions: t2, invoices: threePaid650, expenses: [] })
    const c = r.credits[0]
    expect(c.invoice?.invoiceNumber).toBe('INV-26022')
    expect(c.status).toBe('allocate_match')
  })
})
