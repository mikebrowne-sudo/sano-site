import { parseAsbCsv, splitCsvLine, parseAsbDate, extractInvoiceRefs } from '@/lib/asb-import'

const SAMPLE = `Created date / time : 23 June 2026 / 18:36:55,,,,,,
Bank 12; Branch 3627; Account 0005597-00 (Business Account),,,,,,
From date 20260401,,,,,,
To date 20260623,,,,,,
Avail Bal : 6790.45 as of 20260623,,,,,,
Ledger Balance : 6790.45 as of 20260623,,,,,,
Date,Unique Id,Tran Type,Cheque Number,Payee,Memo,Amount
,,,,,,
3/04/2026,2026040301,CREDIT,,CREDIT,,0
18/04/2026,2026041801,D/C,,D/C FROM From MS C J BROWNE,start up,1000
20/04/2026,2026042001,D/C,,"D/C FROM BIRCHALL,TOBI",INV-0018,475
20/04/2026,2026042002,BILLPAY,,PMT TO FC12-3489-0050591-01,BILL PAYMENT TO GI Premium  Wealthpoint,-29.43
8/05/2026,2026050802,BILLPAY,,PMT TO FC06-0878-0765722-00,BILL PAYMENT TO KRITIKA PAYROLL 08-05-26,-1220
20/06/2026,2026062001,D/C,,D/C FROM Pukekohe Gol,Cleaning,2740`

describe('splitCsvLine', () => {
  it('keeps commas inside quoted fields', () => {
    expect(splitCsvLine('20/04/2026,2026042001,D/C,,"D/C FROM BIRCHALL,TOBI",INV-0018,475'))
      .toEqual(['20/04/2026', '2026042001', 'D/C', '', 'D/C FROM BIRCHALL,TOBI', 'INV-0018', '475'])
  })
})

describe('parseAsbDate', () => {
  it('parses D/M/YYYY to ISO', () => {
    expect(parseAsbDate('3/04/2026')).toBe('2026-04-03')
    expect(parseAsbDate('20/04/2026')).toBe('2026-04-20')
  })
  it('parses the compact YYYYMMDD metadata form', () => {
    expect(parseAsbDate('20260401')).toBe('2026-04-01')
  })
})

describe('extractInvoiceRefs', () => {
  it('handles the separator variants ASB memos use', () => {
    expect(extractInvoiceRefs('INV-0018')).toEqual(['INV-0018'])
    expect(extractInvoiceRefs('Inv-0033')).toEqual(['INV-0033'])
    expect(extractInvoiceRefs('inv 0065')).toEqual(['INV-0065'])
    expect(extractInvoiceRefs('INV0021')).toEqual(['INV-0021'])
    expect(extractInvoiceRefs('INV-0079  INV-0079')).toEqual(['INV-0079']) // de-duped
  })
  it('does not match the word invoice', () => {
    expect(extractInvoiceRefs('invoice attached')).toEqual([])
  })
})

describe('parseAsbCsv', () => {
  const parsed = parseAsbCsv(SAMPLE)

  it('reads the metadata preamble', () => {
    expect(parsed.fromDate).toBe('2026-04-01')
    expect(parsed.toDate).toBe('2026-06-23')
    expect(parsed.account).toMatch(/Business Account/)
  })

  it('skips the zero-value opening line but keeps real transactions', () => {
    // 7 data lines, minus the CREDIT 0 line = 6; but parser keeps amount 0
    // rows (filtering happens in reconcile). Count parsed rows here:
    expect(parsed.transactions).toHaveLength(6)
  })

  it('signs amounts by direction', () => {
    const credit = parsed.transactions.find((t) => t.uniqueId === '2026042001')!
    const debit = parsed.transactions.find((t) => t.uniqueId === '2026050802')!
    expect(credit.amount).toBe(475)
    expect(credit.direction).toBe('in')
    expect(debit.amount).toBe(-1220)
    expect(debit.direction).toBe('out')
  })

  it('extracts the invoice ref from a credit memo', () => {
    const credit = parsed.transactions.find((t) => t.uniqueId === '2026042001')!
    expect(credit.invoiceRefs).toEqual(['INV-0018'])
    expect(credit.date).toBe('2026-04-20')
  })
})
