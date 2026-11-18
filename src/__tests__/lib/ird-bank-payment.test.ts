import { allocateIrdBankPayment, outstandingLines, type IrdLedgerLine } from '@/lib/payroll/ird-bank-payment'

const L = (liabilityId: string, payday: string, payable = 94.5): IrdLedgerLine => ({ liabilityId, payday, payable })

// Carol's real ledger shape (July line includes the KiwiSaver she had then).
const ledger: IrdLedgerLine[] = [
  L('jul', '2026-07-27', 136.5),
  L('aug', '2026-08-03'), L('aug', '2026-08-03', 0), // mileage-only run: $0
  L('aug', '2026-08-10'), L('aug', '2026-08-17'), L('aug', '2026-08-24'),
  L('sep', '2026-09-07'), L('sep', '2026-09-07'), L('sep', '2026-09-14'), L('sep', '2026-09-28'), L('sep', '2026-09-28'),
  L('oct', '2026-10-05'), L('oct', '2026-10-12'), L('oct', '2026-10-19'), L('oct', '2026-10-26'),
  L('nov', '2026-11-02'), L('nov', '2026-11-09'), L('nov', '2026-11-16'),
]

describe('IRD bank payment → PAYE ledger', () => {
  it('replays the real bank history into the right months', () => {
    const bank: Array<[string, number]> = [
      ['2026-08-04', 136.5], ['2026-08-04', 94.5], ['2026-08-10', 94.5], ['2026-08-18', 94.5], ['2026-08-26', 94.5],
      ['2026-09-08', 189], ['2026-09-15', 94.5], ['2026-10-01', 94.5], ['2026-10-01', 94.5],
      ['2026-10-08', 94.5], ['2026-10-14', 94.5], ['2026-10-19', 94.5], ['2026-10-28', 94.5],
    ]
    const paid: Record<string, number> = {}
    for (const [date, amount] of bank) {
      const a = allocateIrdBankPayment({ lines: ledger, paidByLiability: paid, amount, paymentDate: date })
      expect(a).not.toBeNull()
      for (const x of a!) paid[x.liabilityId] = (paid[x.liabilityId] ?? 0) + x.amount
    }
    expect(paid).toEqual({ jul: 136.5, aug: 378, sep: 472.5, oct: 378 })
  })

  it('leaves a GST payment alone', () => {
    expect(allocateIrdBankPayment({ lines: ledger, paidByLiability: {}, amount: 3422.11, paymentDate: '2026-10-20' })).toBeNull()
  })

  it('never pays a payday that has not happened yet', () => {
    const paid = { jul: 136.5, aug: 378, sep: 472.5, oct: 189 }
    // 19 Oct payment when only 5 + 12 Oct are paid → pays 19 Oct, not later.
    expect(allocateIrdBankPayment({ lines: ledger, paidByLiability: paid, amount: 94.5, paymentDate: '2026-10-19' })).toEqual([{ liabilityId: 'oct', amount: 94.5 }])
    // Two paydays' worth on 19 Oct can't reach the 26 Oct payday.
    expect(allocateIrdBankPayment({ lines: ledger, paidByLiability: paid, amount: 189, paymentDate: '2026-10-19' })).toBeNull()
  })

  it('splits one payment across months when it covers both', () => {
    const paid = { jul: 136.5, aug: 378, sep: 472.5, oct: 283.5 }
    expect(allocateIrdBankPayment({ lines: ledger, paidByLiability: paid, amount: 189, paymentDate: '2026-11-03' }))
      .toEqual([{ liabilityId: 'oct', amount: 94.5 }, { liabilityId: 'nov', amount: 94.5 }])
  })

  it('rejects a part payment', () => {
    expect(allocateIrdBankPayment({ lines: ledger, paidByLiability: {}, amount: 50, paymentDate: '2026-08-04' })).toBeNull()
  })

  it('applies a month’s recorded payments to its oldest paydays first', () => {
    const o = outstandingLines(ledger, { oct: 94.5 }).filter((l) => l.liabilityId === 'oct')
    expect(o.map((l) => l.outstanding)).toEqual([0, 94.5, 94.5, 94.5])
  })
})
