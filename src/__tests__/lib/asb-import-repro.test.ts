import { parseAsbCsv, parseAsbDate } from '@/lib/asb-import'
import { reconcile } from '@/lib/bank-reconcile'

// New ASB export format: YYYY/MM/DD dates, fully-quoted fields, no trailing
// commas on the metadata lines.
const NEW = `Created date / time : 24 June 2026 / 21:48:21
Bank 12; Branch 3627; Account 0005597-00 (Business Account)
From date 20260401
To date 20260624
Avail Bal : 6970.45 as of 20260624
Ledger Balance : 6970.45 as of 20260624
Date,Unique Id,Tran Type,Cheque Number,Payee,Memo,Amount

2026/04/03,2026040301,CREDIT,,"CREDIT","",0.00
2026/04/20,2026042001,D/C,,"D/C FROM BIRCHALL,TOBI","INV-0018",475.00
2026/05/22,2026052201,BILLPAY,,"PMT TO FC12-3248-0169823-37","BILL PAYMENT TO Bambi 200526  INV-9163155",-140.00
2026/06/24,2026062401,TFR IN,,"WENDELL PROPERTY MAN","Wendell PM 09-8492588 Remittance",180.00`

describe('repro: new ASB date format', () => {
  it('parses YYYY/MM/DD', () => {
    expect(parseAsbDate('2026/04/03')).toBe('2026-04-03')
    expect(parseAsbDate('2026/04/20')).toBe('2026-04-20')
  })

  it('parses the new export without throwing and dates resolve', () => {
    const parsed = parseAsbCsv(NEW)
    expect(parsed.transactions.length).toBe(4)
    const credit = parsed.transactions.find((t) => t.uniqueId === '2026042001')!
    expect(credit.date).toBe('2026-04-20')
    expect(credit.invoiceRefs).toEqual(['INV-0018'])
    // does not throw on the 7-digit INV-9163155 memo
    const bambi = parsed.transactions.find((t) => t.uniqueId === '2026052201')!
    expect(bambi.amount).toBe(-140)
  })

  it('reconcile does not throw on the parsed result', () => {
    const parsed = parseAsbCsv(NEW)
    expect(() => reconcile({ transactions: parsed.transactions, invoices: [], expenses: [] })).not.toThrow()
  })
})
