import { annualIncomeTax, annualAccLevy, computePaye } from '@/lib/payroll/paye'
import { computePayslip } from '@/lib/payroll/payslip'
import { calculatePayPreview } from '@/lib/nz-paye'

describe('PAYE engine (2026/27 accountant-confirmed rates)', () => {
  it('applies marginal income-tax brackets', () => {
    // $15,600 taxed entirely at 10.5%
    expect(annualIncomeTax(15600)).toBeCloseTo(1638, 2)
    // $26,000 = 15600@10.5% + 10400@17.5%
    expect(annualIncomeTax(26000)).toBeCloseTo(1638 + 10400 * 0.175, 2)
  })

  it('computes weekly PAYE = income tax + ACC earner levy', () => {
    const r = computePaye(500, 'weekly')
    // annual 26000 → income tax 3458 /52 = 66.5; ACC 26000*1.75% /52 = 8.75
    expect(r.incomeTax).toBeCloseTo(66.5, 2)
    expect(r.accLevy).toBeCloseTo(8.75, 2)
    expect(r.paye).toBeCloseTo(75.25, 2)
  })

  it('caps the ACC earner levy at the annual maximum', () => {
    // Well above the $156,641 cap → levy pinned at $2,741.22/yr
    expect(annualAccLevy(200000)).toBeCloseTo(2741.22, 2)
    // Below the cap scales linearly at 1.75%
    expect(annualAccLevy(50000)).toBeCloseTo(875, 2)
  })

  it('annualises correctly per pay period', () => {
    const weekly = computePaye(500, 'weekly')
    const monthly = computePaye(500 * 52 / 12, 'monthly')
    // same annual income → same annual PAYE (allowing rounding)
    expect(weekly.paye * 52).toBeCloseTo(monthly.paye * 12, 0)
  })
})

describe('payslip (inclusive 8% holiday pay)', () => {
  it('gross = hours × rate, holiday pay identified within (8/108)', () => {
    const p = computePayslip({ hours: 20, rate: 25, period: 'weekly' })
    expect(p.gross).toBe(500)
    expect(p.holidayPayComponent).toBeCloseTo(500 * 8 / 108, 2)
    expect(p.kiwiSaver).toBe(0)
    expect(p.net).toBeCloseTo(500 - p.paye, 2)
  })

  it('deducts KiwiSaver when a rate is given', () => {
    const p = computePayslip({ hours: 20, rate: 25, period: 'weekly', kiwiSaverEmployeeRate: 0.03 })
    expect(p.kiwiSaver).toBe(15)
    expect(p.net).toBeCloseTo(500 - p.paye - 15, 2)
  })
})

// Golden values for Carol's real pay. The 2026/27 constants are IRD-confirmed
// (thresholds $15,600/$53,500/$78,100/$180,000; ACC levy 1.75%, cap $156,641).
// Carol's figures divide evenly, so IRD's whole-dollar/cent TRUNCATION gives
// the same result as our round-to-cent — $505.50 is exact either way. A final
// output comparison against IRD's calculator before the first live run should
// still confirm truncation behaviour for non-round grosses. Working shown so
// it's checkable by hand:
//   Gross 20 hrs × $30 = $600/wk → annualised $31,200
//   Income tax = $15,600 × 10.5% ($1,638) + $15,600 × 17.5% ($2,730) = $4,368/yr
//                → /52 = $84.00/wk
//   ACC earner levy = $31,200 × 1.75% = $546/yr → /52 = $10.50/wk
//   PAYE = $94.50/wk;  net = $600 − $94.50 = $505.50/wk (KiwiSaver opted out)
describe('Carol — permanent, $30/hr × 20 hrs, tax code M, KiwiSaver opted out', () => {
  it('canonical PAYE engine: income tax $84.00 + ACC $10.50 = $94.50', () => {
    const r = computePaye(600, 'weekly')
    expect(r.incomeTax).toBeCloseTo(84.0, 2)
    expect(r.accLevy).toBeCloseTo(10.5, 2)
    expect(r.paye).toBeCloseTo(94.5, 2)
  })

  it('active /new pay-run engine: accrued holiday (no 8% on top), nets $505.50', () => {
    // The path a real pay run takes: contractors row with holiday_pay_method
    // 'accrue_leave' → holidayPay 0, gross = hours × rate. IRD truncation.
    const p = calculatePayPreview({
      hoursWorked: 20,
      hourlyRate: 30,
      payFrequency: 'weekly',
      taxCode: 'M',
      kiwisaverEnrolled: false,
      kiwisaverEmployeeRate: 0,
      kiwisaverEmployerRate: 0,
      holidayPayMethod: 'accrue_leave',
    })
    expect(p.grossPay).toBe(600)
    expect(p.holidayPay).toBe(0) // accrued to the leave ledger, not paid on top
    expect(p.paye).toBeCloseTo(94.5, 2)
    expect(p.studentLoan).toBe(0)
    expect(p.employeeKiwisaver).toBe(0)
    expect(p.netPay).toBeCloseTo(505.5, 2)
  })
})
