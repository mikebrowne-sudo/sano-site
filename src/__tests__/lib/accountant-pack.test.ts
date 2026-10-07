import { ageBucket, buildAccountantPack, expenseGst, type AccountantPackRaw, type RawInvoice } from '@/app/portal/finance/_lib/accountant-pack'
import { accountantPackPeriods, financialYear, nzToday, previousMonth, resolveAccountantPackPeriod } from '@/app/portal/finance/_lib/periods'

const FROM = '2026-04-01'
const TO = '2026-09-30'

function inv(p: Partial<RawInvoice>): RawInvoice {
  return {
    invoice_number: 'INV-1', status: 'sent', base_price: 115, discount: 0, gst_included: true,
    date_issued: '2026-05-01', due_date: '2026-05-21', date_paid: null, stripe_payment_intent_id: null,
    client_name: 'Client', invoice_items: [], ...p,
  }
}

function raw(p: Partial<AccountantPackRaw> = {}): AccountantPackRaw {
  return {
    invoices: [], expenses: [], remittanceItems: [], remittanceAllocated: {}, payLines: [], unpaidPayRuns: [],
    bank: [], bankLatestDate: TO, mileage: [], contractorPayables: [], ...p,
  }
}

describe('accountant pack — sales + GST', () => {
  it('splits GST-inclusive and GST-exclusive invoices like the invoice PDF', () => {
    const pack = buildAccountantPack(raw({
      invoices: [
        inv({ invoice_number: 'A', base_price: 115, gst_included: true }),
        inv({ invoice_number: 'B', base_price: 100, gst_included: false }),
      ],
    }), FROM, TO)
    const a = pack.sales.find((r) => r.invoice === 'A')!
    const b = pack.sales.find((r) => r.invoice === 'B')!
    expect([a.exGst, a.gst, a.incl]).toEqual([100, 15, 115])
    expect([b.exGst, b.gst, b.incl]).toEqual([100, 15, 115])
    expect(pack.totals.salesInclGst).toBe(230)
  })

  it('excludes drafts and cancelled invoices from sales', () => {
    const pack = buildAccountantPack(raw({
      invoices: [inv({ status: 'draft' }), inv({ status: 'cancelled' }), inv({ status: 'sent' })],
    }), FROM, TO)
    expect(pack.sales).toHaveLength(1)
  })

  it('P&L income is the GST-inclusive amount received', () => {
    const pack = buildAccountantPack(raw({
      invoices: [inv({ status: 'paid', base_price: 100, gst_included: false, date_paid: '2026-05-10' })],
    }), FROM, TO)
    expect(pack.pl.income).toBe(115)
    expect(pack.totals.receivedInclGst).toBe(115)
  })
})

describe('accountant pack — receivables at period end', () => {
  it('counts invoices unpaid at the period end, even if paid afterwards', () => {
    const pack = buildAccountantPack(raw({
      invoices: [
        inv({ invoice_number: 'OPEN', status: 'sent', due_date: '2026-09-20' }),
        inv({ invoice_number: 'PAID-LATER', status: 'paid', date_paid: '2026-10-03', due_date: '2026-08-15' }),
        inv({ invoice_number: 'PAID-IN', status: 'paid', date_paid: '2026-09-01' }),
        inv({ invoice_number: 'AFTER', status: 'sent', date_issued: '2026-10-02' }),
      ],
    }), FROM, TO)
    expect(pack.receivables.map((r) => r.invoice).sort()).toEqual(['OPEN', 'PAID-LATER'])
    expect(pack.receivables.find((r) => r.invoice === 'PAID-LATER')!.age).toBe('31–60 days')
  })

  it('ages by days past due at the as-at date', () => {
    expect(ageBucket('2026-09-30', '2026-09-30')).toBe('Current')
    expect(ageBucket('2026-09-29', '2026-09-30')).toBe('1–30 days')
    expect(ageBucket('2026-06-01', '2026-09-30')).toBe('90+ days')
    expect(ageBucket(null, '2026-09-30')).toBe('No due date')
  })
})

describe('accountant pack — expenses + contractors', () => {
  it('claims 3/23 GST only on GST-inclusive, GST-eligible categories', () => {
    expect(expenseGst({ amount: 115, category: 'insurance', gst_inclusive: true })).toBe(15)
    expect(expenseGst({ amount: 115, category: 'insurance', gst_inclusive: false })).toBe(0)
    expect(expenseGst({ amount: 115, category: 'wages_payroll', gst_inclusive: true })).toBe(0)
    expect(expenseGst({ amount: 115, category: 'ird_payment', gst_inclusive: true })).toBe(0)
  })

  it('marks a contractor expense duplicating a remittance as excluded with no GST', () => {
    const pack = buildAccountantPack(raw({
      expenses: [{ expense_date: '2026-07-16', amount: 1172.5, category: 'contractor_payment', vendor: 'VMK', description: null, payment_reference: null, gst_inclusive: true, receipt_path: null }],
      remittanceItems: [{
        remittance_id: 'r1', remittance_number: 'RA-0007', payment_date: '2026-07-15', reference: 'X', contractor_name: 'VMK',
        contractor_gst_number: '123', job_number: 'J1', label: null, amount: 1172.5, wht_amount: null,
        ci_gst_status: 'applied', ci_gst_amount: 152.93, ci_amount: 1172.5,
      }],
      remittanceAllocated: { r1: 1172.5 },
    }), FROM, TO)
    expect(pack.expenses[0].treatment).toBe('Excluded — duplicate of a remittance')
    expect(pack.expenses[0].gst).toBe(0)
    expect(pack.pl.costOfSales).toBe(1172.5)
    expect(pack.contractorPayments[0].gst).toBe(152.93)
    expect(pack.gst.find((g) => g.month === '2026-07')!.purchasesGstContractors).toBe(152.93)
    expect(pack.gst.find((g) => g.month === '2026-07')!.purchasesGstExpenses).toBe(0)
  })

  it('never guesses contractor GST: not-assessed is $0 and flagged', () => {
    const pack = buildAccountantPack(raw({
      remittanceItems: [{
        remittance_id: 'r1', remittance_number: 'RA-1', payment_date: '2026-08-01', reference: null, contractor_name: 'A',
        contractor_gst_number: null, job_number: null, label: null, amount: 500, wht_amount: null,
        ci_gst_status: 'not_assessed', ci_gst_amount: null, ci_amount: 500,
      }],
    }), FROM, TO)
    expect(pack.contractorPayments[0].gst).toBe(0)
    expect(pack.attention.some((a) => a.issue.includes('GST not assessed') && a.count === 1)).toBe(true)
    expect(pack.attention.some((a) => a.issue.includes('no bank payment linked'))).toBe(true)
  })
})

describe('accountant pack — payroll, bank, attention', () => {
  it('includes only PAID employee pay lines, by pay date', () => {
    const line = {
      pay_run_id: 'p', pay_date: '2026-08-04', period_start: '2026-07-28', period_end: '2026-08-03', payday_filing_status: null,
      employee: 'Carol', hours_worked: 20, gross_pay: 600, holiday_pay: 0, paye: 85, student_loan: 0,
      kiwisaver_employee: 0, kiwisaver_employer: 0, esct: 0, net_pay: 505.5, mileage_reimbursement: 0,
    }
    const pack = buildAccountantPack(raw({
      payLines: [{ ...line, run_status: 'paid' }, { ...line, run_status: 'draft' }],
    }), FROM, TO)
    expect(pack.payroll).toHaveLength(1)
    expect(pack.payroll[0].net).toBe(505.5)
  })

  it('flags unreconciled bank lines and an incomplete bank import', () => {
    const pack = buildAccountantPack(raw({
      bank: [
        { id: '1', txn_date: '2026-09-01', account: null, tran_type: null, payee: 'X', memo: null, amount: -50, direction: 'out', cleared: false },
        { id: '2', txn_date: '2026-09-02', account: null, tran_type: null, payee: 'Y', memo: null, amount: 100, direction: 'in', cleared: true },
      ],
      bankLatestDate: '2026-09-02',
    }), FROM, TO)
    const out = pack.attention.find((a) => a.issue === 'Money out not reconciled')!
    expect(out.count).toBe(1)
    expect(out.amount).toBe(-50)
    expect(pack.attention.some((a) => a.issue.startsWith('Bank statements only imported up to 2026-09-02'))).toBe(true)
    expect(pack.attention.some((a) => a.issue === 'Money in not reconciled')).toBe(false)
  })

  it('builds one GST row per month in the period', () => {
    const pack = buildAccountantPack(raw(), FROM, TO)
    expect(pack.gst.map((g) => g.month)).toEqual(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'])
  })
})

describe('accountant pack periods', () => {
  it('NZ financial year runs 1 April – 31 March', () => {
    expect(financialYear('2026-10-07')).toMatchObject({ from: '2026-04-01', to: '2027-03-31' })
    expect(financialYear('2027-03-31')).toMatchObject({ from: '2026-04-01', to: '2027-03-31' })
    expect(financialYear('2026-03-31')).toMatchObject({ from: '2025-04-01', to: '2026-03-31' })
  })

  it('previous month handles January', () => {
    expect(previousMonth('2027-01-15')).toMatchObject({ from: '2026-12-01', to: '2026-12-31' })
    expect(previousMonth('2026-03-02')).toMatchObject({ from: '2026-02-01', to: '2026-02-28' })
  })

  it('presets: this FY, last FY, last month; custom dates win when valid', () => {
    const p = accountantPackPeriods('2026-10-07')
    expect(p.map((x) => x.key)).toEqual(['fy_current', 'fy_previous', 'prev_month'])
    expect(p[1]).toMatchObject({ from: '2025-04-01', to: '2026-03-31' })
    expect(resolveAccountantPackPeriod('2026-10-07', null, '2026-04-01', '2026-05-31')).toEqual({ key: 'custom', from: '2026-04-01', to: '2026-05-31' })
    expect(resolveAccountantPackPeriod('2026-10-07', null, '2026-06-01', '2026-05-31').key).toBe('fy_current') // reversed → ignored
    expect(resolveAccountantPackPeriod('2026-10-07', 'bogus').key).toBe('fy_current')
  })

  it('nzToday uses Auckland time, not UTC', () => {
    // 2026-10-06 12:30 UTC = 2026-10-07 01:30 NZDT
    expect(nzToday(new Date('2026-10-06T12:30:00Z'))).toBe('2026-10-07')
  })
})

describe('accountant pack — open period', () => {
  it('ages receivables as at today when the period has not finished', () => {
    const pack = buildAccountantPack(raw({
      invoices: [inv({ invoice_number: 'NOT-YET-DUE', status: 'sent', date_issued: '2026-10-01', due_date: '2026-10-20' })],
      bankLatestDate: '2026-10-05',
    }), '2026-04-01', '2027-03-31', '2026-10-07')
    expect(pack.asAt).toBe('2026-10-07')
    expect(pack.receivables[0].age).toBe('Current')
    expect(pack.attention.some((a) => a.issue.startsWith('Overdue'))).toBe(false)
    expect(pack.attention.some((a) => a.issue.startsWith('Bank statements'))).toBe(false) // within a week
  })
})
