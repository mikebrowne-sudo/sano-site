import { esctRate, computeEsct, ESCT_RATES } from '@/lib/payroll/esct'
import { computePayslip } from '@/lib/payroll/payslip'

describe('ESCT rate bands (2026/27)', () => {
  it('picks the flat rate for the band the threshold amount falls into', () => {
    expect(esctRate(18720)).toBe(0.105) // top of band 1
    expect(esctRate(18721)).toBe(0.175)
    expect(esctRate(64200)).toBe(0.175)
    expect(esctRate(64201)).toBe(0.30)
    expect(esctRate(93720)).toBe(0.30)
    expect(esctRate(93721)).toBe(0.33)
    expect(esctRate(216000)).toBe(0.33)
    expect(esctRate(216001)).toBe(0.39)
  })

  it('splits an employer contribution into ESCT + net (ESCT withheld, not added)', () => {
    const { rate, esct, netContribution } = computeEsct(1000, 50000)
    expect(rate).toBe(0.175)
    expect(esct).toBeCloseTo(175, 2)
    expect(netContribution).toBeCloseTo(825, 2)
  })

  it('calculates ESCT on the whole-dollar portion — cents disregarded in the base only', () => {
    // $20.99 contribution → ESCT on $20: 20 × 17.5% = 3.50;
    // the full $20.99 is retained for net: 20.99 − 3.50 = 17.49
    const r = computeEsct(20.99, 26910)
    expect(r.esct).toBeCloseTo(3.5, 2)
    expect(r.netContribution).toBeCloseTo(17.49, 2)
  })
})

describe('payslip employer KiwiSaver + ESCT', () => {
  it('applies 3.5% employer contribution and withholds ESCT (annualised threshold)', () => {
    // gross 580 → employer KS 20.30; threshold ≈ (580+20.30)*52 = 31,216 → 17.5% band
    // ESCT on whole-dollar base $20: 20 × 17.5% = 3.50; net = 20.30 − 3.50 = 16.80
    const p = computePayslip({ hours: 20, rate: 29, period: 'weekly', employerKiwiSaverRate: 0.035 })
    expect(p.employerKiwiSaver).toBeCloseTo(20.3, 2)
    expect(p.esctRate).toBe(0.175)
    expect(p.esct).toBeCloseTo(3.5, 2)
    expect(p.employerKiwiSaverNet).toBeCloseTo(16.8, 2)
    // ESCT does not touch the employee's take-home
    expect(p.net).toBeCloseTo(p.gross - p.paye - p.kiwiSaver, 2)
  })

  it('honours an explicit ESCT threshold override', () => {
    const p = computePayslip({ hours: 20, rate: 25, period: 'weekly', employerKiwiSaverRate: 0.035, esctThresholdAmount: 200000 })
    expect(p.esctRate).toBe(0.33)
  })

  it('is zero when the employee is not a KiwiSaver member', () => {
    const p = computePayslip({ hours: 20, rate: 25, period: 'weekly', employerKiwiSaverRate: 0 })
    expect(p.employerKiwiSaver).toBe(0)
    expect(p.esct).toBe(0)
    expect(p.employerKiwiSaverNet).toBe(0)
  })

  it('exposes the 2026/27 tax year on the constants', () => {
    expect(ESCT_RATES.taxYear).toBe('2026/27')
  })
})
