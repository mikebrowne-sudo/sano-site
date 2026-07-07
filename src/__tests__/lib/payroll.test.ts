import { annualIncomeTax, computePaye } from '@/lib/payroll/paye'
import { computePayslip } from '@/lib/payroll/payslip'

describe('PAYE engine (verify-gated placeholder rates)', () => {
  it('applies marginal income-tax brackets', () => {
    // $15,600 taxed entirely at 10.5%
    expect(annualIncomeTax(15600)).toBeCloseTo(1638, 2)
    // $26,000 = 15600@10.5% + 10400@17.5%
    expect(annualIncomeTax(26000)).toBeCloseTo(1638 + 10400 * 0.175, 2)
  })

  it('computes weekly PAYE = income tax + ACC earner levy', () => {
    const r = computePaye(500, 'weekly')
    // annual 26000 → income tax 3458 /52 = 66.5; ACC 26000*1.6% /52 = 8
    expect(r.incomeTax).toBeCloseTo(66.5, 2)
    expect(r.accLevy).toBeCloseTo(8, 2)
    expect(r.paye).toBeCloseTo(74.5, 2)
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
