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
})

describe('payslip employer KiwiSaver + ESCT', () => {
  it('applies 3.5% employer contribution and withholds ESCT (annualised threshold)', () => {
    const p = computePayslip({ hours: 20, rate: 25, period: 'weekly', employerKiwiSaverRate: 0.035 })
    // gross 500 → employer KS 17.50; threshold ≈ (500+17.50)*52 = 26,910 → 17.5% band
    expect(p.employerKiwiSaver).toBeCloseTo(17.5, 2)
    expect(p.esctRate).toBe(0.175)
    expect(p.esct).toBeCloseTo(3.06, 2)
    expect(p.employerKiwiSaverNet).toBeCloseTo(14.44, 2)
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
