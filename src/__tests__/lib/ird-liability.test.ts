import {
  liabilityTotalForRun, irdPaymentPeriod, deriveLiabilityStatus, liabilityOutstanding,
} from '@/lib/payroll/ird-liability'

describe('liabilityTotalForRun — Carol golden', () => {
  it('total = PAYE + employee KS + gross employer KS; ESCT within, not added', () => {
    const { total, esct } = liabilityTotalForRun({ paye: 94.5, employeeKs: 21, employerKsGross: 21, employerKsNet: 17.33 })
    expect(total).toBe(136.5)   // NOT 136.5 + esct
    expect(esct).toBe(3.67)
  })
  it('esct is null when net is unknown', () => {
    expect(liabilityTotalForRun({ paye: 94.5, employeeKs: 21, employerKsGross: 21 }).esct).toBeNull()
  })
})

describe('irdPaymentPeriod — small employer, 20th of following month', () => {
  it('July payday → period 2026-07, due 20 Aug', () => {
    expect(irdPaymentPeriod('2026-07-27')).toEqual({
      periodKey: '2026-07', periodStart: '2026-07-01', periodEnd: '2026-07-31', dueDate: '2026-08-20',
    })
  })
  it('December rolls the due date into the next year', () => {
    expect(irdPaymentPeriod('2026-12-14')).toEqual({
      periodKey: '2026-12', periodStart: '2026-12-01', periodEnd: '2026-12-31', dueDate: '2027-01-20',
    })
  })
  it('February end-of-month is correct', () => {
    expect(irdPaymentPeriod('2027-02-10').periodEnd).toBe('2027-02-28')
  })
})

describe('deriveLiabilityStatus', () => {
  const base = { totalPayable: 136.5, amountPaid: 0, dueDate: '2026-08-20', today: '2026-07-28', periodClosed: false }
  it('accruing while the period is open and unpaid', () => {
    expect(deriveLiabilityStatus(base)).toBe('accruing')
  })
  it('due once the period is closed, unpaid, before the due date', () => {
    expect(deriveLiabilityStatus({ ...base, periodClosed: true })).toBe('due')
  })
  it('partially_paid when some but not all is paid, before due', () => {
    expect(deriveLiabilityStatus({ ...base, amountPaid: 100 })).toBe('partially_paid')
  })
  it('paid when settled in full', () => {
    expect(deriveLiabilityStatus({ ...base, amountPaid: 136.5 })).toBe('paid')
  })
  it('overdue when unpaid past the due date', () => {
    expect(deriveLiabilityStatus({ ...base, today: '2026-08-21', periodClosed: true })).toBe('overdue')
  })
  it('adjusted when it carries adjustments and nothing paid yet', () => {
    expect(deriveLiabilityStatus({ ...base, hasAdjustments: true })).toBe('adjusted')
  })
})

describe('liabilityOutstanding', () => {
  it('is payable minus paid, rounded', () => {
    expect(liabilityOutstanding(136.5, 0)).toBe(136.5)
    expect(liabilityOutstanding(136.5, 100)).toBe(36.5)
    expect(liabilityOutstanding(136.5, 136.5)).toBe(0)
  })
})
